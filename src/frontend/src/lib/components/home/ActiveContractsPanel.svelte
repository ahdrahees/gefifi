<script lang="ts">
	import { API_BASE_URL } from '$lib/config';
	import { authStore } from '$lib/stores/auth';
	import type { Contract, ContractStatus } from '$lib/types';

	export let activeContracts: Contract[] = [];

	// Enhanced contract type for display
	type EnhancedContract = Contract & {
		title?: string;
		otherPartyName?: string;
	};

	let enhancedContracts: EnhancedContract[] = [];
	let isEnriching = false;

	// Get current user and token
	let token: string | null = null;
	let currentUserId: string | null = null;
	authStore.subscribe((auth) => {
		token = auth.token;
		currentUserId = auth.user?.id || null;
	});

	// Define UserProfile type
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			fullName?: string;
			companyName?: string;
			expertise?: string;
			category?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	type RequestInfo = {
		id: string;
		title: string;
	};

	// Enrich contracts with additional info
	async function enrichContracts(contracts: Contract[]) {
		if (!token || !currentUserId || contracts.length === 0) {
			enhancedContracts = contracts;
			return;
		}

		isEnriching = true;
		try {
			const enriched = await Promise.all(
				contracts.map(async (contract) => {
					let otherPartyName = 'Unknown Party';
					let displayTitle = contract.workDetails?.substring(0, 40) + '...' || 'Contract';

					// Get other party name
					const otherPartyId =
						contract.customerId === currentUserId ? contract.expertSupplierId : contract.customerId;

					try {
						const userRes = await fetch(`${API_BASE_URL}/api/users/${otherPartyId}`, {
							headers: { Authorization: `Bearer ${token}` }
						});
						if (userRes.ok) {
							const userData: UserProfile = await userRes.json();
							if (userData.userType === 'supplier' && userData.profile?.companyName) {
								otherPartyName = userData.profile.companyName;
							} else if (userData.profile?.fullName) {
								otherPartyName = userData.profile.fullName;
							} else {
								otherPartyName =
									userData.email?.split('@')[0] || `User ${otherPartyId.substring(0, 8)}`;
							}
						}
					} catch (e) {
						console.warn(`Failed to fetch user ${otherPartyId}:`, e);
					}

					// Get request title
					if (contract.workRequestId) {
						try {
							const wrRes = await fetch(
								`${API_BASE_URL}/api/work-requests/${contract.workRequestId}`,
								{
									headers: { Authorization: `Bearer ${token}` }
								}
							);
							if (wrRes.ok) {
								const wrData: RequestInfo = await wrRes.json();
								displayTitle = wrData.title || displayTitle;
							}
						} catch (e) {
							console.warn(`Failed to fetch work request ${contract.workRequestId}:`, e);
						}
					} else if (contract.materialRequestId) {
						try {
							const mrRes = await fetch(
								`${API_BASE_URL}/api/material-requests/${contract.materialRequestId}`,
								{
									headers: { Authorization: `Bearer ${token}` }
								}
							);
							if (mrRes.ok) {
								const mrData: RequestInfo = await mrRes.json();
								displayTitle = mrData.title || displayTitle;
							}
						} catch (e) {
							console.warn(`Failed to fetch material request ${contract.materialRequestId}:`, e);
						}
					}

					return {
						...contract,
						title: displayTitle,
						otherPartyName: otherPartyName
					};
				})
			);

			enhancedContracts = enriched;
		} catch (error) {
			console.error('Error enriching contracts:', error);
			enhancedContracts = contracts;
		} finally {
			isEnriching = false;
		}
	}

	// Watch for changes in activeContracts
	$: if (activeContracts.length > 0) {
		enrichContracts(activeContracts);
	} else {
		enhancedContracts = [];
	}

	function getStatusClasses(status: ContractStatus): string {
		const classes: Record<string, string> = {
			draft: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
			awaiting_signatures: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
			signed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
			in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			completed: 'bg-green-600/30 text-green-300 border-green-600/60',
			disputed: 'bg-red-500/20 text-red-300 border-red-500/50',
			cancelled: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
			terminated: 'bg-orange-600/30 text-orange-300 border-orange-500/50'
		};
		return classes[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/50';
	}

	function formatCurrency(amount?: number) {
		if (!amount && amount !== 0) return null;
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			notation: 'compact',
			maximumFractionDigits: 1
		}).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short'
		});
	}

	function getContractTypeIcon(contractType: string) {
		return contractType === 'expert_contract'
			? 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' // user icon
			: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'; // package icon
	}

	function truncateText(text: string, maxLength: number) {
		if (!text) return '';
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}
</script>

<section class="flex h-full flex-1 flex-col rounded-lg bg-slate-700/40 p-5 shadow-md">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-sky-400">Active Contracts ({activeContracts.length})</h2>
		<a
			href="/contracts"
			class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-200"
		>
			<span>View all</span>
			<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>

	{#if isEnriching}
		<div class="flex items-center justify-center py-8">
			<div class="flex items-center gap-2 text-slate-400">
				<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				<span class="text-sm">Loading details...</span>
			</div>
		</div>
	{:else if enhancedContracts.length > 0}
		<div
			class="scrollable-content flex-grow space-y-3 overflow-y-auto pr-1"
			style="max-height: 23rem;"
		>
			{#each enhancedContracts as contract (contract.id)}
				<a
					href={`/contracts/${contract.id}`}
					class="group block rounded-xl border border-slate-600/40 bg-slate-700/40 p-3 transition-all hover:bg-slate-600/40"
					title="View contract details"
				>
					<div class="space-y-2">
						<!-- Header with title and status -->
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<h3
									class="truncate text-sm font-semibold text-emerald-300 group-hover:text-emerald-200"
								>
									{contract.title || 'Contract'}
								</h3>
								<div class="mt-1 flex items-center gap-2">
									<div class="flex items-center gap-1">
										<svg
											class="h-3 w-3 text-slate-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d={getContractTypeIcon(contract.contractType)}
											/>
										</svg>
										<span class="text-xs text-slate-400">
											{contract.otherPartyName
												? truncateText(contract.otherPartyName, 20)
												: 'Loading...'}
										</span>
									</div>
								</div>
							</div>
							<span
								class="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium {getStatusClasses(
									contract.status
								)}"
							>
								{contract.status.replace(/_/g, ' ').toUpperCase()}
							</span>
						</div>

						<!-- Details row -->
						<div class="flex items-center justify-between text-xs text-slate-400">
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1">
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
									<span>{formatDate(contract.contractDate)}</span>
								</div>
								{#if contract.totalAmount}
									<div class="flex items-center gap-1">
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
											/>
										</svg>
										<span class="font-medium text-emerald-400"
											>{formatCurrency(contract.totalAmount)}</span
										>
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-emerald-400">
								<span class="text-[10px]">View</span>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="flex flex-1 flex-col justify-center space-y-4 py-6 text-center">
			<div class="mx-auto mb-2 w-fit rounded-full bg-slate-600/50 p-3">
				<svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<div class="space-y-2">
				<p class="text-sm font-medium text-slate-300">No active contracts yet</p>
				<p class="px-2 text-xs leading-relaxed text-slate-400">
					Contracts will appear here once you start collaborating with experts and suppliers
				</p>
			</div>

			<!-- Quick stats or tips -->
			<div class="mt-4 space-y-3">
				<div class="rounded-lg border border-slate-600/30 bg-slate-600/20 p-3">
					<div class="mb-1 flex items-center gap-2">
						<svg
							class="h-4 w-4 text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span class="text-xs font-medium text-emerald-300">Quick Tip</span>
					</div>
					<p class="text-xs leading-relaxed text-slate-300">
						Create requests to find experts and suppliers, then formalize agreements with contracts
					</p>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs">
					<div class="rounded-md bg-slate-700/40 p-2 text-center">
						<div class="font-medium text-slate-300">Next Step</div>
						<div class="text-slate-400">Post a request</div>
					</div>
					<div class="rounded-md bg-slate-700/40 p-2 text-center">
						<div class="font-medium text-slate-300">Then</div>
						<div class="text-slate-400">Create contracts</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 4px;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.6),
			rgba(5, 150, 105, 0.8)
		); /* emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		transition: all 0.2s ease;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 1));
		border-color: rgba(16, 185, 129, 0.4);
		transform: scale(1.1);
	}
	.scrollable-content::-webkit-scrollbar-corner {
		background: transparent;
	}
	/* Firefox */
	.scrollable-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
		color-scheme: dark;
	}
</style>
