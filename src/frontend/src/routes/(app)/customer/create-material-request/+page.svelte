<!-- src/frontend/src/routes/(app)/customer/create-material-request/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { WorkRequest } from '$lib/types';
	import type { WorkRequestResponse } from '$lib/api';

	let title = '';
	let description = '';
	let deliveryLocation = '';
	let deliveryDate = '';
	let linkedWorkRequestId: string | undefined = undefined;

	let items = [{ itemName: '', quantity: '', notes: '' }];

	let customerWorkRequests: WorkRequestResponse[] = [];
	let isLoading = false;
	let errorMessage = '';

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
			customerWorkRequests = requests.filter((req) => req.status === 'open');
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

	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';

		if (items.some((item) => !item.itemName.trim() || !item.quantity.trim())) {
			errorMessage = 'Please ensure all material items have at least a name and quantity.';
			isLoading = false;
			return;
		}

		try {
			const newMaterialRequest = await apiClient.createMaterialRequest({
				title,
				description,
				deliveryLocation,
				deliveryDate: deliveryDate || undefined,
				linkedWorkRequestId,
				items
			});
			// Navigate to the new material request's detail page or a confirmation page
			goto(`/material-requests/${newMaterialRequest.id}`);
		} catch (error: any) {
			errorMessage = error.data?.message || 'Failed to create material request.';
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
		on:submit|preventDefault={handleSubmit}
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

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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
							on:click={() => removeItem(i)}
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
				on:click={addItem}
				class="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
			>
				+ Add Another Item
			</button>
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
				disabled={isLoading}
				class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm leading-6 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
			>
				{#if isLoading}
					<!-- Spinner SVG -->
					<span>Submitting Request...</span>
				{:else}
					Submit Material Request
				{/if}
			</button>
		</div>
	</form>
</div>
