<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import type { Contract, ContractStatus } from '$lib/types';

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

	// Define RequestInfo for fetching title
	type RequestInfo = {
		id: string;
		title: string;
	};

	// Enhanced contract type for display
	type EnhancedContract = Contract & {
		// For display purposes, we'll need to fetch and add these:
		title?: string; // Derived or fetched (e.g., from work request)
		otherPartyName?: string; // Fetched based on customerId/expertSupplierId
		requestTitle?: string; // Fetched from request by requestId
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let allContracts: EnhancedContract[] = [];
	let filteredContracts: EnhancedContract[] = [];
	let isLoading = true;
	let errorMessage = '';

	// Filter and search state
	let searchQuery = '';
	let statusFilter = 'all';
	let contractTypeFilter = 'all';
	let sortBy = 'newest';

	// Available filter options
	const statusOptions = [
		{ value: 'all', label: 'All Statuses' },
		{ value: 'draft', label: 'Draft' },
		{ value: 'awaiting_signatures', label: 'Awaiting Signatures' },
		{ value: 'signed', label: 'Signed' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'disputed', label: 'Disputed' },
		{ value: 'cancelled', label: 'Cancelled' },
		{ value: 'terminated', label: 'Terminated' }
	];

	const contractTypeOptions = [
		{ value: 'all', label: 'All Types' },
		{ value: 'expert_contract', label: 'Expert Contracts' },
		{ value: 'material_contract', label: 'Material Contracts' }
	];

	const sortOptions = [
		{ value: 'newest', label: 'Newest First' },
		{ value: 'oldest', label: 'Oldest First' },
		{ value: 'status', label: 'By Status' },
		{ value: 'amount', label: 'By Amount' }
	];

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
			const rawContracts: EnhancedContract[] = await response.json();

			// Enrich contract data (fetch related info like request title, other party name)
			const enrichedContracts = await Promise.all(
				rawContracts.map(async (contract) => {
					let otherPartyName = 'Unknown Party';
					let displayTitle = contract.workDetails?.substring(0, 50) + '...' || 'Contract'; // Default title from workDetails

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

					// Fetch request title based on work or material request
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
							} else {
								console.warn(
									`Failed to fetch work request ${contract.workRequestId} title: ${wrRes.statusText}`
								);
							}
						} catch (e) {
							console.error(`Error fetching title for work request ${contract.workRequestId}:`, e);
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
							} else {
								console.warn(
									`Failed to fetch material request ${contract.materialRequestId} title: ${mrRes.statusText}`
								);
							}
						} catch (e) {
							console.error(
								`Error fetching title for material request ${contract.materialRequestId}:`,
								e
							);
						}
					}

					return {
						...contract,
						title: displayTitle,
						otherPartyName: otherPartyName,
						requestTitle: displayTitle // Keep this for consistency if used elsewhere
					};
				})
			);

			allContracts = enrichedContracts;
		} catch (err: any) {
			console.error('Contracts fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading contracts.';
		} finally {
			isLoading = false;
		}
	}

	function clearFilters() {
		searchQuery = '';
		statusFilter = 'all';
		contractTypeFilter = 'all';
		sortBy = 'newest';
		// No need to call applyFilters() - reactive statement will handle it
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
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function getContractTypeLabel(contractType: string) {
		return contractType === 'expert_contract' ? 'Expert' : 'Material';
	}

	// Reactive statements for filtering - explicitly watch all filter variables
	$: filteredContracts = applyFiltersAndReturn(
		allContracts,
		searchQuery,
		statusFilter,
		contractTypeFilter,
		sortBy
	);

	function applyFiltersAndReturn(
		contracts: EnhancedContract[],
		search: string,
		status: string,
		type: string,
		sort: string
	) {
		let filtered = [...contracts];

		// Apply search filter
		if (search.trim()) {
			const query = search.toLowerCase();
			filtered = filtered.filter(
				(contract) =>
					contract.title?.toLowerCase().includes(query) ||
					contract.otherPartyName?.toLowerCase().includes(query) ||
					contract.agreementSummary?.toLowerCase().includes(query) ||
					contract.workDetails?.toLowerCase().includes(query) ||
					contract.id.toLowerCase().includes(query)
			);
		}

		// Apply status filter
		if (status !== 'all') {
			filtered = filtered.filter((contract) => contract.status === status);
		}

		// Apply contract type filter
		if (type !== 'all') {
			filtered = filtered.filter((contract) => contract.contractType === type);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			switch (sort) {
				case 'oldest':
					return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				case 'status':
					return a.status.localeCompare(b.status);
				case 'amount':
					const amountA = a.totalAmount || 0;
					const amountB = b.totalAmount || 0;
					return amountB - amountA; // Highest first
				case 'newest':
				default:
					return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		});

		return filtered;
	}

	// Stats for display
	$: totalContracts = allContracts.length;
	$: activeContracts = allContracts.filter((c) =>
		['signed', 'in_progress'].includes(c.status)
	).length;
	$: completedContracts = allContracts.filter((c) => c.status === 'completed').length;
	$: totalValue = allContracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
</script>

<svelte:head>
	<title>My Contracts - GEFIFI</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header Section -->
	<header
		class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
	>
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<div class="mb-3 flex items-center gap-3">
					<span class="rounded-xl bg-emerald-500/20 p-2">
						<svg
							class="h-6 w-6 text-emerald-400"
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
					</span>
					<h1 class="text-3xl font-bold text-emerald-400">My Contracts</h1>
				</div>
				<p class="text-slate-400">Manage your agreements and project contracts</p>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4 text-center">
					<p class="text-2xl font-bold text-emerald-400">{totalContracts}</p>
					<p class="text-xs text-slate-400">Total</p>
				</div>
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4 text-center">
					<p class="text-2xl font-bold text-blue-400">{activeContracts}</p>
					<p class="text-xs text-slate-400">Active</p>
				</div>
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4 text-center">
					<p class="text-2xl font-bold text-green-400">{completedContracts}</p>
					<p class="text-xs text-slate-400">Completed</p>
				</div>
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4 text-center">
					<p class="text-lg font-bold text-amber-400">{formatCurrency(totalValue) || '₹0'}</p>
					<p class="text-xs text-slate-400">Total Value</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Search and Filters Section -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="space-y-4">
			<!-- Search Bar -->
			<div class="relative">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
					<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search contracts by title, party name, or description..."
					class="w-full rounded-xl border border-slate-600/50 bg-slate-700/50 py-3 pr-4 pl-12 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				/>
				{#if searchQuery}
					<button
						on:click={() => {
							searchQuery = '';
						}}
						class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-200"
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
				{/if}
			</div>

			<!-- Filter Row -->
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex flex-col gap-4 sm:flex-row">
					<!-- Status Filter -->
					<div class="flex flex-col">
						<label class="mb-2 text-sm font-medium text-slate-300">Status</label>
						<select
							bind:value={statusFilter}
							class="rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<!-- Contract Type Filter -->
					<div class="flex flex-col">
						<label class="mb-2 text-sm font-medium text-slate-300">Type</label>
						<select
							bind:value={contractTypeFilter}
							class="rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						>
							{#each contractTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<!-- Sort Filter -->
					<div class="flex flex-col">
						<label class="mb-2 text-sm font-medium text-slate-300">Sort by</label>
						<select
							bind:value={sortBy}
							class="rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						>
							{#each sortOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Clear Filters Button -->
				<div class="flex items-end">
					<button
						on:click={clearFilters}
						class="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-500"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Clear Filters
					</button>
				</div>
			</div>

			<!-- Results Count -->
			<div class="flex items-center justify-between text-sm text-slate-400">
				<span>
					Showing {filteredContracts.length} of {totalContracts} contracts
				</span>
				{#if searchQuery || statusFilter !== 'all' || contractTypeFilter !== 'all' || sortBy !== 'newest'}
					<span class="text-amber-400">Filters applied</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- Contracts List -->
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
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
				<p class="text-slate-300">Loading your contracts...</p>
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
			<h3 class="mb-3 text-xl font-bold text-red-300">Error Loading Contracts</h3>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				class="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
				on:click={fetchContracts}
			>
				Try Again
			</button>
		</div>
	{:else if filteredContracts.length === 0}
		<div class="rounded-2xl bg-slate-700/50 p-8 text-center shadow-xl backdrop-blur-sm">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-600/50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-8 w-8 text-slate-400"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
			</div>
			<h2 class="mb-3 text-xl font-bold text-sky-400">
				{totalContracts === 0 ? 'No Contracts Found' : 'No Matching Contracts'}
			</h2>
			<p class="text-slate-300">
				{#if totalContracts === 0}
					You currently have no contracts on record.
				{:else}
					No contracts match your current search and filter criteria.
				{/if}
			</p>
			{#if totalContracts > 0}
				<button
					on:click={clearFilters}
					class="mt-4 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
				>
					Clear Filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredContracts as contract (contract.id)}
				<a
					href={`/contracts/${contract.id}`}
					class="block rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-slate-700/50 hover:shadow-2xl focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
				>
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<!-- Left: Main Info -->
						<div class="flex-1 space-y-3">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
								<h3 class="text-lg font-bold text-sky-300 transition-colors hover:text-sky-200">
									{contract.title || 'Contract'}
								</h3>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="rounded-full border px-3 py-1 text-xs font-semibold {getStatusClasses(
											contract.status
										)}"
									>
										{contract.status.replace(/_/g, ' ').toUpperCase()}
									</span>
									<span
										class="rounded-full border border-slate-500/50 bg-slate-600/50 px-3 py-1 text-xs font-medium text-slate-300"
									>
										{getContractTypeLabel(contract.contractType)}
									</span>
								</div>
							</div>

							<div class="grid gap-2 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
								<div class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-slate-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
									<span class="font-medium text-slate-300"
										>{contract.otherPartyName || 'Unknown'}</span
									>
								</div>
								<div class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-slate-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
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
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-slate-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
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

							{#if contract.agreementSummary}
								<p class="line-clamp-2 text-sm text-slate-300">
									{contract.agreementSummary}
								</p>
							{/if}
						</div>

						<!-- Right: Action -->
						<div class="flex items-center gap-4">
							<!-- Related Request Link -->
							{#if contract.workRequestId || contract.materialRequestId}
								<a
									href={contract.workRequestId
										? `/work-requests/${contract.workRequestId}`
										: `/material-requests/${contract.materialRequestId}`}
									on:click|stopPropagation
									class="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/30"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
									<span class="hidden sm:inline">Request</span>
								</a>
							{/if}

							<div class="flex items-center gap-2 text-emerald-400">
								<span class="text-sm font-medium">View Details</span>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
	{/if}
</div>

<style lang="postcss">
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
