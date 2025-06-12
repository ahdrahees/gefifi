<!-- gefifi-2/src/frontend/src/lib/components/contracts/ContractForm.svelte -->
<script lang="ts">
	import type { Contract } from '$lib/types'; // Assuming types.ts has Contract
	import { createEventDispatcher } from 'svelte';
	import { API_BASE_URL } from '$lib/config';
	import { authStore } from '$lib/stores/auth';
	import { get } from 'svelte/store'; // To get token value non-reactively

	export let workRequestId: string | undefined = undefined;
	export let customerId: string;
	export let expertSupplierId: string;

	const dispatch = createEventDispatcher();

	let workDetails = '';
	let agreementSummary = '';
	// contractDate will likely be set on submission or by the backend

	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';
		successMessage = '';

		const token = get(authStore).token; // Get current token

		if (!token) {
			errorMessage = 'Authentication token not found. Please log in again.';
			isLoading = false;
			return;
		}

		if (!workDetails.trim() || !agreementSummary.trim()) {
			errorMessage = 'Work details and agreement summary are required.';
			isLoading = false;
			return;
		}

		const contractData = {
			workRequestId,
			customerId,
			expertSupplierId,
			workDetails: workDetails.trim(),
			agreementSummary: agreementSummary.trim(),
			contractDate: new Date().toISOString() // Or let backend set it
		};

		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(contractData)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || `Failed to create contract. Status: ${response.status}`);
			}

			// Assuming the backend returns the created contract
			const createdContract: Contract = result;

			successMessage = `Contract (ID: ${createdContract.id}) draft created successfully!`;
			dispatch('contractCreated', createdContract);

			// Optionally, clear form or close modal after a delay
			// setTimeout(() => {
			//   dispatch('close'); // Assuming parent modal listens for 'close'
			// }, 2000);
		} catch (error: any) {
			console.error('Error creating contract:', error);
			errorMessage = error.message || 'An unexpected error occurred while creating the contract.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-6 rounded-lg bg-slate-700 p-6 shadow-xl">
	<h2 class="text-2xl font-semibold text-sky-300">Create New Contract</h2>

	{#if errorMessage}
		<div class="rounded border border-red-700 bg-red-800/50 p-3 text-sm text-red-300">
			{errorMessage}
		</div>
	{/if}
	{#if successMessage}
		<div class="rounded border border-green-700 bg-green-800/50 p-3 text-sm text-green-300">
			{successMessage}
		</div>
	{/if}

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<div>
			<label for="work-details" class="mb-1 block text-sm font-medium text-slate-300"
				>Work Details</label
			>
			<textarea
				id="work-details"
				bind:value={workDetails}
				rows="4"
				class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
				placeholder="Describe the scope of work, tasks, deliverables..."
				required
				disabled={isLoading}
			/>
		</div>

		<div>
			<label for="agreement-summary" class="mb-1 block text-sm font-medium text-slate-300"
				>Agreement Summary</label
			>
			<textarea
				id="agreement-summary"
				bind:value={agreementSummary}
				rows="3"
				class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
				placeholder="Summarize key terms, payment schedule, timelines, etc."
				required
				disabled={isLoading}
			/>
		</div>

		<div class="pt-2">
			<p class="text-xs text-slate-400">
				Associated Work Request ID: {workRequestId || 'N/A'}<br />
				Customer ID: {customerId || 'N/A'}<br />
				Expert/Supplier ID: {expertSupplierId || 'N/A'}
			</p>
		</div>

		<div class="flex justify-end pt-4">
			<button
				type="submit"
				class="rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={isLoading || successMessage !== ''}
			>
				{#if isLoading}
					<svg
						class="mr-2 inline h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					Creating...
				{:else}
					Create Contract Draft
				{/if}
			</button>
		</div>
	</form>
</div>