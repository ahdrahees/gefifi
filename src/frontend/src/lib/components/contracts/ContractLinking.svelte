<!-- gefifi-2/src/frontend/src/lib/components/contracts/ContractLinking.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { Contract, ContractLink } from '$lib/types';

	export let contract: Contract;
	export let currentUser: any;

	const dispatch = createEventDispatcher();

	// State
	let showLinkingModal = false;
	let availableContracts: any[] = [];
	let selectedContractId = '';
	let linkReason = '';
	let linkVisibility: 'private' | 'shared' = 'private';
	let isLoading = false;
	let isLinking = false;
	let errorMessage = '';
	let successMessage = '';
	let modalContainer: HTMLElement;
	let linkedContractDetails: Record<string, any> = {};

	// Computed
	$: linkedContracts = contract.linkedContracts || [];
	$: canLinkContracts = ['draft', 'awaiting_signatures', 'revision_requested'].includes(
		contract.status
	);
	$: maxLinksReached = linkedContracts.length >= 10;

	// Track if we've fetched details to avoid infinite loops
	let hasFetchedDetails = false;

	onMount(() => {
		if (canLinkContracts) {
			fetchAvailableContracts();
		}

		// Fetch linked contract details
		fetchLinkedContractDetails();

		// Create modal container at document body level
		modalContainer = document.createElement('div');
		modalContainer.id = 'contract-linking-modal-container';
		modalContainer.style.position = 'fixed';
		modalContainer.style.top = '0';
		modalContainer.style.left = '0';
		modalContainer.style.width = '100vw';
		modalContainer.style.height = '100vh';
		modalContainer.style.zIndex = '9999';
		modalContainer.style.pointerEvents = 'none';
		document.body.appendChild(modalContainer);
	});

	onDestroy(() => {
		// Clean up modal container
		if (modalContainer && modalContainer.parentNode) {
			modalContainer.parentNode.removeChild(modalContainer);
		}
	});

	async function fetchAvailableContracts() {
		if (!currentUser) return;

		isLoading = true;
		errorMessage = '';

		try {
			// Fetch all contracts the user is involved in
			const contracts = await apiClient.getUserContracts();

			// Filter out:
			// 1. Current contract
			// 2. Already linked contracts
			// 3. Contracts where user is not a participant
			const linkedContractIds = linkedContracts.map((link) => link.contractId);

			availableContracts = (contracts as any[]).filter(
				(c: any) =>
					c.id !== contract.id &&
					!linkedContractIds.includes(c.id) &&
					(c.customerId === currentUser.id || c.expertSupplierId === currentUser.id)
			);
		} catch (error: any) {
			console.error('Error fetching available contracts:', error);
			errorMessage = 'Failed to load available contracts.';
		} finally {
			isLoading = false;
		}
	}

	async function fetchLinkedContractDetails() {
		if (!currentUser || linkedContracts.length === 0 || hasFetchedDetails) return;

		hasFetchedDetails = true;
		console.log(
			'🔄 Fetching contract details for:',
			linkedContracts.map((l) => l.contractId)
		);

		try {
			// Fetch details for each linked contract
			const contractDetails = await Promise.all(
				linkedContracts.map(async (link) => {
					try {
						console.log(`📡 Fetching status for: ${link.contractId}`);
						const contractDetail = await apiClient.getContractStatus(link.contractId);
						console.log(`✅ Got details for ${link.contractId}:`, contractDetail);
						return { contractId: link.contractId, details: contractDetail };
					} catch (error) {
						console.error(`❌ Error fetching contract ${link.contractId}:`, error);
						const fallback = { id: link.contractId, status: 'unknown' };
						return { contractId: link.contractId, details: fallback };
					}
				})
			);

			// Update the object with all fetched details
			const newDetails: Record<string, any> = {};
			contractDetails.forEach(({ contractId, details }) => {
				newDetails[contractId] = details;
			});

			linkedContractDetails = newDetails;
			console.log('🎯 Updated linkedContractDetails:', linkedContractDetails);
		} catch (error: any) {
			console.error('Error fetching linked contract details:', error);
		}
	}

	function openLinkingModal() {
		if (!canLinkContracts || maxLinksReached) return;

		showLinkingModal = true;
		selectedContractId = '';
		linkReason = '';
		linkVisibility = 'private';
		errorMessage = '';
		successMessage = '';

		// Enable pointer events on modal container
		if (modalContainer) {
			modalContainer.style.pointerEvents = 'auto';
		}

		// Refresh available contracts
		fetchAvailableContracts();
	}

	function closeLinkingModal() {
		showLinkingModal = false;
		selectedContractId = '';
		linkReason = '';
		linkVisibility = 'private';
		errorMessage = '';
		successMessage = '';

		// Disable pointer events on modal container
		if (modalContainer) {
			modalContainer.style.pointerEvents = 'none';
		}
	}

	async function handleLinkContract() {
		if (!selectedContractId || !currentUser) return;

		isLinking = true;
		errorMessage = '';

		try {
			const linkData: any = {
				linkedContractId: selectedContractId,
				visibility: linkVisibility
			};

			// Only include reason if it's not empty
			if (linkReason.trim()) {
				linkData.reason = linkReason.trim();
			}

			const result = await apiClient.linkContract(contract.id, linkData);

			successMessage = result.message;

			// Update the contract with the new link
			const newLink: any = {
				contractId: selectedContractId,
				relationshipType: 'reference',
				visibility: linkVisibility,
				linkedAt: new Date().toISOString(),
				linkedBy: currentUser.id
			};

			// Only include reason if it's not empty
			if (linkReason.trim()) {
				newLink.reason = linkReason.trim();
			}

			contract = {
				...contract,
				linkedContracts: [...linkedContracts, newLink]
			};

			// Dispatch event to parent
			dispatch('contractLinked', {
				contractId: contract.id,
				linkedContractId: selectedContractId,
				visibility: linkVisibility
			});

			// Reset flag and refetch linked contract details to show the new link with proper status
			hasFetchedDetails = false;
			fetchLinkedContractDetails();

			// Close modal after a short delay
			setTimeout(() => {
				closeLinkingModal();
			}, 1500);
		} catch (error: any) {
			console.error('Error linking contract:', error);
			errorMessage = error.message || 'Failed to link contract.';
		} finally {
			isLinking = false;
		}
	}

	async function handleUnlinkContract(linkedContractId: string) {
		if (!currentUser) return;

		try {
			await apiClient.unlinkContract(contract.id, linkedContractId);

			// Update the contract by removing the link
			contract = {
				...contract,
				linkedContracts: linkedContracts.filter((link) => link.contractId !== linkedContractId)
			};

			// Dispatch event to parent
			dispatch('contractUnlinked', {
				contractId: contract.id,
				linkedContractId
			});
		} catch (error: any) {
			console.error('Error unlinking contract:', error);
			// You could add a toast notification here
		}
	}

	async function handleUpdateVisibility(
		linkedContractId: string,
		newVisibility: 'private' | 'shared'
	) {
		if (!currentUser) return;

		try {
			await apiClient.updateContractLinkVisibility(contract.id, linkedContractId, newVisibility);

			// Update the contract with new visibility
			contract = {
				...contract,
				linkedContracts: linkedContracts.map((link) =>
					link.contractId === linkedContractId ? { ...link, visibility: newVisibility } : link
				)
			};

			// Dispatch event to parent
			dispatch('linkVisibilityUpdated', {
				contractId: contract.id,
				linkedContractId,
				visibility: newVisibility
			});
		} catch (error: any) {
			console.error('Error updating link visibility:', error);
			// You could add a toast notification here
		}
	}

	function getContractDetails(contractId: string): any {
		return linkedContractDetails[contractId] || { id: contractId, status: 'unknown' };
	}

	function getContractDisplayName(contract: any): string {
		// Try to get meaningful contract information
		if (contract.workRequestId || contract.materialRequestId) {
			// If we have request info, use that
			const requestType = contract.workRequestId ? 'Work' : 'Material';
			const requestId = contract.workRequestId || contract.materialRequestId;
			const status = contract.status?.replace(/_/g, ' ') || 'unknown';
			return `${requestType} Contract (${requestId.substring(0, 8)}...) - ${status}`;
		}

		// Fallback to contract ID with status
		const status = contract.status?.replace(/_/g, ' ') || 'unknown';
		return `Contract ${contract.id.substring(0, 8)}... - ${status}`;
	}

	function getVisibilityIcon(visibility: 'private' | 'shared'): string {
		if (visibility === 'private') {
			return 'lock';
		} else {
			return 'eye';
		}
	}

	function getVisibilityLabel(visibility: 'private' | 'shared'): string {
		return visibility === 'private' ? 'Private' : 'Shared';
	}

	function getVisibilityClasses(visibility: 'private' | 'shared'): string {
		return visibility === 'private'
			? 'bg-slate-600/20 text-slate-400 border border-slate-500/30'
			: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
	}

	// Portal action
	function portal(node: HTMLElement, container: HTMLElement) {
		container.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<div class="flex-shrink-0 rounded-lg bg-purple-500/20 p-2">
				<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
					/>
				</svg>
			</div>
			<div class="min-w-0">
				<h3 class="text-lg font-bold text-purple-300">Linked Contracts</h3>
				<p class="text-sm text-slate-400">
					{linkedContracts.length} of 10 links used
				</p>
			</div>
		</div>

		<div class="flex-shrink-0">
			{#if canLinkContracts && !maxLinksReached}
				<button
					on:click={openLinkingModal}
					class="flex w-full items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/30 sm:w-auto"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					<span class="hidden sm:inline">Link Contract</span>
					<span class="sm:hidden">Link</span>
				</button>
			{:else if maxLinksReached}
				<span class="text-sm text-slate-500">Maximum links reached</span>
			{:else}
				<span class="text-sm text-slate-500">Cannot link in current status</span>
			{/if}
		</div>
	</div>

	<!-- Linked Contracts List -->
	{#if linkedContracts.length > 0}
		<div class="space-y-3">
			{#each linkedContracts as link (link.contractId)}
				<div class="rounded-lg border border-slate-600/30 bg-slate-700/50 p-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<!-- Contract Info -->
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 rounded-full bg-slate-600/50 p-2">
								<svg
									class="h-4 w-4 text-slate-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-medium break-words text-slate-200">
									{getContractDisplayName(
										linkedContractDetails[link.contractId] || {
											id: link.contractId,
											status: 'unknown'
										}
									)}
								</p>
								{#if link.reason}
									<p class="mt-1 text-sm break-words text-slate-400">{link.reason}</p>
								{/if}
							</div>
						</div>

						<!-- Visibility Badge and Actions -->
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
							<!-- Visibility Badge -->
							<div class="flex items-center gap-2">
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium {getVisibilityClasses(
										link.visibility
									)}"
								>
									{#if link.visibility === 'private'}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
											<path d="M7 11V7a5 5 0 0 1 10 0v4" />
										</svg>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
											/>
											<circle cx="12" cy="12" r="3" />
										</svg>
									{/if}
									{getVisibilityLabel(link.visibility)}
								</span>
							</div>

							<!-- Actions -->
							<div class="flex flex-wrap gap-2">
								<!-- View Contract -->
								<a
									href="/contracts/{link.contractId}"
									class="flex items-center gap-1 rounded-lg bg-slate-600/50 px-3 py-1.5 text-xs whitespace-nowrap text-slate-300 transition-colors hover:bg-slate-500/50"
									aria-label="View linked contract"
								>
									<svg
										class="h-3 w-3 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										/>
									</svg>
									<span class="hidden sm:inline">View</span>
								</a>

								<!-- Toggle Visibility Button -->
								<button
									on:click={() =>
										handleUpdateVisibility(
											link.contractId,
											link.visibility === 'private' ? 'shared' : 'private'
										)}
									class="flex items-center gap-1 rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs whitespace-nowrap text-blue-300 transition-colors hover:bg-blue-500/30"
									aria-label="Toggle visibility"
								>
									{#if link.visibility === 'private'}
										<svg
											class="h-3 w-3 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										<span class="hidden sm:inline">Make Shared</span>
										<span class="sm:hidden">Share</span>
									{:else}
										<svg
											class="h-3 w-3 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
											/>
										</svg>
										<span class="hidden sm:inline">Make Private</span>
										<span class="sm:hidden">Private</span>
									{/if}
								</button>

								<!-- Unlink Button -->
								<button
									on:click={() => handleUnlinkContract(link.contractId)}
									class="flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs whitespace-nowrap text-red-300 transition-colors hover:bg-red-500/30"
									aria-label="Unlink contract"
								>
									<svg
										class="h-3 w-3 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									<span class="hidden sm:inline">Unlink</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-slate-600/30 bg-slate-700/30 p-6 text-center">
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-600/50"
			>
				<svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
					/>
				</svg>
			</div>
			<h4 class="mb-2 text-lg font-medium text-slate-300">No Linked Contracts</h4>
			<p class="text-sm text-slate-400">
				{#if canLinkContracts}
					Link this contract to other contracts for easy reference.
				{:else}
					Contracts can only be linked when in draft, awaiting signatures, or revision requested
					status.
				{/if}
			</p>
		</div>
	{/if}
</div>

<!-- Linking Modal Portal -->
{#if showLinkingModal && modalContainer}
	<div
		class="contract-linking-modal fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
		on:click|self={closeLinkingModal}
		on:keydown|self={(e) => e.key === 'Escape' && closeLinkingModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="linking-modal-title"
		tabindex="-1"
		use:portal={modalContainer}
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-slate-600/30 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-sm"
		>
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h3 id="linking-modal-title" class="text-xl font-bold text-slate-200">Link Contract</h3>
					<p class="text-sm text-slate-400">Create a reference link to another contract</p>
				</div>
				<button
					on:click={closeLinkingModal}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
					aria-label="Close modal"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{#if errorMessage}
				<div
					class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
				>
					{errorMessage}
				</div>
			{/if}

			{#if successMessage}
				<div
					class="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300"
				>
					{successMessage}
				</div>
			{/if}

			<form on:submit|preventDefault={handleLinkContract} class="space-y-4">
				<!-- Contract Selection -->
				<div>
					<label for="contract-select" class="mb-2 block text-sm font-medium text-slate-400">
						Select Contract to Link
					</label>
					{#if isLoading}
						<div class="flex items-center justify-center py-8">
							<svg class="h-6 w-6 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
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
							<span class="ml-2 text-slate-400">Loading contracts...</span>
						</div>
					{:else if availableContracts.length === 0}
						<div class="rounded-lg border border-slate-600/30 bg-slate-700/30 p-4 text-center">
							<p class="text-slate-400">No available contracts to link</p>
						</div>
					{:else}
						<select
							id="contract-select"
							bind:value={selectedContractId}
							required
							class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
						>
							<option value="">Choose a contract...</option>
							{#each availableContracts as availableContract}
								<option value={availableContract.id}>
									{getContractDisplayName(availableContract)}
								</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- Link Reason -->
				<div>
					<label for="link-reason" class="mb-2 block text-sm font-medium text-slate-400">
						Reason for Linking (Optional)
					</label>
					<textarea
						id="link-reason"
						bind:value={linkReason}
						placeholder="Explain why these contracts are linked..."
						rows="3"
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
					></textarea>
				</div>

				<!-- Visibility Setting -->
				<div>
					<fieldset>
						<legend class="mb-2 block text-sm font-medium text-slate-400">Visibility</legend>
						<div class="space-y-2">
							<div class="flex items-center gap-3">
								<input
									id="visibility-private"
									type="radio"
									bind:group={linkVisibility}
									value="private"
									class="text-purple-500 focus:ring-purple-500"
								/>
								<label for="visibility-private" class="flex cursor-pointer items-center gap-2">
									<svg
										class="h-5 w-5 text-slate-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
									<div>
										<p class="text-sm font-medium text-slate-300">Private</p>
										<p class="text-xs text-slate-400">Only you can see this link</p>
									</div>
								</label>
							</div>
							<div class="flex items-center gap-3">
								<input
									id="visibility-shared"
									type="radio"
									bind:group={linkVisibility}
									value="shared"
									class="text-purple-500 focus:ring-purple-500"
								/>
								<label for="visibility-shared" class="flex cursor-pointer items-center gap-2">
									<svg
										class="h-5 w-5 text-slate-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
										/>
										<circle cx="12" cy="12" r="3" />
									</svg>
									<div>
										<p class="text-sm font-medium text-slate-300">Shared</p>
										<p class="text-xs text-slate-400">Both parties can see this link</p>
									</div>
								</label>
							</div>
						</div>
					</fieldset>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={closeLinkingModal}
						class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!selectedContractId || isLinking}
						class="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-slate-500"
					>
						{isLinking ? 'Linking...' : 'Link Contract'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Ensure modal is rendered at top level */
	:global(.contract-linking-modal) {
		position: fixed !important;
		z-index: 9999 !important;
		top: 0 !important;
		left: 0 !important;
		right: 0 !important;
		bottom: 0 !important;
	}
</style>
