<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	// Define UserProfile, similar to other pages, ensure it matches backend structure
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			// Profile is optional itself
			fullName?: string;
			companyName?: string;
			expertise?: string;
			category?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	// Define WorkRequestInfo for fetching title
	type WorkRequestInfo = {
		id: string;
		title: string;
		// Add other fields if needed for display later
	};

	type ContractStatus =
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled';

	// Updated structure based on backend Contract interface
	type Contract = {
		id: string;
		workRequestId: string;
		customerId: string;
		expertSupplierId: string;
		workDetails: string; // Will be part of the title or description here
		agreementSummary: string;
		contractDate: string; // ISO Date string
		customerSigned: boolean;
		expertSupplierSigned: boolean;
		status: ContractStatus;
		createdAt: string;
		updatedAt: string;
		// For display purposes, we'll need to fetch and add these:
		title?: string; // Derived or fetched (e.g., from work request)
		otherPartyName?: string; // Fetched based on customerId/expertSupplierId
		workRequestTitle?: string; // Fetched from work request by workRequestId
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let contracts: Contract[] = [];
	let isLoading = true;
	let errorMessage = '';

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchContracts() {
		isLoading = true;
		errorMessage = '';
		if (!currentUser || !token) {
			errorMessage = 'User not authenticated. Cannot load contracts.';
			isLoading = false;
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch contracts: ${response.statusText}`);
			}
			const rawContracts: Contract[] = await response.json();

			// Enrich contract data (fetch related info like work request title, other party name)
			const enrichedContracts = await Promise.all(
				rawContracts.map(async (contract) => {
					let otherPartyName = 'Unknown Party';
					let displayTitle = contract.workDetails.substring(0, 50) + '...'; // Default title from workDetails

					const otherPartyId =
						contract.customerId === currentUser?.id
							? contract.expertSupplierId
							: contract.customerId;
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
						} else {
							console.warn(
								`Failed to fetch profile for user ${otherPartyId}: ${userRes.statusText}`
							);
							otherPartyName = `Party ID: ${otherPartyId.substring(0, 8)}...`;
						}
					} catch (e) {
						console.error(
							`Error fetching name for other party ${otherPartyId} in contract ${contract.id}:`,
							e
						);
						otherPartyName = `Party ID ${otherPartyId.substring(0, 8)}... (Error fetching)`;
					}

					if (contract.workRequestId) {
						try {
							const wrRes = await fetch(
								`${API_BASE_URL}/api/work-requests/${contract.workRequestId}`,
								{
									headers: { Authorization: `Bearer ${token}` }
								}
							);
							if (wrRes.ok) {
								const wrData: WorkRequestInfo = await wrRes.json();
								displayTitle = wrData.title || displayTitle; // Use fetched title if available
							} else {
								console.warn(
									`Failed to fetch work request ${contract.workRequestId} title: ${wrRes.statusText}`
								);
							}
						} catch (e) {
							console.error(`Error fetching title for work request ${contract.workRequestId}:`, e);
						}
					}

					return {
						...contract,
						title: displayTitle,
						otherPartyName: otherPartyName,
						workRequestTitle: displayTitle // Keep this for consistency if used elsewhere, though 'title' is primary
					};
				})
			);

			contracts = enrichedContracts.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} catch (err: any) {
			console.error('Contracts fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading contracts.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe((auth) => {
			if (auth.user && auth.token && !auth.isLoading) {
				currentUser = auth.user;
				token = auth.token;
				fetchContracts();
			} else if (!auth.isLoading && !auth.user) {
				errorMessage = 'User not authenticated.';
				isLoading = false;
			}
		});

		return () => {
			unsubscribe();
		};
	});

	function getStatusClasses(status: ContractStatus): string {
		switch (status) {
			case 'draft':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
			case 'awaiting_signatures':
				return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
			case 'signed':
				return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
			case 'in_progress':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
			case 'completed':
				return 'bg-green-600/30 text-green-300 border-green-600/60';
			case 'disputed':
				return 'bg-red-500/20 text-red-300 border-red-500/50';
			case 'cancelled':
				return 'bg-slate-600/30 text-slate-400 border-slate-500/50';
			default:
				return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
		}
	}
</script>

<div class="space-y-6">
	<header class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
		<h1 class="text-3xl font-bold text-emerald-400">My Contracts</h1>
		<!-- TODO: Button to initiate contract creation if applicable from this page -->
		<!-- <button class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md text-sm">Create New Contract</button> -->
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-8 w-8 animate-spin text-emerald-500"
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
			<p class="text-slate-300">Loading your contracts...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300 shadow">
			<h3 class="text-lg font-bold">Error Loading Contracts</h3>
			<p>{errorMessage}</p>
			<button
				class="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
				on:click={fetchContracts}>Try Again</button
			>
		</div>
	{:else if contracts.length === 0}
		<div class="rounded-xl bg-slate-700/50 p-6 text-center shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-4 h-16 w-16 text-slate-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
			<h2 class="mb-2 text-xl font-semibold text-sky-400">No Contracts Found</h2>
			<p class="text-slate-300">You currently have no contracts on record.</p>
		</div>
	{:else}
		<div class="space-y-4 rounded-lg bg-slate-700/40 p-3 shadow-md sm:p-4">
			{#each contracts as contract (contract.id)}
				<a
					href={`/contracts/${contract.id}`}
					class="focus:ring-opacity-75 block rounded-lg bg-slate-600/70 p-4 shadow-sm transition-all duration-150 ease-in-out hover:bg-slate-500/70 hover:shadow-md focus:ring-2 focus:ring-emerald-500 focus:outline-none sm:p-5"
					aria-label="View contract details for {contract.title || 'Contract'}"
				>
					<div class="mb-2 flex flex-col justify-between sm:flex-row sm:items-center">
						<h3
							class="mb-1.5 truncate pr-2 text-lg font-semibold text-sky-300 transition-colors hover:text-sky-200 sm:mb-0"
							title={contract.title || contract.workDetails}
						>
							{contract.title ||
								'Contract Regarding Work ID: ' + contract.workRequestId.substring(0, 8)}
						</h3>
						<span
							class="rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap {getStatusClasses(
								contract.status
							)} shadow-sm"
						>
							{contract.status.replace(/_/g, ' ').toUpperCase()}
						</span>
					</div>
					<div class="mt-1 space-y-1 text-sm text-slate-400">
						<p>
							With: <span class="font-medium text-slate-200"
								>{contract.otherPartyName || 'N/A'}</span
							>
						</p>
						<p>
							Date: <span class="font-medium text-slate-300"
								>{new Date(contract.contractDate).toLocaleDateString('en-GB', {
									day: '2-digit',
									month: 'short',
									year: 'numeric'
								})}</span
							>
						</p>
						{#if contract.workRequestId}
							<p>
								Related Work: <span
									class="font-medium text-amber-300 hover:underline"
									on:click|stopPropagation={() => goto(`/work-requests/${contract.workRequestId}`)}
									>#{contract.workRequestId.substring(0, 12)}...</span
								>
							</p>
						{/if}
					</div>
					<div class="mt-4 text-right">
						<span
							class="text-sm font-medium text-emerald-400 group-hover:underline hover:text-emerald-300"
							>View Details &rarr;</span
						>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<!--
  TODO:
  - Fetch actual otherPartyName and workRequestTitle (requires API for user details and work request details by ID).
  - Implement "Create New Contract" flow (likely initiated from a work request detail page).
  - Add filtering and sorting options.
-->

<style lang="postcss">
	/* Add any page-specific styles here if needed */
</style>
