<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	type ContractStatus =
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled';
	type ContractDetail = {
		id: string;
		workRequestId: string;
		customerId: string;
		expertSupplierId: string;
		workDetails: string;
		agreementSummary: string;
		contractDate: string;
		customerSigned: boolean;
		customerSignatureTimestamp?: string;
		expertSupplierSigned: boolean;
		expertSupplierSignatureTimestamp?: string;
		status: ContractStatus;
		createdAt: string;
		updatedAt: string;
		// For display - to be fetched or passed
		customerName?: string;
		expertSupplierName?: string;
		workRequestTitle?: string;
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let contract: ContractDetail | null = null;
	let isLoading = true;
	let errorMessage = '';
	let contractIdFromUrl: string | null = null;
	let isSigning = false;
	let signMessage = '';

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchContractDetails(id: string) {
		isLoading = true;
		errorMessage = '';
		if (!token) {
			errorMessage = 'Authentication token not available.';
			isLoading = false;
			return;
		}
		try {
			// First, fetch the contract itself
			const response = await fetch(`${API_BASE_URL}/api/contracts/${id}`, {
				// Assuming this endpoint exists
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to fetch contract details' }));
				throw new Error(errorData.message);
			}
			const fetchedContract: ContractDetail = await response.json();

			// TODO: Fetch related details - customer name, expert/supplier name, work request title
			// This is simplified for now. In a real app, these might be separate calls or backend could embed them.
			// Placeholder names:
			fetchedContract.customerName = `Customer (${fetchedContract.customerId.substring(0, 8)}...)`;
			fetchedContract.expertSupplierName = `Provider (${fetchedContract.expertSupplierId.substring(0, 8)}...)`;
			fetchedContract.workRequestTitle = `Work Request (${fetchedContract.workRequestId.substring(0, 8)}...)`;

			contract = fetchedContract;
		} catch (err: any) {
			console.error('Fetch contract detail error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function handleSignContract() {
		if (!contract || !currentUser || !token) return;
		if (
			(currentUser.id === contract.customerId && contract.customerSigned) ||
			(currentUser.id === contract.expertSupplierId && contract.expertSupplierSigned)
		) {
			signMessage = 'You have already signed this contract.';
			return;
		}

		isSigning = true;
		signMessage = '';
		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/sign`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
				// No body needed for this specific sign endpoint as per backend routes
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to sign contract.');
			}
			signMessage = result.message || 'Contract signed successfully!';
			// Refresh contract details to show new status and signatures
			if (result.id) {
				// The updated contract is returned
				contract = {
					...contract,
					...result,
					// Keep fetched names if result doesn't include them
					customerName: contract?.customerName,
					expertSupplierName: contract?.expertSupplierName,
					workRequestTitle: contract?.workRequestTitle
				};
			} else {
				// Fallback if full object not returned
				fetchContractDetails(contract.id);
			}
		} catch (error: any) {
			console.error('Error signing contract:', error);
			signMessage = `Error: ${error.message}`;
		} finally {
			isSigning = false;
		}
	}

	onMount(() => {
		contractIdFromUrl = $page.params.id;
		if (contractIdFromUrl) {
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					fetchContractDetails(contractIdFromUrl!);
					unsubscribe();
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated. Cannot load details.';
					isLoading = false;
					unsubscribe();
				}
			});
		} else {
			errorMessage = 'Contract ID not found in URL.';
			isLoading = false;
		}
	});

	function getStatusClass(status: ContractStatus | undefined, type: 'badge' | 'text' = 'badge') {
		if (!status) return type === 'badge' ? 'bg-slate-700 text-slate-400' : 'text-slate-400';
		const baseClasses = {
			draft: { badge: 'bg-yellow-500/20 border-yellow-500/50', text: 'text-yellow-300' },
			awaiting_signatures: { badge: 'bg-sky-500/20 border-sky-500/50', text: 'text-sky-300' },
			signed: { badge: 'bg-emerald-500/20 border-emerald-500/50', text: 'text-emerald-300' },
			in_progress: { badge: 'bg-blue-500/20 border-blue-500/50', text: 'text-blue-300' },
			completed: { badge: 'bg-green-600/30 border-green-600/60', text: 'text-green-300' },
			disputed: { badge: 'bg-red-500/20 border-red-500/50', text: 'text-red-300' },
			cancelled: { badge: 'bg-slate-600/30 border-slate-500/50', text: 'text-slate-400' },
			default: { badge: 'bg-gray-500/20 border-gray-500/50', text: 'text-gray-300' }
		};
		return (baseClasses[status] || baseClasses.default)[type];
	}

	function formatOptionalDate(timestamp?: string) {
		if (!timestamp) return 'Not signed';
		return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
	}

	$: canCurrentUserSign =
		contract &&
		currentUser &&
		(contract.status === 'draft' || contract.status === 'awaiting_signatures') &&
		((currentUser.id === contract.customerId && !contract.customerSigned) ||
			(currentUser.id === contract.expertSupplierId && !contract.expertSupplierSigned));
</script>

<div class="mx-auto max-w-4xl space-y-6 pb-12">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-10 w-10 animate-spin text-emerald-500"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle><path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path></svg
			>
			<p class="text-xl text-slate-300">Loading Contract Details...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-600 bg-red-700/30 p-6 text-center shadow-xl">
			<h2 class="mb-3 text-2xl font-semibold text-red-300">Error Loading Contract</h2>
			<p class="mb-4 text-red-400">{errorMessage}</p>
			<button
				on:click={() => goto('/contracts')}
				class="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition-colors hover:bg-sky-600"
				>Back to Contracts List</button
			>
		</div>
	{:else if contract}
		<article class="overflow-hidden rounded-xl bg-slate-700/60 shadow-2xl">
			<header class="border-b border-slate-600/50 bg-slate-800/70 p-6 sm:p-8">
				<div class="mb-3 flex items-start justify-between">
					<h1 class="text-2xl leading-tight font-bold text-emerald-400 sm:text-3xl">
						Contract Details
					</h1>
					<span
						class="rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap {getStatusClass(
							contract.status,
							'badge'
						)} shadow-sm"
					>
						{contract.status.replace(/_/g, ' ').toUpperCase()}
					</span>
				</div>
				<p class="text-sm text-slate-400">ID: {contract.id}</p>
				{#if contract.workRequestId}
					<p class="text-sm text-slate-400">
						Related Work Request:
						<button
							on:click={() => goto(`/work-requests/${contract.workRequestId}`)}
							class="text-amber-400 hover:underline"
							>#{contract.workRequestId.substring(0, 12)}...</button
						>
					</p>
				{/if}
			</header>

			<div class="space-y-6 p-6 sm:p-8">
				<section>
					<h2 class="mb-2 text-xl font-semibold text-sky-300">Agreement Summary</h2>
					<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
						{contract.agreementSummary || 'No summary provided.'}
					</p>
				</section>

				<section>
					<h2 class="mb-2 text-xl font-semibold text-sky-300">Detailed Work Scope</h2>
					<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
						{contract.workDetails || 'No details provided.'}
					</p>
				</section>

				<div
					class="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-slate-600/70 pt-5 md:grid-cols-2"
				>
					<div>
						<h3 class="mb-1 text-lg font-semibold text-sky-300">Customer</h3>
						<p class="text-slate-300">{contract.customerName || `ID: ${contract.customerId}`}</p>
						<p class="text-sm {contract.customerSigned ? 'text-green-400' : 'text-yellow-400'}">
							{contract.customerSigned
								? `Signed on: ${formatOptionalDate(contract.customerSignatureTimestamp)}`
								: 'Awaiting Signature'}
						</p>
					</div>
					<div>
						<h3 class="mb-1 text-lg font-semibold text-sky-300">Expert/Supplier</h3>
						<p class="text-slate-300">
							{contract.expertSupplierName || `ID: ${contract.expertSupplierId}`}
						</p>
						<p
							class="text-sm {contract.expertSupplierSigned ? 'text-green-400' : 'text-yellow-400'}"
						>
							{contract.expertSupplierSigned
								? `Signed on: ${formatOptionalDate(contract.expertSupplierSignatureTimestamp)}`
								: 'Awaiting Signature'}
						</p>
					</div>
					<div>
						<h3 class="mb-1 text-lg font-semibold text-sky-300">Contract Date</h3>
						<p class="text-slate-300">
							{new Date(contract.contractDate).toLocaleDateString('en-GB', { dateStyle: 'full' })}
						</p>
					</div>
				</div>

				<!-- Signing Action -->
				{#if canCurrentUserSign}
					<section class="border-t border-slate-600/70 pt-6 text-center">
						<h2 class="mb-3 text-xl font-semibold text-sky-400">Sign Contract</h2>
						<p class="mb-4 text-slate-300">
							As the {currentUser?.id === contract.customerId ? 'Customer' : 'Expert/Supplier'}, you
							can sign this contract. Please review all details carefully before signing.
						</p>
						<button
							on:click={handleSignContract}
							disabled={isSigning}
							class="rounded-lg bg-emerald-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-xl disabled:bg-slate-500"
						>
							{isSigning ? 'Processing Signature...' : 'Digitally Sign Contract'}
						</button>
						{#if signMessage}
							<p
								class="mt-4 text-sm {signMessage.startsWith('Error:')
									? 'text-red-400'
									: 'text-green-400'}"
							>
								{signMessage}
							</p>
						{/if}
					</section>
				{/if}

				{#if contract.status === 'signed'}
					<div class="border-t border-slate-600/70 pt-6 text-center">
						<p class="text-2xl font-semibold text-green-400">✓ Contract Signed by All Parties</p>
						<p class="mt-1 text-slate-300">This agreement is now active.</p>
					</div>
				{/if}
			</div>
			<footer class="border-t border-slate-600/50 bg-slate-800/70 p-4 text-center sm:p-6">
				<p class="text-xs text-slate-500">
					Contract Created: {new Date(contract.createdAt).toLocaleString('en-GB', {
						dateStyle: 'short',
						timeStyle: 'short'
					})} | Last Updated: {new Date(contract.updatedAt).toLocaleString('en-GB', {
						dateStyle: 'short',
						timeStyle: 'short'
					})}
				</p>
			</footer>
		</article>
	{:else}
		<div class="rounded-xl bg-slate-700/50 p-6 text-center shadow-lg">
			<h2 class="text-xl font-semibold text-sky-400">Contract Not Found</h2>
			<p class="mt-2 text-slate-300">
				The requested contract (ID: {contractIdFromUrl || 'Unknown'}) could not be loaded or does
				not exist.
			</p>
			<button
				on:click={() => goto('/contracts')}
				class="mt-4 rounded-lg bg-emerald-500 px-5 py-2 font-medium text-white hover:bg-emerald-600"
				>Back to Contracts List</button
			>
		</div>
	{/if}
</div>

<style lang="postcss">
	/* Page-specific styles */
</style>
