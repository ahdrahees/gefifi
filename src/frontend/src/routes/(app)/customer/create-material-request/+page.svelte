<!-- src/frontend/src/routes/(app)/customer/create-material-request/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { MaterialRequestData, WorkRequestResponse } from '$lib/api';
	import FileUpload from '$lib/components/FileUpload.svelte';

	let title = $state('');
	let description = $state('');
	let deliveryLocation = $state('');
	let deliveryDate = $state('');
	let expirationDate = $state('');
	let linkedWorkRequestId: string | undefined = $state(undefined);

	let items = $state([{ itemName: '', quantity: '', notes: '' }]);

	let customerWorkRequests: WorkRequestResponse[] = $state([]);
	let isLoading = $state(false);
	let errorMessage = $state('');

	// File attachment handling
	let selectedFiles = $state<File[]>([]);
	let isUploadingFiles = $state(false);

	onMount(async () => {
		const user = $authStore.user;
		if (!user) {
			goto('/auth/login');
			return;
		}
		try {
			// In a real app, you might want to create a dedicated endpoint for this.
			// Reusing the work-requests endpoint is efficient for now.
			const requests = await apiClient.getWorkRequestsByCustomerId(user.id);
			// Allow linking to open requests OR requests that are already under contract
			customerWorkRequests = requests.filter(
				(req) => req.status === 'open' || req.status === 'contracted'
			);
		} catch (error) {
			console.error('Failed to fetch user work requests:', error);
			// Non-critical error, the form can still be used.
		}
	});

	function addItem() {
		items = [...items, { itemName: '', quantity: '', notes: '' }];
	}

	function removeItem(index: number) {
		if (items.length > 1) {
			items = items.filter((_, i) => i !== index);
		}
	}

	async function uploadAttachments(materialRequestId: string): Promise<void> {
		const files = selectedFiles;
		if (!files || files.length === 0) {
			return;
		}

		isUploadingFiles = true;
		try {
			const formData = new FormData();
			files.forEach((file) => {
				formData.append('files', file);
			});

			await apiClient.uploadEntityAttachments('material-requests', materialRequestId, formData);
		} catch (error: unknown) {
			console.error('Failed to upload attachments:', error);
			throw new Error(error instanceof Error ? error?.message : 'Failed to upload attachments.');
		} finally {
			isUploadingFiles = false;
		}
	}

	async function handleSubmit(event?: Event) {
		if (event) event.preventDefault();
		isLoading = true;
		errorMessage = '';

		if (items.some((item) => !item.itemName.trim() || !item.quantity.trim())) {
			errorMessage = 'Please ensure all material items have at least a name and quantity.';
			isLoading = false;
			return;
		}

		// Validate file count
		if (selectedFiles.length > 10) {
			errorMessage = 'Too many files selected. Maximum 10 files allowed for material requests.';
			isLoading = false;
			return;
		}

		if (expirationDate) {
			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);
			if (new Date(expirationDate).getTime() < todayStart.getTime()) {
				errorMessage = 'Expiration date cannot be in the past.';
				isLoading = false;
				return;
			}
		}

		try {
			// Step 1: Create the material request
			// Construct the request data, only including defined values (Firestore-safe)
			const requestData: MaterialRequestData = {
				title,
				description,
				deliveryLocation,
				items
			};

			// Only include optional fields if they have values
			if (deliveryDate?.trim()) {
				requestData.deliveryDate = deliveryDate;
			}
			if (linkedWorkRequestId) {
				requestData.linkedWorkRequestId = linkedWorkRequestId;
			}
			if (expirationDate?.trim()) {
				requestData.expirationDate = expirationDate;
			}

			const newMaterialRequest = await apiClient.createMaterialRequest(requestData);

			// Step 2: Upload attachments if any files are selected
			if (selectedFiles.length > 0) {
				try {
					await uploadAttachments(newMaterialRequest.id);
				} catch (attachmentError: any) {
					// Material request was created but attachments failed
					errorMessage = `Material request created but ${attachmentError.message}`;
					// Still navigate to the page since the request was created
					setTimeout(() => {
						goto(`/material-requests/${newMaterialRequest.id}`);
					}, 3000);
					return;
				}
			}

			// Step 3: Navigate to the new material request's detail page
			goto(`/material-requests/${newMaterialRequest.id}`);
		} catch (error: unknown) {
			errorMessage = error instanceof Error ? error?.message : 'Failed to create material request.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex h-full flex-col space-y-8">
	<header>
		<h1 class="text-3xl font-bold text-emerald-400">Create a New Material Request</h1>
		<p class="mt-2 text-slate-400">
			List the materials you need for your project. Suppliers will be able to see this and express
			their interest.
		</p>
	</header>

	<form
		onsubmit={handleSubmit}
		class="flex-grow space-y-6 rounded-xl bg-slate-700/60 p-8 shadow-lg"
	>
		<!-- Request Details -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div>
				<label for="title" class="block text-sm leading-6 font-medium text-slate-300"
					>Request Title</label
				>
				<input
					id="title"
					bind:value={title}
					required
					placeholder="e.g., Materials for Foundation"
					class="mt-2 block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
				/>
			</div>
			<div>
				<label for="linkedWorkRequestId" class="block text-sm leading-6 font-medium text-slate-300"
					>Link to Existing Work Request <span class="text-xs text-slate-400">(Optional)</span
					></label
				>
				<select
					id="linkedWorkRequestId"
					bind:value={linkedWorkRequestId}
					class="mt-2 block w-full appearance-none rounded-lg border-0 bg-slate-700/50 py-2.5 pr-10 pl-3 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
				>
					<option value={undefined}>None</option>
					{#each customerWorkRequests as wr (wr.id)}
						<option value={wr.id}>{wr.title}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label for="description" class="block text-sm leading-6 font-medium text-slate-300"
				>Description</label
			>
			<textarea
				id="description"
				bind:value={description}
				required
				rows="3"
				placeholder="Describe the overall need for these materials, quality requirements, etc."
				class="mt-2 block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
			></textarea>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div>
				<label for="deliveryLocation" class="block text-sm leading-6 font-medium text-slate-300"
					>Delivery Location</label
				>
				<input
					id="deliveryLocation"
					bind:value={deliveryLocation}
					required
					placeholder="Full address for delivery"
					class="mt-2 block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
				/>
			</div>
			<div>
				<label for="deliveryDate" class="block text-sm leading-6 font-medium text-slate-300"
					>Preferred Delivery Date <span class="text-xs text-slate-400">(Optional)</span></label
				>
				<input
					id="deliveryDate"
					bind:value={deliveryDate}
					type="date"
					class="mt-2 block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
				/>
			</div>
			<div>
				<label for="expirationDate" class="block text-sm leading-6 font-medium text-slate-300"
					>Expiration Date <span class="text-xs text-slate-400">(Optional)</span></label
				>
				<input
					id="expirationDate"
					bind:value={expirationDate}
					type="date"
					class="mt-2 block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
				/>
			</div>
		</div>

		<!-- Dynamic Items List -->
		<div class="space-y-4 border-t border-slate-600 pt-6">
			<h3 class="text-xl font-semibold text-sky-300">Material Items</h3>
			{#each items as item, i (i)}
				<div
					class="grid grid-cols-1 items-start gap-4 rounded-md bg-slate-800/50 p-4 md:grid-cols-3"
				>
					<div class="md:col-span-1">
						<label for="itemName-{i}" class="text-sm font-medium text-slate-300">Item Name</label>
						<input
							id="itemName-{i}"
							bind:value={item.itemName}
							required
							placeholder="e.g., Portland Cement"
							class="mt-1 block w-full rounded-md border-0 bg-slate-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
						/>
					</div>
					<div class="md:col-span-1">
						<label for="quantity-{i}" class="text-sm font-medium text-slate-300"
							>Quantity / Unit</label
						>
						<input
							id="quantity-{i}"
							bind:value={item.quantity}
							required
							placeholder="e.g., 50 bags"
							class="mt-1 block w-full rounded-md border-0 bg-slate-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
						/>
					</div>
					<div class="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
						<div class="w-full">
							<label for="notes-{i}" class="text-sm font-medium text-slate-300"
								>Notes<span class="text-xs text-slate-400"> (Optional)</span></label
							>
							<input
								id="notes-{i}"
								bind:value={item.notes}
								placeholder="e.g., Grade 43"
								class="mt-1 block w-full rounded-md border-0 bg-slate-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
							/>
						</div>

						<button
							type="button"
							onclick={() => removeItem(i)}
							disabled={items.length <= 1}
							class="h-9 w-full rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Remove
						</button>
					</div>
				</div>
			{/each}
			<button
				type="button"
				onclick={addItem}
				class="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
			>
				+ Add Another Item
			</button>
		</div>

		<!-- File Attachments Section -->
		<div class="space-y-4 border-t border-slate-600 pt-6">
			<div>
				<h3 class="text-xl font-semibold text-sky-300">Attachments</h3>
				<p class="mt-1 text-sm text-slate-400">
					Upload bills of materials, drawings, photos, or other relevant documents (Max 10 files,
					25MB total)
				</p>
			</div>
			<FileUpload
				acceptedFileTypes={[
					'image/jpeg',
					'image/png',
					'image/gif',
					'image/webp',
					'application/pdf',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'.dwg',
					'.dxf'
				]}
				maxFileSize={25 * 1024 * 1024}
				multiple={true}
				files={selectedFiles}
			/>
		</div>

		{#if errorMessage}
			<div
				class="rounded-md border border-red-500/50 bg-red-500/25 p-3.5 text-sm text-red-200"
				role="alert"
			>
				{errorMessage}
			</div>
		{/if}

		<!-- Submission -->
		<div class="border-t border-slate-600 pt-6">
			<button
				type="submit"
				disabled={isLoading || isUploadingFiles}
				class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm leading-6 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
			>
				{#if isLoading && !isUploadingFiles}
					<span>Creating Material Request...</span>
				{:else if isUploadingFiles}
					<span>Uploading Attachments...</span>
				{:else}
					Submit Material Request
				{/if}
			</button>
		</div>
	</form>
</div>
