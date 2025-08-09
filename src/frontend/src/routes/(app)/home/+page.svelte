<!-- gefifi-2/src/frontend/src/routes/(app)/home/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { page } from '$app/stores'; // For query params or path if needed later
	import { goto } from '$app/navigation';
	import { API_BASE_URL } from '$lib/config'; // Assuming you have a config file for API base
	import apiClient, { type WorkRequestResponse, type MaterialRequestResponse } from '$lib/api';
	import MaterialRequestCard from '$lib/components/ui/MaterialRequestCard.svelte';
	import WorkRequestCard from '$lib/components/ui/WorkRequestCard.svelte';
	import RecentChatsPanel from '$lib/components/home/RecentChatsPanel.svelte';

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
	let allMyRequests: any[] = []; // Combined ACTIVE requests for customer view
	let recentChats: any[] = [];
	let activeContracts: any[] = [];
	let isLoading = true;
	let errorMessage = '';
	let fetchedUserProfiles = new Map<string, UserProfile>();

	// Map a requestId (work or material) to an existing chatId when a contract exists
	let requestIdToChatId: Map<string, string> = new Map();

	// Simple filters for the Requests panel
	let searchQuery = '';
	let statusFilter: string = 'all';
	let categoryFilter: string = 'all';

	// Derived filter options (computed after we populate allMyRequests)
	let uniqueStatuses: string[] = [];
	let uniqueCategories: string[] = [];

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
			errorMessage = 'User not authenticated. Cannot load home page data.';
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

			// Enrich chats for homepage display names
			const homepageOtherParticipantIds = new Set<string>();
			rawChatsFromAPI.forEach((chat) => {
				(chat.participants as string[])
					.filter((pId: string) => pId !== currentUser?.id)
					.forEach((pId: string) => homepageOtherParticipantIds.add(pId));
			});

			await Promise.all(
				Array.from(homepageOtherParticipantIds).map(async (pId) => {
					if (!fetchedUserProfiles.has(pId) && token) {
						try {
							const userRes = await fetch(`${API_BASE_URL}/api/users/${pId}`, { headers });
							if (userRes.ok) {
								const userData: UserProfile = await userRes.json();
								fetchedUserProfiles.set(pId, userData);
							} else {
								console.warn(
									`Home: Failed to fetch profile for user ${pId}: ${userRes.statusText}`
								);
								fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Basic fallback
							}
						} catch (e) {
							console.error(`Home: Error fetching profile for user ${pId}`, e);
							fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Basic fallback
						}
					}
				})
			);

			recentChats = rawChatsFromAPI
				.map((chat: any) => {
					let displayName = 'Chat'; // Default
					const otherPIds = (chat.participants as string[]).filter(
						(pId) => pId !== currentUser?.id
					);
					let otherUserProfile: any | undefined = undefined;
					if (otherPIds.length > 0) {
						const otherPId = otherPIds[0];
						otherUserProfile = fetchedUserProfiles.get(otherPId);
						displayName = formatDisplayName(otherUserProfile);
						chat.avatarUrl = otherUserProfile?.profile?.avatarUrl;
					} else if (
						(chat.participants as string[]).length === 1 &&
						chat.participants[0] === currentUser?.id
					) {
						displayName = 'Personal Notes / Self Chat';
					}
					// Last message snippet similar to inbox
					let lastMessageSnippet = 'No messages yet...';
					if (chat.lastMessage) {
						lastMessageSnippet =
							chat.lastMessage.senderId === currentUser?.id
								? `You: ${chat.lastMessage.content}`
								: chat.lastMessage.content;
					}
					return { ...chat, displayName, otherUserProfile, lastMessageSnippet };
				})
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

			// Build requestId -> chatId mapping for contracted items
			try {
				const chatList: Array<{ id: string; participants: string[] } & Record<string, any>> =
					recentChats;
				const map = new Map<string, string>();
				(activeContracts || []).forEach((c: any) => {
					const otherPartyIds = [c.customerId, c.expertSupplierId];
					const match = chatList.find(
						(ch) =>
							Array.isArray(ch.participants) &&
							otherPartyIds.every((pid) => ch.participants.includes(pid))
					);
					const reqId = c.workRequestId || c.materialRequestId;
					if (match && reqId) {
						map.set(reqId, match.id);
					}
				});
				requestIdToChatId = map;
			} catch (e) {
				console.warn('Failed to map contracts to chat IDs:', e);
			}

			// Fetch user-specific data
			if (currentUser.userType === 'customer') {
				const [wrRes, mrRes] = await Promise.all([
					apiClient.getWorkRequestsByCustomerId(currentUser.id),
					apiClient.getMaterialRequestsByCustomerId(currentUser.id)
				]);

				// Keep only ACTIVE requests
				const isActiveWork = (status: string) =>
					['open', 'in_discussion', 'awaiting_quotes', 'contracted', 'in_progress'].includes(
						status
					);
				const isActiveMaterial = (status: string) =>
					['open', 'quoting', 'ordered', 'contracted'].includes(status);

				const combinedActive = [
					...wrRes
						.filter((r: WorkRequestResponse) => isActiveWork(r.status))
						.map((r: WorkRequestResponse) => ({ ...r, requestType: 'work' })),
					...mrRes
						.filter((r: MaterialRequestResponse) => isActiveMaterial(r.status))
						.map((r: MaterialRequestResponse) => ({ ...r, requestType: 'material' }))
				];

				allMyRequests = combinedActive.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);

				// Build filter options
				uniqueStatuses = Array.from(
					new Set(allMyRequests.map((r: any) => String(r.status)))
				).sort();
				uniqueCategories = Array.from(
					new Set(
						allMyRequests
							.filter((r: any) => r.requestType === 'work' && r.category)
							.map((r: any) => String(r.category))
					)
				).sort();
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
			console.error('Homepage data fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading homepage data.';
		} finally {
			isLoading = false;
		}
	}
	// Filtering logic for the Requests panel (customer)
	$: filteredRequests = (allMyRequests || [])
		.filter((r: any) => (statusFilter === 'all' ? true : String(r.status) === statusFilter))
		.filter((r: any) =>
			categoryFilter === 'all' ? true : String(r.category || '') === categoryFilter
		)
		.filter((r: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.trim().toLowerCase();
			return (
				String(r.title || '')
					.toLowerCase()
					.includes(q) ||
				String(r.description || '')
					.toLowerCase()
					.includes(q) ||
				String(r.category || '')
					.toLowerCase()
					.includes(q)
			);
		});

	function getWorkStatusClasses(status: string) {
		const classes: Record<string, string> = {
			open: 'bg-green-500/20 text-green-300 border-green-500/50',
			in_discussion: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			awaiting_quotes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
			contracted: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
			in_progress: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
		};
		return classes[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';
	}

	function getMaterialStatusClasses(status: string) {
		const classes: Record<string, string> = {
			open: 'bg-green-500/20 text-green-300 border-green-500/50',
			quoting: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			ordered: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
			contracted: 'bg-purple-500/20 text-purple-300 border-purple-500/50'
		};
		return classes[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';
	}

	async function handleSendInterest(event: CustomEvent) {
		const { customerId, materialRequestId, workRequestId } = event.detail;

		if (!customerId || (!materialRequestId && !workRequestId)) return;

		try {
			const result = await apiClient.sendInterest({
				targetUserId: customerId,
				materialRequestId: materialRequestId,
				workRequestId: workRequestId,
				predefinedMessageKey: workRequestId
					? 'PROVIDER_INTEREST_IN_WORK_REQUEST'
					: 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST'
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
		class="rounded-2xl border border-slate-600/40 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl lg:p-8"
	>
		<!-- Top bar -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold text-emerald-400">Home</h1>
				{#if currentUser}
					<span
						class="rounded-full border border-slate-500/40 bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-200 capitalize"
					>
						{currentUser.userType}
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if currentUser?.userType === 'customer'}
					<button
						on:click={() => goto('/customer/create-request')}
						class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
						aria-label="Create new request"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16M4 12h16"
							/></svg
						>
						<span class="hidden sm:inline">Create New Request</span>
					</button>
				{/if}
				<a
					href="/chat"
					class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-3 py-2 text-slate-200 transition hover:bg-slate-600/40 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
					aria-label="Open chat inbox"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/></svg
					>
					<span class="hidden sm:inline">Chat</span>
				</a>
			</div>
		</div>

		<!-- Bottom row -->
		<div class="mt-4 grid gap-4 lg:grid-cols-3">
			<div class="col-span-2">
				<p class="text-xl text-slate-200">
					Welcome back,
					<a href="/profile" class="font-semibold text-emerald-400 hover:text-emerald-300">
						{#if currentUser?.userType === 'supplier'}
							{currentUser?.profile?.companyName || currentUser?.email?.split('@')[0]}
						{:else}
							{currentUser?.profile?.fullName || currentUser?.email?.split('@')[0]}
						{/if}
					</a>!
				</p>
				<p class="mt-1 text-sm text-slate-400">Here’s a quick snapshot of your workspace.</p>
			</div>

			<!-- Stat chips -->
			<div class="flex items-center gap-2">
				<div class="flex-1 rounded-lg border border-slate-600/40 bg-slate-700/40 px-3 py-2">
					<p class="text-xs text-slate-400">Active Requests</p>
					<p class="text-lg font-semibold text-slate-100">{allMyRequests.length}</p>
				</div>
				<div class="flex-1 rounded-lg border border-slate-600/40 bg-slate-700/40 px-3 py-2">
					<p class="text-xs text-slate-400">Active Contracts</p>
					<p class="text-lg font-semibold text-slate-100">{activeContracts.length}</p>
				</div>
				<div class="h-full flex-1 rounded-lg border border-slate-600/40 bg-slate-700/40 px-3 py-2">
					<p class="text-xs text-slate-400">Recent Chats</p>
					<p class="text-lg font-semibold text-slate-100">{recentChats.length}</p>
				</div>
			</div>
		</div>
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
			<p class="text-slate-300">Loading homepage data...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300">
			<h3 class="font-bold">Error</h3>
			<p>{errorMessage}</p>
		</div>
	{:else}
		<!-- General Welcome removed; replaced by redesigned header above -->

		<!-- Main content grid -->
		<div class="grid flex-grow grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Requests Section (2/3 column) -->
			<section
				class="flex flex-col space-y-4 rounded-lg bg-slate-700/40 p-5 shadow-md lg:col-span-2"
				style="min-height: 0;"
			>
				{#if currentUser?.userType === 'customer'}
					<h2 class="mb-3 text-2xl font-semibold text-sky-400">
						My Active Requests ({filteredRequests.length}/{allMyRequests.length})
					</h2>

					<!-- Search and Filters -->
					<div class="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-4">
						<div class="relative lg:col-span-2">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search by title, description, category..."
								class="h-10 w-full rounded-lg border border-slate-600/60 bg-slate-700/50 pr-3 pl-10 text-slate-200 placeholder-slate-400 focus:border-emerald-500/50 focus:outline-none"
							/>
							<svg
								class="pointer-events-none absolute top-2.5 left-3 h-5 w-5 text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/></svg
							>
						</div>
						<!-- Second row container (mobile: below search; desktop: same row, compact spacing) -->
						<div class="flex gap-2 lg:col-span-2 lg:flex lg:items-center lg:gap-2">
							<div class="flex-1 lg:w-48">
								<select
									bind:value={statusFilter}
									class="h-10 w-full rounded-lg border border-slate-600/60 bg-slate-700/50 px-3 text-slate-200 focus:border-emerald-500/50 focus:outline-none"
								>
									<option value="all">All Statuses</option>
									{#each uniqueStatuses as s}
										<option value={s}>{s.replace(/_/g, ' ')}</option>
									{/each}
								</select>
							</div>
							<div class="flex-1 lg:w-56">
								<select
									bind:value={categoryFilter}
									class="h-10 w-full rounded-lg border border-slate-600/60 bg-slate-700/50 px-3 text-slate-200 focus:border-emerald-500/50 focus:outline-none"
								>
									<option value="all">All Categories</option>
									{#each uniqueCategories as c}
										<option value={c}>{c}</option>
									{/each}
								</select>
							</div>
							<div class="flex items-center">
								<button
									on:click={() => {
										searchQuery = '';
										statusFilter = 'all';
										categoryFilter = 'all';
									}}
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-600 text-slate-100 hover:bg-slate-500 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
									title="Clear filters"
									aria-label="Clear filters"
								>
									<!-- funnel-x icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
									>
										<path
											d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473"
										/>
										<path d="m16.5 3.5 5 5" />
										<path d="m21.5 3.5-5 5" />
									</svg>
								</button>
							</div>
						</div>
					</div>
					{#if allMyRequests.length > 0}
						<div
							class="scrollable-content flex-grow space-y-4 overflow-y-auto p-2 lg:p-3"
							style="max-height: 68vh;"
						>
							{#each filteredRequests as req (req.id)}
								<div class="relative pt-6 pb-6">
									{#if req.requestType === 'work'}
										<WorkRequestCard request={req} />
										<!-- Type badge -->
										<span
											class="absolute top-3 right-3 rounded-full bg-sky-500/80 px-2 py-0.5 text-xs font-bold text-white"
											>Work</span
										>
										<!-- Status badge (stronger visibility) -->
										<span
											class="absolute top-3 left-3 rounded-full border px-2 py-0.5 text-xs font-semibold {getWorkStatusClasses(
												req.status
											)}"
										>
											{req.status.replace(/_/g, ' ').toUpperCase()}
										</span>

										<!-- Chat badge if contracted (link to chat) -->
										{#if requestIdToChatId.has(req.id)}
											<a
												href={`/chat/${requestIdToChatId.get(req.id)}`}
												class="absolute right-3 bottom-3 z-10 flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/20 p-1 text-[10px] text-emerald-300 shadow-sm hover:bg-emerald-500/30"
												title="Open chat"
											>
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
													/></svg
												>
												<span class="sr-only">Open chat</span>
											</a>
										{/if}
									{:else if req.requestType === 'material'}
										<a
											href={`/material-requests/${req.id}`}
											class="block"
											title="View material request"
										>
											<MaterialRequestCard request={req} showInterestButton={false} />
										</a>
										<!-- Type badge -->
										<span
											class="absolute top-3 right-3 rounded-full bg-amber-500/80 px-2 py-0.5 text-xs font-bold text-white"
											>Material</span
										>
										<!-- Status badge (new for Material Requests) -->
										<span
											class="absolute top-3 left-3 rounded-full border px-2 py-0.5 text-xs font-semibold {getMaterialStatusClasses(
												req.status
											)}"
										>
											{String(req.status).toUpperCase()}
										</span>

										<!-- Chat badge if contracted (link to chat) -->
										{#if requestIdToChatId.has(req.id)}
											<a
												href={`/chat/${requestIdToChatId.get(req.id)}`}
												class="absolute right-3 bottom-3 z-10 flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/20 p-1 text-[10px] text-emerald-300 shadow-sm hover:bg-emerald-500/30"
												title="Open chat"
											>
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
													/></svg
												>
												<span class="sr-only">Open chat</span>
											</a>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					{:else if allMyRequests.length > 0}
						<div class="rounded-md border border-slate-600/50 bg-slate-700/30 p-4 text-slate-300">
							<p class="mb-2">No requests match your current filters.</p>
							<button
								class="rounded-md bg-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-500"
								on:click={() => {
									searchQuery = '';
									statusFilter = 'all';
									categoryFilter = 'all';
								}}>Clear filters</button
							>
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
						<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
							{#each workRequests as wr (wr.id)}
								<WorkRequestCard
									request={wr}
									showInterestButton={true}
									on:sendInterest={handleSendInterest}
									currentUserId={currentUser?.id}
								/>
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
						<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
							{#each materialRequests as mr (mr.id)}
								<div
									class="cursor-pointer"
									on:click={() => goto(`/material-requests/${mr.id}`)}
									on:keypress
									role="link"
									tabindex="0"
								>
									<MaterialRequestCard
										request={mr}
										on:sendInterest={handleSendInterest}
										showInterestButton={true}
										currentUserId={currentUser?.id}
									/>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-400">No open material requests at the moment.</p>
					{/if}
				{/if}
			</section>

			<!-- Side Column for Chats and Contracts (each 1/3 height matched) -->
			<div class="flex flex-col space-y-6 lg:col-span-1">
				<!-- Recent Chats Section (componentized) -->
				<RecentChatsPanel {recentChats} />

				<!-- Active Contracts Section -->
				<section class="flex flex-1 flex-col rounded-lg bg-slate-700/40 p-5 shadow-md">
					<h2 class="mb-3 text-xl font-semibold text-sky-400">
						Active Contracts ({activeContracts.length})
					</h2>
					{#if activeContracts.length > 0}
						<div class="scrollable-content flex-grow space-y-2 overflow-y-auto pr-1">
							{#each activeContracts.slice(0, 3) as contract (contract.id)}
								<!-- Show latest 3 -->
								<a
									href={`/contracts/${contract.id}`}
									class="block rounded-md bg-slate-600/40 p-3 shadow-sm transition-all hover:bg-slate-500/40"
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
								</a>
							{/each}
						</div>
						<div class="mt-3 flex justify-end">
							<a href="/contracts" class="text-sm text-emerald-400 underline hover:text-emerald-300"
								>View all</a
							>
						</div>
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
  - Add more specific homepage components based on deeper user role needs.
  - Enhance styling for a more "modern and professional" look - this is a good base.
  - Ensure all links and buttons are functional and lead to correct pages.
  - Icons for buttons (e.g., create new request button).
  - Pagination or "load more" for lists if they can become very long.
-->

<style lang="postcss">
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
