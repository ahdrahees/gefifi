<!-- src/frontend/src/lib/components/forms/EditWorkRequestForm.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';
	import { authStore } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import type { WorkRequest } from '$lib/types';

	export let workRequest: WorkRequest;

	const dispatch = createEventDispatcher();

	// Form data
	let formData = {
		title: workRequest.title,
		description: workRequest.description,
		location: workRequest.location,
		category: workRequest.category || 'General',
		expectedCost: workRequest.expectedCost || '',
		timeline: workRequest.timeline || '',
		materialsSuggested: workRequest.materialsSuggested || '',
		images: [...(workRequest.images || [])]
	};

	// Image upload handling (same as create form)
	let imageFiles: FileList | null = null;
	let imagePreviews: string[] = [];
	let fileInputKey = Date.now();
	let isUploadingImages = false;

	// Form state
	let isSubmitting = false;
	let errors: Record<string, string> = {};

	// Categories for work requests
	const categories = [
		'General',
		'Construction',
		'Renovation',
		'Plumbing',
		'Electrical',
		'Painting',
		'Flooring',
		'Roofing',
		'HVAC',
		'Landscaping',
		'Interior Design',
		'Carpentry',
		'Masonry',
		'Other'
	];

	function validateForm() {
		errors = {};

		if (!formData.title.trim()) {
			errors.title = 'Title is required';
		}

		if (!formData.description.trim()) {
			errors.description = 'Description is required';
		}

		if (!formData.location.trim()) {
			errors.location = 'Location is required';
		}

		if (formData.expectedCost && isNaN(Number(formData.expectedCost))) {
			errors.expectedCost = 'Expected cost must be a valid number';
		}

		// Check total image count (existing + new)
		const totalImages = formData.images.length + (imageFiles?.length || 0);
		if (totalImages > 5) {
			errors.images = `Too many images. Maximum 5 images allowed (you have ${formData.images.length} existing + ${imageFiles?.length || 0} new = ${totalImages} total).`;
		}

		return Object.keys(errors).length === 0;
	}

	// Image handling functions (same as create form)
	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			if (input.files.length > 5) {
				errors.images = 'You can upload a maximum of 5 images.';
				fileInputKey = Date.now();
				imageFiles = null;
				imagePreviews = [];
				return;
			}

			imageFiles = input.files;
			imagePreviews = [];
			errors.images = '';

			if (imageFiles && imageFiles.length > 0) {
				for (let i = 0; i < imageFiles.length; i++) {
					const file = imageFiles[i];
					if (!file.type.startsWith('image/')) {
						errors.images = `File "${file.name}" is not a valid image type.`;
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

		const currentAuth = get(authStore);
		const token = currentAuth.token;

		if (!token) {
			throw new Error('Authentication token is missing. Cannot upload images.');
		}

		isUploadingImages = true;
		const uploadedImagePaths: string[] = [];
		const uploadPromises: Promise<void>[] = [];

		for (let i = 0; i < imageFiles.length; i++) {
			const file = imageFiles[i];
			const formData = new FormData();
			formData.append('file', file);

			uploadPromises.push(
				fetch(`${API_BASE_URL}/api/upload`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`
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
		if (!validateForm()) return;

		isSubmitting = true;

		try {
			// Upload new images if any
			let newImagePaths: string[] = [];
			if (imageFiles && imageFiles.length > 0) {
				try {
					newImagePaths = await uploadImages();
				} catch (error: any) {
					errors.images = error.message || 'Failed to upload images.';
					isSubmitting = false;
					return;
				}
			}

			const updatedRequest = {
				...formData,
				expectedCost: formData.expectedCost ? Number(formData.expectedCost) : undefined,
				images: [...formData.images, ...newImagePaths]
			};

			dispatch('save', updatedRequest);
		} catch (error) {
			console.error('Form submission error:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function removeExistingImage(index: number) {
		formData.images = formData.images.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-6">
	<!-- Basic Information -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-lg bg-sky-500/20 p-2">
				<svg class="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-sky-300">Basic Information</h2>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Title -->
			<div class="lg:col-span-2">
				<label for="title" class="mb-2 block text-sm font-medium text-slate-300">
					Project Title *
				</label>
				<input
					id="title"
					type="text"
					bind:value={formData.title}
					placeholder="Enter a clear, descriptive title for your project"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.title
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				/>
				{#if errors.title}
					<p class="mt-1 text-sm text-red-400">{errors.title}</p>
				{/if}
			</div>

			<!-- Location -->
			<div>
				<label for="location" class="mb-2 block text-sm font-medium text-slate-300">
					Project Location *
				</label>
				<input
					id="location"
					type="text"
					bind:value={formData.location}
					placeholder="City, State or full address"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.location
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				/>
				{#if errors.location}
					<p class="mt-1 text-sm text-red-400">{errors.location}</p>
				{/if}
			</div>

			<!-- Category -->
			<div>
				<label for="category" class="mb-2 block text-sm font-medium text-slate-300">
					Project Category
				</label>
				<select
					id="category"
					bind:value={formData.category}
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				>
					{#each categories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>

			<!-- Expected Cost -->
			<div>
				<label for="expectedCost" class="mb-2 block text-sm font-medium text-slate-300">
					Expected Budget (₹)
				</label>
				<input
					id="expectedCost"
					type="number"
					bind:value={formData.expectedCost}
					placeholder="Enter your budget estimate"
					min="0"
					step="1000"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.expectedCost
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				/>
				{#if errors.expectedCost}
					<p class="mt-1 text-sm text-red-400">{errors.expectedCost}</p>
				{/if}
			</div>

			<!-- Timeline -->
			<div>
				<label for="timeline" class="mb-2 block text-sm font-medium text-slate-300">
					Expected Timeline
				</label>
				<input
					id="timeline"
					type="text"
					bind:value={formData.timeline}
					placeholder="e.g., 2-3 weeks, 1 month"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				/>
			</div>
		</div>
	</section>

	<!-- Project Description -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-lg bg-emerald-500/20 p-2">
				<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-emerald-300">Project Description</h2>
		</div>

		<div class="space-y-6">
			<!-- Description -->
			<div>
				<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
					Detailed Description *
				</label>
				<textarea
					id="description"
					bind:value={formData.description}
					placeholder="Provide a detailed description of your project requirements, specifications, and any special considerations..."
					rows="6"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.description
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				></textarea>
				{#if errors.description}
					<p class="mt-1 text-sm text-red-400">{errors.description}</p>
				{/if}
			</div>

			<!-- Materials Suggested -->
			<div>
				<label for="materialsSuggested" class="mb-2 block text-sm font-medium text-slate-300">
					Materials or Specifications
				</label>
				<textarea
					id="materialsSuggested"
					bind:value={formData.materialsSuggested}
					placeholder="List any specific materials, brands, or specifications you prefer..."
					rows="4"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				></textarea>
			</div>
		</div>
	</section>

	<!-- Project Images -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-lg bg-purple-500/20 p-2">
				<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-purple-300">Project Images</h2>
		</div>

		<!-- Current Images -->
		{#if formData.images.length > 0}
			<div class="mb-6">
				<h3 class="mb-3 text-sm font-medium text-slate-300">Current Images</h3>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each formData.images as imageUrl, index}
						<div class="group relative overflow-hidden rounded-lg bg-slate-700/50">
							<img
								src={imageUrl}
								alt="Project image {index + 1}"
								class="h-32 w-full object-cover"
								loading="lazy"
							/>
							<button
								type="button"
								on:click={() => removeExistingImage(index)}
								class="absolute top-2 right-2 rounded-full bg-red-500/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
								aria-label="Remove image"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Upload New Images -->
		<div>
			<h3 class="mb-3 text-sm font-medium text-slate-300">Add More Images</h3>
			{#key fileInputKey}
				<input
					type="file"
					id="new-images"
					multiple
					accept="image/png, image/jpeg, image/gif, image/webp"
					on:change={handleImageChange}
					class="w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-emerald-600"
				/>
			{/key}
			{#if imagePreviews.length > 0}
				<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each imagePreviews as previewUrl, i}
						<div class="relative aspect-square">
							<img
								src={previewUrl}
								alt="New image preview {i + 1}"
								class="h-full w-full rounded-md object-cover shadow-md"
							/>
							<div
								class="absolute top-2 left-2 rounded bg-emerald-500/80 px-2 py-1 text-xs text-white"
							>
								New
							</div>
						</div>
					{/each}
				</div>
			{/if}
			{#if errors.images}
				<p class="mt-2 text-sm text-red-400">{errors.images}</p>
			{/if}
			<p class="mt-2 text-xs text-slate-400">
				Upload images of the project site, reference photos, or plans. Maximum 5 additional images.
			</p>
		</div>
	</section>

	<!-- Form Actions -->
	<div class="flex flex-col gap-4 sm:flex-row sm:justify-end">
		<button
			type="button"
			on:click={handleCancel}
			class="rounded-lg border border-slate-600/50 bg-slate-700/40 px-6 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-600/40"
		>
			Cancel
		</button>
		<button
			type="button"
			on:click={handleSubmit}
			disabled={isSubmitting}
			class="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-50"
		>
			{#if isSubmitting && !isUploadingImages}
				Saving...
			{:else if isUploadingImages}
				Uploading Images...
			{:else}
				Save Changes
			{/if}
		</button>
	</div>
</div>
