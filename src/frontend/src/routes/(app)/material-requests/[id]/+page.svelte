<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import apiClient from '$lib/api';
	import type { MaterialRequest } from '$lib/types'; // Using the full type for details
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let request: MaterialRequest | null = null;
	let isLoading = true;
	let errorMessage = '';

	// For supplier interest
	let isExpressingInterest = false;
	let interestMessage = '';

	onMount(async () => {
		const requestId = $page.params.id;
		if (!requestId) {
			errorMessage = 'No request ID found in the URL.';
			isLoading = false;
			return;
		}

		try {
			// Type assertion as the API client currently returns a lighter response type
			request = (await apiClient.getMaterialRequestById(requestId)) as MaterialRequest;
		} catch (error: any) {
			console.error('Failed to fetch material request:', error);
			errorMessage = error.data?.message || 'Could not load the material request.';
		} finally {
			isLoading = false;
		}
	});

	async function handleExpressInterest() {
		if (!request || !currentUser || currentUser.userType !== 'supplier') return;

		isExpressingInterest = true;
		interestMessage = '';
		try {
			const result = await apiClient.sendInterest({
				targetUserId: request.customerId,
				materialRequestId: request.id,
				predefinedMessageKey: 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST'
			});
			interestMessage = result.message || 'Interest sent successfully!';
			// Refresh the request data to show that interest has been expressed
			await fetchRequestDetails(request.id);
			// Give user time to read the message, then go to chat
			setTimeout(() => {
				goto(`/chat/${result.chatId}`);
			}, 2000);
		} catch (error: any) {
			interestMessage = error.data?.message || 'Failed to send interest.';
		} finally {
			isExpressingInterest = false;
		}
	}

	async function fetchRequestDetails(id: string) {
		try {
			request = (await apiClient.getMaterialRequestById(id)) as MaterialRequest;
		} catch (error: any) {
			console.error('Failed to fetch material request:', error);
			errorMessage = error.data?.message || 'Could not load the material request.';
		}
	}

	function formatDate(dateString: string | undefined) {
		if (!dateString) return 'Not specified';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="flex h-full flex-col space-y-8">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<p class="text-slate-300">Loading material request details...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300">
			<h3 class="font-bold">Error</h3>
			<p>{errorMessage}</p>
		</div>
	{:else if request}
		<header>
			<h1 class="text-3xl font-bold text-emerald-400">{request.title}</h1>
			<p class="mt-2 text-slate-400">Details for your material request.</p>
		</header>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
			<!-- Main Details -->
			<div class="space-y-6 md:col-span-2">
				<div class="rounded-xl bg-slate-700/60 p-6 shadow-lg">
					<h2 class="mb-3 text-xl font-semibold text-sky-300">Description</h2>
					<p class="text-slate-300">{request.description}</p>
				</div>

				<div class="rounded-xl bg-slate-700/60 p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-semibold text-sky-300">Requested Items</h2>
					<ul class="space-y-3">
						{#each request.items as item, index (index)}
							<li class="flex items-start justify-between rounded-lg bg-slate-800/50 p-3">
								<div>
									<p class="font-medium text-slate-100">{item.itemName}</p>
									{#if item.notes}
										<p class="text-xs text-slate-400">{item.notes}</p>
									{/if}
								</div>
								<p class="font-bold text-emerald-400">{item.quantity}</p>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<!-- Side Panel -->
			<div class="space-y-6 md:col-span-1">
				<div class="rounded-xl bg-slate-700/60 p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-semibold text-sky-300">Details</h2>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-400">Status:</span>
							<span
								class="rounded-full bg-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-200 uppercase"
								>{request.status}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Delivery Location:</span>
							<span class="text-right font-medium text-white">{request.deliveryLocation}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Preferred Delivery:</span>
							<span class="text-right font-medium text-white"
								>{formatDate(request.deliveryDate)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Created:</span>
							<span class="text-right font-medium text-white">{formatDate(request.createdAt)}</span>
						</div>
						{#if request.linkedWorkRequestId}
							<div class="border-t border-slate-600 pt-3">
								<p class="text-slate-400">Linked to Work Request:</p>
								<a
									href={`/work-requests/${request.linkedWorkRequestId}`}
									class="font-medium text-emerald-400 hover:underline"
									>{request.linkedWorkRequestId.substring(0, 8)}...</a
								>
							</div>
						{/if}
					</div>
				</div>

				<!-- Action button for Suppliers -->
				{#if currentUser?.userType === 'supplier' && request.status === 'open'}
					<div class="rounded-xl bg-slate-700/60 p-6 text-center shadow-lg">
						{#if request.interestedSuppliers?.includes(currentUser.id)}
							<p class="font-semibold text-emerald-400">✓ You have expressed interest.</p>
						{:else}
							<button
								on:click={handleExpressInterest}
								disabled={isExpressingInterest}
								class="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-emerald-600 disabled:opacity-50"
							>
								{isExpressingInterest ? 'Processing...' : 'Express Interest & Start Chat'}
							</button>
						{/if}
						{#if interestMessage}
							<p
								class="mt-3 text-sm {interestMessage.startsWith('Error:')
									? 'text-red-400'
									: 'text-green-400'}"
							>
								{interestMessage}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Find Supplier Button -->
				{#if currentUser?.userType === 'customer' && request.status === 'open'}
					<div class="rounded-xl bg-slate-700/60 p-6 text-center shadow-lg">
						<a
							href={`/find-professionals?type=supplier&request-id=${request.id}`}
							class="block w-full rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-sky-600"
						>
							Find a Supplier
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
