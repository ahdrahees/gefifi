<!-- gefifi-2/src/frontend/src/routes/(app)/customer/create-request/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import { onMount } from 'svelte';

	let workRequestData = $state({
		title: '',
		description: '',
		images: [] as string[], // Store paths of uploaded images after successful upload
		location: '',
		expectedCost: undefined as number | undefined,
		timeline: '',
		materialsSuggested: '',
		category: 'General Construction' // Default category
	});

	let imageFiles: FileList | null = null;
	let imagePreviews: string[] = $state([]);
	let formMessage: { type: 'success' | 'error'; text: string } | null = $state(null);
	let isLoading = $state(false);
	let isUploadingImages = false;
	let fileInputKey = $state(Date.now()); // Used to reset file input

	let token: string | null = null;
	authStore.subscribe((auth) => {
		token = auth.token;
	});

	// Ensure token is available before allowing interaction, or redirect if not logged in
	// This page should be under an auth guard already via layout, but good practice
	onMount(() => {
		if (!token) {
			// User might have landed here directly or token expired without layout catching it.
			// The root layout should handle redirects, but as a fallback:
			// goto('/auth/login', { replaceState: true });
			// For now, we assume layout handles it, but API calls will fail if no token.
			console.warn('Create Work Request page: Auth token not available on mount.');
		}
	});

	// Categories for construction work
	const workCategories = [
		'General Construction',
		'Renovation',
		'Repair',
		'Plumbing',
		'Electrical',
		'Painting',
		'Masonry',
		'Carpentry',
		'Interior Design',
		'Landscaping',
		'Other'
	];

	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		formMessage = null; // Clear previous messages related to image selection
		if (input.files) {
			if (input.files.length > 3) {
				formMessage = { type: 'error', text: 'You can upload a maximum of 3 images.' };
				// Reset file input by changing its key, which forces Svelte to re-render it
				fileInputKey = Date.now();
				imageFiles = null;
				imagePreviews = [];
				return;
			}

			imageFiles = input.files;
			imagePreviews = []; // Reset previews

			if (imageFiles && imageFiles.length > 0) {
				for (let i = 0; i < imageFiles.length; i++) {
					const file = imageFiles[i];
					// Basic file type check (can be more robust)
					if (!file.type.startsWith('image/')) {
						formMessage = { type: 'error', text: `File "${file.name}" is not a valid image type.` };
						fileInputKey = Date.now();
						imageFiles = null;
						imagePreviews = [];
						return;
					}
					const reader = new FileReader();
					reader.onload = (e) => {
						if (e.target?.result) {
							imagePreviews = [...imagePreviews, e.target.result as string];
						}
					};
					reader.readAsDataURL(file);
				}
			}
		}
	}

	async function uploadImages(): Promise<string[]> {
		if (!imageFiles || imageFiles.length === 0) {
			return [];
		}
		if (!token) {
			throw new Error('Authentication token is missing. Cannot upload images.');
		}

		isUploadingImages = true;
		const uploadedImagePaths: string[] = [];
		const uploadPromises: Promise<void>[] = [];

		for (let i = 0; i < imageFiles.length; i++) {
			const file: File = imageFiles[i];
			const formData = new FormData();
			formData.append('file', file);

			uploadPromises.push(
				fetch(`${API_BASE_URL}/api/upload`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`
						// 'Content-Type': 'multipart/form-data' is set automatically by browser for FormData
					},
					body: formData
				})
					.then(async (response) => {
						if (!response.ok) {
							const errorData = await response.json().catch(() => ({
								message: 'Failed to upload image with status: ' + response.statusText
							}));
							throw new Error(errorData.message || `Failed to upload ${file.name}`);
						}
						return response.json();
					})
					.then((data) => {
						if (data.filePath) {
							uploadedImagePaths.push(data.filePath);
						} else {
							throw new Error(`Image ${file.name} uploaded but no filePath received.`);
						}
					})
			);
		}

		await Promise.all(uploadPromises);
		isUploadingImages = false;
		return uploadedImagePaths;
	}

	async function handleSubmit() {
		isLoading = true;
		formMessage = null;

		if (!token) {
			formMessage = {
				type: 'error',
				text: 'You are not logged in. Please log in to create a request.'
			};
			isLoading = false;
			return;
		}

		if (
			!workRequestData.title.trim() ||
			!workRequestData.description.trim() ||
			!workRequestData.location.trim()
		) {
			formMessage = { type: 'error', text: 'Title, Description, and Location are required.' };
			isLoading = false;
			return;
		}
		if (
			workRequestData.expectedCost !== undefined &&
			(isNaN(workRequestData.expectedCost) || workRequestData.expectedCost < 0)
		) {
			formMessage = {
				type: 'error',
				text: 'Expected cost must be a valid positive number if provided.'
			};
			isLoading = false;
			return;
		}

		const finalWorkRequestData = { ...workRequestData };

		try {
			if (imageFiles && imageFiles.length > 0) {
				formMessage = { type: 'success', text: 'Uploading images...' }; // Temporary message
				const uploadedPaths = await uploadImages();
				finalWorkRequestData.images = uploadedPaths;
			} else {
				finalWorkRequestData.images = [];
			}

			formMessage = { type: 'success', text: 'Submitting your work request...' }; // Temporary message

			const response = await fetch(`${API_BASE_URL}/api/work-requests`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(finalWorkRequestData)
			});

			if (!response.ok) {
				const errorResult = await response.json().catch(() => null);
				throw new Error(errorResult?.message || 'Failed to create work request. Please try again.');
			}

			formMessage = {
				type: 'success',
				text: 'Work request created successfully! Redirecting to home...'
			};

			// Reset form fields to initial state after successful submission and before redirect
			workRequestData = {
				title: '',
				description: '',
				images: [],
				location: '',
				expectedCost: undefined,
				timeline: '',
				materialsSuggested: '',
				category: 'General Construction'
			};
			imageFiles = null;
			imagePreviews = [];
			fileInputKey = Date.now(); // Reset file input to clear selection

			setTimeout(() => {
				goto('/home');
			}, 1000); // 1 seconds delay to show message
		} catch (error: unknown) {
			console.error('Failed to create work request:', error);
			formMessage = {
				type: 'error',
				text:
					error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
			};
		} finally {
			isLoading = false;
			isUploadingImages = false;
		}
	}
</script>

<div class="mx-auto max-w-3xl space-y-8">
	<h1 class="text-3xl font-bold text-emerald-400">Create New Work Request</h1>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-6 rounded-xl bg-slate-700/50 p-6 shadow-2xl sm:p-8"
	>
		{#if formMessage}
			<div
				class="rounded-md p-4 text-sm {formMessage.type === 'success'
					? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
					: 'border border-red-500/50 bg-red-500/20 text-red-300'}"
				role="alert"
			>
				{formMessage.text}
			</div>
		{/if}

		<div>
			<label for="title" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Title / Brief Summary of Work <span class="text-red-400">*</span></label
			>
			<input
				type="text"
				id="title"
				bind:value={workRequestData.title}
				required
				class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
				placeholder="e.g., Bathroom Renovation, Compound Wall Construction"
			/>
		</div>

		<div>
			<label for="category" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Work Category</label
			>
			<select
				id="category"
				bind:value={workRequestData.category}
				class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
			>
				{#each workCategories as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="description" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Detailed Description of Work <span class="text-red-400">*</span></label
			>
			<textarea
				id="description"
				bind:value={workRequestData.description}
				required
				rows="5"
				class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
				placeholder="Provide detailed information: dimensions, current state, desired outcome, specific requirements, etc."
			></textarea>
		</div>

		<div>
			<label for="images" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Upload Images (Max 3, Optional)</label
			>
			{#key fileInputKey}
				<input
					type="file"
					id="images"
					multiple
					accept="image/png, image/jpeg, image/gif, image/webp"
					onchange={handleImageChange}
					class="w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-emerald-600"
				/>
			{/key}
			{#if imagePreviews.length > 0}
				<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each imagePreviews as previewUrl, i (i)}
						<div class="relative aspect-square">
							<img
								src={previewUrl}
								alt="Preview {i + 1}"
								class="h-full w-full rounded-md object-cover shadow-md"
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div>
			<label for="location" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Site Location / Address <span class="text-red-400">*</span></label
			>
			<input
				type="text"
				id="location"
				bind:value={workRequestData.location}
				required
				class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
				placeholder="Full address or specific area of the construction site"
			/>
		</div>

		<div class="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
			<div>
				<label for="expectedCost" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Expected Budget (₹, Optional)</label
				>
				<input
					type="number"
					id="expectedCost"
					bind:value={workRequestData.expectedCost}
					min="0"
					class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
					placeholder="e.g., 50000"
				/>
			</div>
			<div>
				<label for="timeline" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Expected Timeline (Optional)</label
				>
				<input
					type="text"
					id="timeline"
					bind:value={workRequestData.timeline}
					class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
					placeholder="e.g., 2 weeks, Within 1 month"
				/>
			</div>
		</div>

		<div>
			<label for="materialsSuggested" class="mb-1.5 block text-sm font-medium text-sky-300"
				>Preferred Materials (Optional)</label
			>
			<textarea
				id="materialsSuggested"
				bind:value={workRequestData.materialsSuggested}
				rows="3"
				class="w-full rounded-lg border border-slate-500 bg-slate-600/70 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
				placeholder="e.g., Specific brands, types of tiles, wood, eco-friendly options, etc."
			></textarea>
		</div>

		<div class="border-t border-slate-600 pt-4">
			<button
				type="submit"
				disabled={isLoading}
				class="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-8 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-700 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if isLoading}
					<svg
						class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Submitting Request...
				{:else}
					Submit Work Request
				{/if}
			</button>
		</div>
	</form>
</div>
