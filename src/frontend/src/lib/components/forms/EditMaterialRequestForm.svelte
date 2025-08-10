<!-- src/frontend/src/lib/components/forms/EditMaterialRequestForm.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { MaterialRequest } from '$lib/types';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import apiClient from '$lib/api';

	export let materialRequest: MaterialRequest;

	const dispatch = createEventDispatcher();

	// Form data
	let formData = {
		title: materialRequest.title,
		description: materialRequest.description,
		deliveryLocation: materialRequest.deliveryLocation,
		deliveryDate: materialRequest.deliveryDate || '',
		linkedWorkRequestId: materialRequest.linkedWorkRequestId || '',
		items: [...materialRequest.items],
		attachments: [...(materialRequest.attachments || [])]
	};

	// Work requests for linking
	let customerWorkRequests: any[] = [];
	let isLoadingWorkRequests = false;

	// File upload handling
	let newFiles = writable<File[]>([]);
	let removedExistingFiles = writable<string[]>([]);

	// Form state
	let isSubmitting = false;
	let errors: Record<string, string> = {};

	// Fetch customer's work requests for linking
	onMount(async () => {
		if (materialRequest.customerId) {
			isLoadingWorkRequests = true;
			try {
				const requests = await apiClient.getWorkRequestsByCustomerId(materialRequest.customerId);
				// Allow linking to open requests OR requests that are already under contract
				customerWorkRequests = requests.filter(
					(req: any) => req.status === 'open' || req.status === 'contracted'
				);
			} catch (error) {
				console.error('Failed to fetch work requests:', error);
			} finally {
				isLoadingWorkRequests = false;
			}
		}
	});

	function validateForm() {
		errors = {};

		if (!formData.title.trim()) {
			errors.title = 'Title is required';
		}

		if (!formData.description.trim()) {
			errors.description = 'Description is required';
		}

		if (!formData.deliveryLocation.trim()) {
			errors.deliveryLocation = 'Delivery location is required';
		}

		if (formData.items.length === 0) {
			errors.items = 'At least one item is required';
		}

		// Validate each item
		formData.items.forEach((item, index) => {
			if (!item.itemName.trim()) {
				errors[`item_${index}_name`] = 'Item name is required';
			}
			if (!item.quantity.trim()) {
				errors[`item_${index}_quantity`] = 'Quantity is required';
			}
		});

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		isSubmitting = true;

		try {
			// Prepare the updated request data
			const updatedRequest: any = {
				...formData,
				// Filter out removed existing attachments
				attachments: formData.attachments.filter(
					(att) => !$removedExistingFiles.includes(att.fileName)
				)
			};

			// Add information about new files to be uploaded
			if ($newFiles.length > 0) {
				updatedRequest.newFiles = $newFiles;
			}

			// Add information about removed files
			if ($removedExistingFiles.length > 0) {
				updatedRequest.removedFiles = $removedExistingFiles;
			}

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

	function addItem() {
		formData.items = [...formData.items, { itemName: '', quantity: '', notes: '' }];
	}

	function removeItem(index: number) {
		formData.items = formData.items.filter((_, i) => i !== index);
	}

	function handleNewFilesChanged(event: CustomEvent) {
		// Handle new files being added
		const files = event.detail as File[];
		$newFiles = files;
	}

	function handleExistingFilesChanged(event: CustomEvent) {
		// Handle existing files being removed
		const removedFiles = event.detail as string[];
		$removedExistingFiles = removedFiles;
	}
</script>

<div class="space-y-6">
	<!-- Basic Information -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-lg bg-amber-500/20 p-2">
				<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-amber-300">Basic Information</h2>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Title -->
			<div class="lg:col-span-2">
				<label for="title" class="mb-2 block text-sm font-medium text-slate-300">
					Request Title *
				</label>
				<input
					id="title"
					type="text"
					bind:value={formData.title}
					placeholder="Enter a clear title for your material request"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.title
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				/>
				{#if errors.title}
					<p class="mt-1 text-sm text-red-400">{errors.title}</p>
				{/if}
			</div>

			<!-- Delivery Location -->
			<div>
				<label for="deliveryLocation" class="mb-2 block text-sm font-medium text-slate-300">
					Delivery Location *
				</label>
				<input
					id="deliveryLocation"
					type="text"
					bind:value={formData.deliveryLocation}
					placeholder="Full delivery address"
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.deliveryLocation
						? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
						: ''}"
				/>
				{#if errors.deliveryLocation}
					<p class="mt-1 text-sm text-red-400">{errors.deliveryLocation}</p>
				{/if}
			</div>

			<!-- Delivery Date -->
			<div>
				<label for="deliveryDate" class="mb-2 block text-sm font-medium text-slate-300">
					Preferred Delivery Date
				</label>
				<input
					id="deliveryDate"
					type="date"
					bind:value={formData.deliveryDate}
					class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				/>
			</div>

			<!-- Link to Existing Work Request -->
			<div class="lg:col-span-2">
				<label for="linkedWorkRequestId" class="mb-2 block text-sm font-medium text-slate-300">
					Link to Existing Work Request
					<span class="text-xs text-slate-400">(Optional)</span>
				</label>
				{#if isLoadingWorkRequests}
					<div
						class="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3"
					>
						<svg class="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span class="text-slate-400">Loading work requests...</span>
					</div>
				{:else}
					<select
						id="linkedWorkRequestId"
						bind:value={formData.linkedWorkRequestId}
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
					>
						<option value="">None</option>
						{#each customerWorkRequests as wr}
							<option value={wr.id}>{wr.title}</option>
						{/each}
					</select>
				{/if}
				<p class="mt-1 text-xs text-slate-400">
					Link this material request to an existing work request for better organization.
				</p>
			</div>
		</div>
	</section>

	<!-- Description -->
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
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-sky-300">Request Description</h2>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
				Detailed Description *
			</label>
			<textarea
				id="description"
				bind:value={formData.description}
				placeholder="Provide detailed information about your material requirements, quality specifications, and any special considerations..."
				rows="6"
				class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors.description
					? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
					: ''}"
			></textarea>
			{#if errors.description}
				<p class="mt-1 text-sm text-red-400">{errors.description}</p>
			{/if}
		</div>
	</section>

	<!-- Material Items -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-purple-500/20 p-2">
					<svg
						class="h-5 w-5 text-purple-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-purple-300">Material Items</h2>
			</div>
			<button
				type="button"
				on:click={addItem}
				class="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16M4 12h16"
					/>
				</svg>
				Add Item
			</button>
		</div>

		{#if errors.items}
			<p class="mb-4 text-sm text-red-400">{errors.items}</p>
		{/if}

		<div class="space-y-4">
			{#each formData.items as item, index}
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-semibold text-slate-200">Item {index + 1}</h3>
						{#if formData.items.length > 1}
							<button
								type="button"
								on:click={() => removeItem(index)}
								class="text-red-400 hover:text-red-300"
								aria-label="Remove item"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						{/if}
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<!-- Item Name -->
						<div>
							<label for="item-name-{index}" class="mb-2 block text-sm font-medium text-slate-300">
								Item Name *
							</label>
							<input
								id="item-name-{index}"
								type="text"
								bind:value={item.itemName}
								placeholder="e.g., Portland Cement, Steel Rods"
								class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors[
									`item_${index}_name`
								]
									? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
									: ''}"
							/>
							{#if errors[`item_${index}_name`]}
								<p class="mt-1 text-sm text-red-400">{errors[`item_${index}_name`]}</p>
							{/if}
						</div>

						<!-- Quantity -->
						<div>
							<label
								for="item-quantity-{index}"
								class="mb-2 block text-sm font-medium text-slate-300"
							>
								Quantity *
							</label>
							<input
								id="item-quantity-{index}"
								type="text"
								bind:value={item.quantity}
								placeholder="e.g., 10 bags, 500 kg, 100 pieces"
								class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none {errors[
									`item_${index}_quantity`
								]
									? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
									: ''}"
							/>
							{#if errors[`item_${index}_quantity`]}
								<p class="mt-1 text-sm text-red-400">{errors[`item_${index}_quantity`]}</p>
							{/if}
						</div>

						<!-- Notes -->
						<div class="sm:col-span-2">
							<label for="item-notes-{index}" class="mb-2 block text-sm font-medium text-slate-300">
								Additional Notes
							</label>
							<input
								id="item-notes-{index}"
								type="text"
								bind:value={item.notes}
								placeholder="Grade, brand preferences, specifications..."
								class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
							/>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Attachments -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-lg bg-orange-500/20 p-2">
				<svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-orange-300">Attachments</h2>
		</div>

		<!-- File Upload with Existing Attachments -->
		<FileUpload
			acceptedFileTypes={[
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/vnd.ms-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'image/jpeg',
				'image/png',
				'image/gif'
			]}
			maxFileSize={25 * 1024 * 1024}
			multiple={true}
			files={newFiles}
			existingAttachments={formData.attachments}
			removedExistingAttachments={removedExistingFiles}
			on:filesChanged={handleNewFilesChanged}
			on:existingAttachmentsChanged={handleExistingFilesChanged}
		/>
		<p class="mt-2 text-xs text-slate-400">
			Upload specifications, drawings, or reference documents. Supported formats: PDF, Word, Excel,
			Images. Maximum 25MB per file.
		</p>
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
			{isSubmitting ? 'Saving...' : 'Save Changes'}
		</button>
	</div>
</div>
