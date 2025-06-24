<!-- gefifi-2/src/frontend/src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/types';
	import { page } from '$app/stores'; // For query params or path if needed later
	import { goto } from '$app/navigation';
	import { API_BASE_URL } from '$lib/config'; // Assuming you have a config file for API base

	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			fullName?: string;
			companyName?: string;
			mainExpertise?: string;
			mainMaterial?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	// Assuming icons are still managed in the main layout or a global store if needed here
	// For simplicity, using text labels for now or simple placeholders

	let currentUser: AuthUser | null = null;
	let workRequests: any[] = [];
	let recentChats: any[] = [];
	let activeContracts: any[] = [];
	let isLoading = true;
	let errorMessage = '';
	let fetchedUserProfiles = new Map<string, UserProfile>();

	// Get token for API calls
	let token: string | null = null;
	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;

		// Check if profile needs completion
		if (currentUser && currentUser.profileCompleted === false) {
			goto('/auth/complete-profile');
		}
	});

	function trimString(str: string | undefined | null, maxLength: number): string {
		if (!str) return '';
		if (str.length <= maxLength) return str;
		return str.substring(0, maxLength) + '...';
	}

	function formatDisplayName(otherUser: UserProfile | undefined): string {
		if (!otherUser) {
			return 'Unknown User';
		}

		const idSuffix = otherUser.id ? `${otherUser.id.substring(0, 8)}...` : 'ID';
		const userType = otherUser.userType; // userType is always available if otherUser exists

		// If profile data is missing, handle display based on userType and ID
		if (!otherUser.profile) {
			switch (userType) {
				case 'customer':
					return `Customer - ${idSuffix}`;
				case 'expert':
					return `Expert - ${idSuffix}`;
				case 'supplier':
					return `Supplier - ${idSuffix}`;
				default:
					// For 'admin' or other types without a profile, use capitalized type and ID
					const typePrefixDefaultNoProfile = userType.charAt(0).toUpperCase() + userType.slice(1);
					return `${typePrefixDefaultNoProfile} - ${idSuffix}`;
			}
		}

		// Profile exists, try to use names from it
		const { fullName, companyName } = otherUser.profile;

		switch (userType) {
			case 'customer':
				// Prefer fullName for customers, prefixed with "Customer"
				return `Customer - ${fullName || idSuffix}`;
			case 'expert':
				// Prefer fullName for experts, prefixed with "Expert"
				return `Expert - ${fullName || idSuffix}`;
			case 'supplier':
				// Prefer companyName for suppliers, prefixed with "Supplier"
				return `Supplier - ${companyName || idSuffix}`;
			default:
				// For other types like 'admin', prefix with capitalized userType
				const typePrefixDefaultWithProfile = userType.charAt(0).toUpperCase() + userType.slice(1);
				if (fullName) return `${typePrefixDefaultWithProfile} - ${fullName}`;
				if (companyName) return `${typePrefixDefaultWithProfile} - ${companyName}`; // e.g., an Admin might have a company or department name
				return `${typePrefixDefaultWithProfile} - ${idSuffix}`;
		}
	}

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		if (!currentUser || !token) {
			// Should not happen due to layout protection, but good practice
			errorMessage = 'User not authenticated. Cannot load dashboard data.';
			isLoading = false;
			return;
		}

		try {
			const headers = {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			};

			// Fetch common data
			const [chatsRes, contractsRes] = await Promise.all([
				fetch(`${API_BASE_URL}/api/chat`, { headers }),
				fetch(`${API_BASE_URL}/api/contracts`, { headers })
			]);

			if (!chatsRes.ok) throw new Error(`Failed to fetch chats: ${chatsRes.statusText}`);
			if (!contractsRes.ok)
				throw new Error(`Failed to fetch contracts: ${contractsRes.statusText}`);

			const rawChatsFromAPI: any[] = await chatsRes.json();
			activeContracts = await contractsRes.json();

			// Enrich chats for dashboard display names
			const dashboardOtherParticipantIds = new Set<string>();
			rawChatsFromAPI.forEach((chat) => {
				(chat.participants as string[])
					.filter((pId: string) => pId !== currentUser?.id)
					.forEach((pId: string) => dashboardOtherParticipantIds.add(pId));
			});

			await Promise.all(
				Array.from(dashboardOtherParticipantIds).map(async (pId) => {
					if (!fetchedUserProfiles.has(pId) && token) {
						try {
							const userRes = await fetch(`${API_BASE_URL}/api/users/${pId}`, { headers });
							if (userRes.ok) {
								const userData: UserProfile = await userRes.json();
								fetchedUserProfiles.set(pId, userData);
							} else {
								console.warn(
									`Dashboard: Failed to fetch profile for user ${pId}: ${userRes.statusText}`
								);
								fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Basic fallback
							}
						} catch (e) {
							console.error(`Dashboard: Error fetching profile for user ${pId}`, e);
							fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Basic fallback
						}
					}
				})
			);

			recentChats = rawChatsFromAPI
				.map((chat) => {
					let displayName = 'Chat'; // Default
					const otherPIds = (chat.participants as string[]).filter(
						(pId) => pId !== currentUser?.id
					);
					if (otherPIds.length > 0) {
						const otherPId = otherPIds[0];
						const otherUserProfile = fetchedUserProfiles.get(otherPId);
						displayName = formatDisplayName(otherUserProfile);
					} else if (
						(chat.participants as string[]).length === 1 &&
						chat.participants[0] === currentUser?.id
					) {
						displayName = 'Personal Notes / Self Chat';
					}
					return { ...chat, displayName };
				})
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

			// Fetch user-specific data
			if (currentUser.userType === 'customer') {
				const wrRes = await fetch(
					`${API_BASE_URL}/api/work-requests?customerId=${currentUser.id}`,
					{ headers }
				);
				if (!wrRes.ok)
					throw new Error(`Failed to fetch customer work requests: ${wrRes.statusText}`);
				workRequests = await wrRes.json();
			} else if (currentUser.userType === 'expert' || currentUser.userType === 'supplier') {
				// Experts and Suppliers see all open work requests for now
				// Later, this could be more filtered (e.g., by expertise, category, or interest)
				const wrRes = await fetch(`${API_BASE_URL}/api/work-requests`, { headers });
				if (!wrRes.ok) throw new Error(`Failed to fetch all work requests: ${wrRes.statusText}`);
				const allRequests = await wrRes.json();
				// Filter for 'open' or 'awaiting_quotes' or 'in_discussion' status, and sort by creation date
				workRequests = allRequests
					.filter((req: any) => ['open', 'awaiting_quotes', 'in_discussion'].includes(req.status))
					.sort(
						(a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
					);
			}
		} catch (err: any) {
			console.error('Dashboard data fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading dashboard data.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (currentUser && token) {
			// Ensure user and token are available onMount
			fetchData();
		} else {
			// If not, wait for authStore subscription to provide them, then fetch
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.user && auth.token && !auth.isLoading) {
					currentUser = auth.user; // ensure reactive update if needed
					token = auth.token;
					fetchData();
					unsubscribe(); // Fetch once user data is confirmed
				}
			});
		}
	});

	function truncateText(text: string, maxLength: number) {
		if (!text) return '';
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}

	function formatDate(dateString: string) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}
</script>

<div class="flex h-full flex-col space-y-8">
	<header
		class="flex flex-col items-start justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0"
	>
		<h1 class="text-3xl font-bold text-emerald-400">
			Dashboard
			{#if currentUser}
				<span class="text-xl font-normal text-slate-400 capitalize">({currentUser.userType})</span>
			{/if}
		</h1>
		{#if currentUser?.userType === 'customer'}
			<button
				on:click={() => goto('/customer/create-request')}
				class="flex items-center space-x-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white shadow-md transition duration-150 ease-in-out hover:bg-emerald-600"
			>
				<!-- Replace with SVG icon if available -->
				<span>&#43;</span>
				<span>Create New Work Request</span>
			</button>
		{/if}
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-8 w-8 animate-spin text-emerald-500"
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
			<p class="text-slate-300">Loading dashboard data...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300">
			<h3 class="font-bold">Error</h3>
			<p>{errorMessage}</p>
		</div>
	{:else}
		<!-- General Welcome / Info -->
		<div class="rounded-xl bg-slate-700/60 p-6 shadow-lg">
			<p class="text-xl text-slate-200">
				Welcome back, <span class="font-semibold text-emerald-400"
					>{currentUser?.profile?.fullName || currentUser?.email?.split('@')[0]}</span
				>!
			</p>
			<p class="mt-2 text-sm text-slate-400">Here's a summary of your activities on GEFIFI.</p>
		</div>

		<!-- Main content grid -->
		<div class="grid flex-grow grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Work Requests Section -->
			<section
				class="flex flex-col space-y-4 rounded-lg bg-slate-700/40 p-5 shadow-md lg:col-span-2"
			>
				{#if currentUser?.userType === 'customer'}
					<h2 class="mb-3 text-2xl font-semibold text-sky-400">
						My Work Requests ({workRequests.length})
					</h2>
					{#if workRequests.length > 0}
						<div class="scrollable-content flex-grow space-y-3 overflow-y-auto pr-2">
							{#each workRequests as wr (wr.id)}
								<div
									class="cursor-pointer rounded-lg bg-slate-600/50 p-4 shadow transition-all hover:bg-slate-500/50"
									on:click={() => goto(`/work-requests/${wr.id}`)}
									title="Click to view details"
								>
									<h3 class="truncate font-semibold text-emerald-400">{wr.title}</h3>
									<p class="text-xs text-slate-400">
										Category: {wr.category} | Status:
										<span class="font-medium capitalize">{wr.status.replace('_', ' ')}</span>
									</p>
									<p class="mt-1 truncate text-sm text-slate-300">
										{truncateText(wr.description, 100)}
									</p>
									<p class="mt-1 text-xs text-slate-500">Created: {formatDate(wr.createdAt)}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">
							You haven't created any work requests yet.
							<button
								on:click={() => goto('/customer/create-request')}
								class="ml-1 text-emerald-400 underline hover:text-emerald-300"
								>Create one now?</button
							>
						</p>
					{/if}
				{:else if currentUser?.userType === 'expert' || currentUser?.userType === 'supplier'}
					<h2 class="mb-3 text-2xl font-semibold text-sky-400">
						Available Work Requests ({workRequests.length})
					</h2>
					{#if workRequests.length > 0}
						<div class="scrollable-content flex-grow space-y-3 overflow-y-auto pr-2">
							{#each workRequests as wr (wr.id)}
								<div
									class="cursor-pointer rounded-lg bg-slate-600/50 p-4 shadow transition-all hover:bg-slate-500/50"
									on:click={() => goto(`/work-requests/${wr.id}`)}
									title="Click to view details"
								>
									<h3 class="truncate font-semibold text-emerald-400">{wr.title}</h3>
									<p class="text-xs text-slate-400">
										Category: {wr.category} | Status:
										<span class="font-medium capitalize">{wr.status.replace('_', ' ')}</span>
									</p>
									<p class="mt-1 truncate text-sm text-slate-300">
										{truncateText(wr.description, 100)}
									</p>
									<p class="mt-1 text-xs text-slate-500">
										Posted: {formatDate(wr.createdAt)} by Customer ID: {truncateText(
											wr.customerId,
											8
										)}
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">
							No open work requests matching your profile at the moment. Check back later!
						</p>
					{/if}
				{/if}
			</section>

			<!-- Side Column for Chats and Contracts -->
			<div class="flex flex-col space-y-6 lg:col-span-1">
				<!-- Recent Chats Section -->
				<section class="flex flex-1 flex-col rounded-lg bg-slate-700/40 p-5 shadow-md">
					<h2 class="mb-3 text-xl font-semibold text-sky-400">
						Recent Chats ({recentChats.length})
					</h2>
					{#if recentChats.length > 0}
						<div class="scrollable-content flex-grow space-y-2 overflow-y-auto pr-1">
							{#each recentChats as chat (chat.id)}
								<a
									href={`/chat/${chat.id}`}
									class="block rounded-md bg-slate-600/50 p-3 shadow-sm transition-all hover:bg-slate-500/50"
									title={`Chat with ${chat.displayName || 'user'}`}
								>
									<p class="truncate font-medium text-emerald-300">
										{chat.displayName || 'Unknown User'}
									</p>
									<p class="text-xs text-slate-400">
										Last updated: {formatDate(chat.updatedAt)}
									</p>
								</a>
							{/each}
						</div>
						<button
							on:click={() => goto('/chat')}
							class="mt-4 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
						>
							Open chat inbox
						</button>
					{:else}
						<p class="text-slate-400">No recent chats to display.</p>
					{/if}
				</section>

				<!-- Active Contracts Section -->
				<section class="flex flex-1 flex-col rounded-lg bg-slate-700/40 p-5 shadow-md">
					<h2 class="mb-3 text-xl font-semibold text-sky-400">
						Active Contracts ({activeContracts.length})
					</h2>
					{#if activeContracts.length > 0}
						<div class="scrollable-content flex-grow space-y-2 overflow-y-auto pr-1">
							{#each activeContracts.slice(0, 3) as contract (contract.id)}
								<!-- Show latest 3 -->
								<div
									class="cursor-pointer rounded-md bg-slate-600/40 p-3 shadow-sm transition-all hover:bg-slate-500/40"
									on:click={() => goto(`/contracts/${contract.id}`)}
									title="View contract details"
								>
									<p class="truncate text-sm text-emerald-300">
										Contract ID: {truncateText(contract.id, 8)}
									</p>
									<p class="text-xs text-slate-400">
										Status: <span class="font-medium capitalize"
											>{contract.status.replace('_', ' ')}</span
										>
										| Date: {formatDate(contract.contractDate)}
									</p>
								</div>
							{/each}
						</div>
						{#if activeContracts.length > 3}
							<button
								on:click={() => goto('/contracts')}
								class="mt-3 text-sm text-emerald-400 underline hover:text-emerald-300"
								>View all contracts</button
							>
						{/if}
					{:else}
						<p class="text-sm text-slate-400">No active contracts.</p>
					{/if}
				</section>
			</div>
		</div>
	{/if}
</div>

<!-- Removed old placeholder content, added TODO -->
<!-- TODO:
  - Further refine UI/UX for each section.
  - Implement navigation to individual item details (e.g., specific work request, chat, contract). (Partially done with goto)
  - For chats, fetch participant names instead of IDs for better display.
  - Add more specific dashboard components based on deeper user role needs.
  - Enhance styling for a more "modern and professional" look - this is a good base.
  - Ensure all links and buttons are functional and lead to correct pages.
  - Icons for buttons (e.g., create new request button).
  - Pagination or "load more" for lists if they can become very long.
-->

<style lang="postcss">
	/* Custom scrollbar for overflow areas */
	.scrollable-content::-webkit-scrollbar {
		width: 6px;
	}
	.scrollable-content::-webkit-scrollbar-track {
		@reference bg-slate-700/50 rounded-full;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		@reference bg-slate-500 rounded-full;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		@reference bg-slate-400;
	}
</style>
