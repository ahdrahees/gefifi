<!-- gefifi-2/src/frontend/src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { page } from '$app/stores'; // For query params or path if needed later
	import { goto } from '$app/navigation';
	import { API_BASE_URL } from '$lib/config'; // Assuming you have a config file for API base
	import apiClient, { type WorkRequestResponse, type MaterialRequestResponse } from '$lib/api';
	import MaterialRequestCard from '$lib/components/ui/MaterialRequestCard.svelte';
	import WorkRequestCard from '$lib/components/ui/WorkRequestCard.svelte';

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
	let materialRequests: any[] = [];
	let allMyRequests: any[] = []; // For the combined customer view
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

		if (otherUser.userType === 'supplier') {
			return otherUser.profile?.companyName || otherUser.email.split('@')[0] || 'Supplier';
		}
		// Default for 'customer', 'expert', and others
		return otherUser.profile?.fullName || otherUser.email.split('@')[0] || 'User';
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
				const [wrRes, mrRes] = await Promise.all([
					apiClient.getWorkRequestsByCustomerId(currentUser.id),
					apiClient.getMaterialRequestsByCustomerId(currentUser.id)
				]);

				const combined = [
					...wrRes.map((r: WorkRequestResponse) => ({ ...r, requestType: 'work' })),
					...mrRes.map((r: MaterialRequestResponse) => ({ ...r, requestType: 'material' }))
				];

				allMyRequests = combined.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			} else if (currentUser.userType === 'expert') {
				// Experts see all open work requests
				const wrRes = await apiClient.getWorkRequests();
				workRequests = wrRes.filter((req) =>
					['open', 'awaiting_quotes', 'in_discussion'].includes(req.status)
				);
			} else if (currentUser.userType === 'supplier') {
				// Suppliers see all open material requests
				const mrRes = await apiClient.getMaterialRequests();
				materialRequests = mrRes.filter((req) => req.status === 'open');
			}
		} catch (err: any) {
			console.error('Dashboard data fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading dashboard data.';
		} finally {
			isLoading = false;
		}
	}

	async function handleSendInterest(event: CustomEvent) {
		const { customerId, materialRequestId } = event.detail;
		if (!customerId || !materialRequestId) return;

		try {
			const result = await apiClient.sendInterest({
				targetUserId: customerId,
				materialRequestId: materialRequestId,
				predefinedMessageKey: 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST'
			});
			// Optionally, redirect to the newly created/updated chat
			if (result.chatId) {
				goto(`/chat/${result.chatId}`);
			}
		} catch (error: any) {
			console.error('Failed to send interest', error);
			errorMessage = error.data?.message || 'Could not send interest. Please try again.';
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
				Welcome back,
				<span class="font-semibold text-emerald-400">
					{#if currentUser?.userType === 'supplier'}
						{currentUser?.profile?.companyName || currentUser?.email?.split('@')[0]}
					{:else}
						{currentUser?.profile?.fullName || currentUser?.email?.split('@')[0]}
					{/if}
				</span>!
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
						My Requests ({allMyRequests.length})
					</h2>
					{#if allMyRequests.length > 0}
						<div class="scrollable-content flex-grow space-y-4 overflow-y-auto pr-2">
							{#each allMyRequests as req (req.id)}
								<div class="relative">
									{#if req.requestType === 'work'}
										<WorkRequestCard request={req} />
										<span
											class="absolute top-2 right-2 rounded-full bg-sky-500/80 px-2 py-0.5 text-xs font-bold text-white"
											>Work</span
										>
									{:else if req.requestType === 'material'}
										<MaterialRequestCard request={req} on:sendInterest={handleSendInterest} />
										<span
											class="absolute top-2 right-2 rounded-full bg-amber-500/80 px-2 py-0.5 text-xs font-bold text-white"
											>Material</span
										>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">
							You haven't created any requests yet.
							<button
								on:click={() => goto('/customer/create-request')}
								class="ml-1 text-emerald-400 underline hover:text-emerald-300"
								>Create one now?</button
							>
						</p>
					{/if}
				{:else if currentUser?.userType === 'expert'}
					<h2 class="mb-3 text-2xl font-semibold text-sky-400">
						Available Work Requests ({workRequests.length})
					</h2>
					{#if workRequests.length > 0}
						<div class="scrollable-content flex-grow space-y-3 overflow-y-auto pr-2">
							{#each workRequests as wr (wr.id)}
								<!-- This part would be refactored to use a WorkRequestCard component -->
								<div
									class="cursor-pointer rounded-lg bg-slate-600/50 p-4 shadow transition-all hover:bg-slate-500/50"
									on:click={() => goto(`/work-requests/${wr.id}`)}
									title="Click to view details"
								>
									<h3 class="truncate font-semibold text-emerald-400">{wr.title}</h3>
									<!-- Content omitted for brevity -->
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">
							No open work requests matching your profile at the moment. Check back later!
						</p>
					{/if}
				{:else if currentUser?.userType === 'supplier'}
					<h2 class="mb-3 text-2xl font-semibold text-sky-400">
						Available Material Requests ({materialRequests.length})
					</h2>
					{#if materialRequests.length > 0}
						<div class="scrollable-content flex-grow space-y-4 overflow-y-auto pr-2">
							{#each materialRequests as mr (mr.id)}
								<MaterialRequestCard request={mr} on:sendInterest={handleSendInterest} />
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">No open material requests at the moment.</p>
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
