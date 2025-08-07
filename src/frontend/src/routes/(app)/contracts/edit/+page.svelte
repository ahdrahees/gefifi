<!-- src/frontend/src/routes/(app)/contracts/edit/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import type { Contract } from '$lib/types';
	import type { Unsubscriber } from 'svelte/store';
	import ContractForm from '$lib/components/contracts/ContractForm.svelte';

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let contract: Contract | null = null;
	let isLoading = true;
	let errorMessage = '';
	let contractId: string | null = null;
	let isSaving = false;

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
			const response = await fetch(`${API_BASE_URL}/api/contracts/${id}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to fetch contract details' }));
				throw new Error(errorData.message);
			}

			const fetchedContract: Contract = await response.json();

			// Validate contract status - only revision_requested contracts can be edited
			if (fetchedContract.status !== 'revision_requested') {
				throw new Error('Only contracts in revision_requested status can be edited.');
			}

			// Validate user authorization - currently only customer can edit, but this may change in the future
			if (currentUser?.id !== fetchedContract.customerId) {
				throw new Error('You are not authorized to edit this contract.');
			}

			contract = fetchedContract;
		} catch (err: any) {
			console.error('Fetch contract detail error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function handleContractUpdate(event: CustomEvent) {
		if (!contract || !currentUser || !token) return;

		isSaving = true;

		try {
			// The contract has already been updated by ContractForm
			// Just send a system message and redirect

			// Send system message about contract changes
			await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/comments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					comment: 'Contract has been updated to address revision request.',
					type: 'general'
				})
			});

			// Redirect back to contract page
			goto(`/contracts/${contract.id}`);
		} catch (error: any) {
			console.error('Error sending comment:', error);
			// Even if comment fails, still redirect to contract page
			goto(`/contracts/${contract.id}`);
		} finally {
			isSaving = false;
		}
	}

	onMount(() => {
		contractId = $page.url.searchParams.get('id');
		let unsubscribe: Unsubscriber;

		if (contractId) {
			unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					fetchContractDetails(contractId!);
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated. Cannot load details.';
					isLoading = false;
				}
			});
		} else {
			errorMessage = 'Contract ID not found in URL parameters.';
			isLoading = false;
		}

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	});
</script>

<svelte:head>
	<title
		>{contract ? `Edit Contract: ${contract.id.substring(0, 12)}...` : 'Edit Contract'} - GEFIFI</title
	>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 pb-12">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<div class="flex items-center space-x-3">
				<svg
					class="h-8 w-8 animate-spin text-emerald-500"
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
				<p class="text-xl text-slate-300">Loading Contract Details...</p>
			</div>
		</div>
	{:else if errorMessage}
		<div
			class="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center shadow-xl backdrop-blur-sm"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20"
			>
				<svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h2 class="mb-3 text-2xl font-bold text-red-300">Unable to Edit Contract</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={() => goto('/contracts')}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to Contracts
			</button>
		</div>
	{:else if contract}
		<!-- Header Section -->
		<header
			class="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-blue-500/20 p-2">
							<svg
								class="h-6 w-6 text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</span>
						<div>
							<h1 class="text-2xl font-bold text-blue-400 lg:text-3xl">Edit Contract</h1>
							<p class="text-slate-400">Contract ID: {contract.id.substring(0, 12)}...</p>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class="rounded-full border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300"
						>
							REVISION REQUESTED
						</span>
						<div class="flex flex-wrap items-center gap-2">
							<a
								href="/contracts/{contract.id}"
								class="flex items-center gap-2 rounded-full border border-slate-500/30 bg-slate-500/20 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-500/30"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
								View Contract
							</a>
						</div>
					</div>
				</div>
				<div class="text-right">
					<p class="text-sm text-slate-400">Last Updated</p>
					<p class="text-lg font-semibold text-slate-200">
						{new Date(contract.updatedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
					</p>
				</div>
			</div>
		</header>

		<!-- Edit Form -->
		<div
			class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
		>
			<div class="mb-6">
				<h2 class="text-xl font-bold text-slate-200">Update Contract Details</h2>
				<p class="text-slate-400">
					Make the necessary changes to address the revision request. The contract will be ready for
					signing again after saving.
				</p>
			</div>

			{#if contract}
				<ContractForm
					workRequestId={contract.workRequestId}
					materialRequestId={contract.materialRequestId}
					customerId={contract.customerId}
					expertSupplierId={contract.expertSupplierId}
					existingContract={contract}
					on:contractUpdate={handleContractUpdate}
				/>
			{/if}
		</div>

		<!-- Back Button -->
		<div class="text-center">
			<button
				on:click={() => goto(`/contracts/${contract?.id}`)}
				class="inline-flex items-center gap-2 rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Contract
			</button>
		</div>
	{:else}
		<div class="rounded-2xl bg-slate-700/50 p-8 text-center shadow-xl backdrop-blur-sm">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-600/50"
			>
				<svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h2 class="mb-3 text-xl font-bold text-sky-400">Contract Not Found</h2>
			<p class="mb-6 text-slate-300">
				The requested contract (ID: {contractId || 'Unknown'}) could not be loaded or does not
				exist.
			</p>
			<button
				on:click={() => goto('/contracts')}
				class="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
			>
				← Back to Contracts
			</button>
		</div>
	{/if}
</div>
