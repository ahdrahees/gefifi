<!-- gefifi-2/src/frontend/src/routes/(app)/home/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import apiClient from '$lib/api';
	import MaterialRequestCard from '$lib/components/ui/MaterialRequestCard.svelte';
	import WorkRequestCard from '$lib/components/ui/WorkRequestCard.svelte';
	import RecentChatsPanel from '$lib/components/home/RecentChatsPanel.svelte';
	import ActiveContractsPanel from '$lib/components/home/ActiveContractsPanel.svelte';
	import AgentChatPanel from '$lib/components/agent/AgentChatPanel.svelte';
	import {
		type Chat,
		type Contract,
		type EnrichedChat,
		type MaterialRequest,
		type UserProfileUI,
		type WorkRequest
	} from '$lib/types';

	// Assuming icons are still managed in the main layout or a global store if needed here
	// For simplicity, using text labels for now or simple placeholders

	let currentUser: AuthUser | null = $state(null);
	let workRequests = $state<WorkRequest[]>([]);
	let materialRequests = $state<MaterialRequest[]>([]);
	let allMyRequests = $state<AllRequest[]>([]); // Combined ACTIVE requests for customer view

	type AllRequest =
		| (WorkRequest & { requestType: 'work' })
		| (MaterialRequest & { requestType: 'material' });

	let recentChats: EnrichedChat[] = $state([]);
	let activeContracts: Contract[] = $state([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	// --- HOME VIEW TOGGLE (Agent / Dashboard) ---
	type HomeView = 'agent' | 'dashboard';
	let activeView: HomeView = $state('agent');
	let viewReady = $state(false);

	function setView(view: HomeView) {
		if (view === activeView) return;
		activeView = view;
		try {
			localStorage.setItem('gefifi_home_view', view);
		} catch {}
	}
	let fetchedUserProfiles = new Map<string, UserProfileUI>();

	// Map a requestId (work or material) to an existing chatId when a contract exists
	let requestIdToChatId: Map<string, string> = $state(new Map());

	// Simple filters for the Requests panel
	let searchQuery = $state('');
	let statusFilter: string = $state('all');
	let categoryFilter: string = $state('all');

	// Derived filter options (computed after we populate allMyRequests)
	let uniqueStatuses: string[] = $state([]);
	let uniqueCategories: string[] = $state([]);

	// Get token for API calls
	let token: string | null = null;
	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	// function trimString(str: string | undefined | null, maxLength: number): string {
	// 	if (!str) return '';
	// 	if (str.length <= maxLength) return str;
	// 	return str.substring(0, maxLength) + '...';
	// }

	function formatDisplayName(otherUser: UserProfileUI | undefined): string {
		if (!otherUser) {
			return 'Unknown User';
		}

		if (otherUser.userType === 'supplier') {
			return (
				otherUser.profile?.companyName ||
				otherUser.email?.split('@')[0] ||
				otherUser.phoneNumber ||
				'Supplier'
			);
		}
		// Default for 'customer', 'expert', and others
		return (
			otherUser.profile?.fullName ||
			otherUser.email?.split('@')[0] ||
			otherUser.phoneNumber ||
			'User'
		);
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
			// Fetch common data
			const [chats, contracts] = await Promise.all([
				apiClient.getUserChats(),
				apiClient.getUserContracts()
			]);

			// if (!chatsRes.ok) throw new Error(`Failed to fetch chats: ${chatsRes.statusText}`);
			// if (!contractsRes.ok)

			activeContracts = contracts;

			// Enrich chats for homepage display names
			const homepageOtherParticipantIds = new Set<string>();
			chats.forEach((chat) => {
				(chat.participants as string[])
					.filter((pId: string) => pId !== currentUser?.id)
					.forEach((pId: string) => homepageOtherParticipantIds.add(pId));
			});

			await Promise.all(
				Array.from(homepageOtherParticipantIds).map(async (pId) => {
					if (!fetchedUserProfiles.has(pId) && token) {
						try {
							const userData = await apiClient.getUserById(pId);
							fetchedUserProfiles.set(pId, userData);
						} catch (e) {
							console.error(`Home: Error fetching profile for user ${pId}`, e);
							fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Basic fallback
						}
					}
				})
			);

			recentChats = chats
				.map((chat: Chat) => {
					let displayName = 'Chat'; // Default
					const otherPIds = (chat.participants as string[]).filter(
						(pId) => pId !== currentUser?.id
					);
					let otherUserProfile: UserProfileUI | undefined = undefined;
					let avatarUrl: string | undefined = undefined;
					if (otherPIds.length > 0) {
						const otherPId = otherPIds[0];
						otherUserProfile = fetchedUserProfiles.get(otherPId);
						displayName = formatDisplayName(otherUserProfile);
						avatarUrl = otherUserProfile?.profile?.avatarUrl;
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
					return { ...chat, displayName, avatarUrl, otherUserProfile, lastMessageSnippet };
				})
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

			// Build requestId -> chatId mapping for contracted items
			try {
				const chatList: Array<{ id: string; participants: string[] } & Record<string, any>> =
					recentChats;
				const map = new Map<string, string>();
				(activeContracts || []).forEach((c: Contract) => {
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
				const [wrRes, mrRes] = (await Promise.all([
					apiClient.getWorkRequestsByCustomerId(currentUser.id),
					apiClient.getMaterialRequestsByCustomerId(currentUser.id)
				])) as [WorkRequest[], MaterialRequest[]];

				// Keep only ACTIVE requests
				const isActiveWork = (status: string) =>
					['open', 'in_discussion', 'awaiting_quotes', 'contracted', 'in_progress'].includes(
						status
					);
				const isActiveMaterial = (status: string) =>
					['open', 'quoting', 'ordered', 'contracted'].includes(status);

				const combinedActive: AllRequest[] = [
					...wrRes
						.filter((r: WorkRequest) => isActiveWork(r.status))
						.map((r: WorkRequest) => ({ ...r, requestType: 'work' as const })),
					...mrRes
						.filter((r: MaterialRequest) => isActiveMaterial(r.status))
						.map((r: MaterialRequest) => ({ ...r, requestType: 'material' as const }))
				];

				allMyRequests = combinedActive.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);

				// Build filter options
				uniqueStatuses = Array.from(new Set(allMyRequests.map((r) => String(r.status)))).sort();
				uniqueCategories = Array.from(
					new Set(
						allMyRequests
							.filter(
								(r): r is WorkRequest & { requestType: 'work' } =>
									r.requestType === 'work' && !!r.category
							)
							.map((r) => r.category ?? '')
					)
				).sort();
			} else if (currentUser.userType === 'expert') {
				// Experts see all open work requests
				const wrRes: WorkRequest[] = (await apiClient.getWorkRequests()) as WorkRequest[];
				workRequests = wrRes.filter((req) =>
					['open', 'awaiting_quotes', 'in_discussion'].includes(req.status)
				);
			} else if (currentUser.userType === 'supplier') {
				// Suppliers see all open material requests
				const mrRes = (await apiClient.getMaterialRequests()) as MaterialRequest[];
				materialRequests = mrRes.filter((req) => req.status === 'open');
			}
		} catch (err: unknown) {
			console.error('Homepage data fetch error:', err);
			errorMessage =
				err instanceof Error ? err.message : 'An error occurred while loading homepage data.';
		} finally {
			isLoading = false;
		}
	}
	// Filtering logic for the Requests panel (customer)
	let filteredRequests = $derived(
		(allMyRequests || [])
			.filter((r: AllRequest) =>
				statusFilter === 'all' ? true : String(r.status) === statusFilter
			)
			.filter(
				(r: AllRequest) =>
					categoryFilter === 'all' || (r.requestType === 'work' && r.category === categoryFilter)
			)
			.filter((r: AllRequest) => {
				if (!searchQuery.trim()) return true;
				const q = searchQuery.trim().toLowerCase();
				const categoryMatch =
					r.requestType === 'work' && r.category ? r.category.toLowerCase().includes(q) : false;

				return (
					(r.title || '').toLowerCase().includes(q) ||
					(r.description || '').toLowerCase().includes(q) ||
					categoryMatch
				);
			})
	);

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

	async function handleSendInterest(detail: {
		customerId: string;
		materialRequestId?: string;
		workRequestId?: string;
	}) {
		const { customerId, materialRequestId, workRequestId } = detail;

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
		} catch (error: unknown) {
			console.error('Failed to send interest', error);
			errorMessage =
				error instanceof Error ? error.message : 'Could not send interest. Please try again.';
		}
	}

	onMount(() => {
		// Restore saved view preference from localStorage
		try {
			const saved = localStorage.getItem('gefifi_home_view') as HomeView | null;
			if (saved === 'agent' || saved === 'dashboard') activeView = saved;
		} catch {}
		viewReady = true;

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

	// function truncateText(text: string, maxLength: number) {
	// 	if (!text) return '';
	// 	return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	// }

	// function formatDate(dateString: string) {
	// 	if (!dateString) return 'N/A';
	// 	return new Date(dateString).toLocaleDateString();
	// }
</script>

<div class="flex h-full flex-col space-y-4 lg:space-y-6">
	{#if currentUser?.userType === 'customer' && viewReady}
		<!-- Toggle Bar -->
		<div
			class="flex items-center gap-1 rounded-full border border-slate-700/50 bg-slate-800/60 p-0.5 backdrop-blur-sm"
		>
			<button
				onclick={() => setView('agent')}
				class="home-toggle-btn {activeView === 'agent'
					? 'home-toggle-active'
					: 'home-toggle-inactive'}"
				aria-label="Switch to Agent view"
			>
				{#if activeView === 'agent'}
					<span class="home-toggle-dot bg-emerald-400"></span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.8"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 18V5m3 8a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4m8.598-6.5A3 3 0 1012 5a3 3 0 10-5.598 1.5m11.595-.125a4 4 0 012.526 5.77M18 18a4 4 0 002-7.464m-0.033 6.483A4 4 0 1112 18a4 4 0 11-7.967-.517M6 18a4 4 0 01-2-7.464m2.003-6.339a4 4 0 00-2.526 5.77"
						/>
					</svg>
					<span>AI Agent</span>
				{/if}
			</button>
			<button
				onclick={() => setView('dashboard')}
				class="home-toggle-btn {activeView === 'dashboard'
					? 'home-toggle-active'
					: 'home-toggle-inactive'}"
				aria-label="Switch to Dashboard view"
			>
				{#if activeView === 'dashboard'}
					<span class="home-toggle-dot bg-sky-400"></span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.8"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
						/>
					</svg>
					<span>Dashboard</span>
				{/if}
			</button>
		</div>
	{/if}

	<!-- Content Area -->
	<div class="relative flex-1 overflow-hidden">
		{#if currentUser?.userType !== 'customer' || activeView === 'dashboard'}
			<div
				class="h-full space-y-8 overflow-y-auto"
				in:fly={{ x: 400, duration: 350, delay: 50 }}
				out:fly={{ x: 400, duration: 300 }}
			>
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
									onclick={() => goto('/customer/create-request')}
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
							<div
								class="h-full flex-1 rounded-lg border border-slate-600/40 bg-slate-700/40 px-3 py-2"
							>
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
					<div class="mb-6 grid flex-grow grid-cols-1 gap-6 lg:grid-cols-3">
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
												{#each uniqueStatuses as s (s)}
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
												{#each uniqueCategories as c (c)}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</div>
										<div class="flex items-center">
											<button
												onclick={() => {
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
										style="max-height: 66vh;"
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
															<svg
																class="h-3 w-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
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
															<svg
																class="h-3 w-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
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
								{:else if allMyRequests.length === 0}
									<div
										class="rounded-md border border-slate-600/50 bg-slate-700/30 p-4 text-slate-300"
									>
										<p class="mb-2">No requests match your current filters.</p>
										<button
											class="rounded-md bg-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-500"
											onclick={() => {
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
											onclick={() => goto('/customer/create-request')}
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
												onSendInterest={handleSendInterest}
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
												onclick={() => goto(`/material-requests/${mr.id}`)}
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														goto(`/material-requests/${mr.id}`);
													}
												}}
												role="link"
												tabindex="0"
											>
												<MaterialRequestCard
													request={mr}
													onSendInterest={handleSendInterest}
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

						<!-- Side Column for Chats and Contracts (equal height distribution) -->
						<div class="flex min-h-0 flex-col gap-6 lg:col-span-1">
							<!-- Recent Chats Section (componentized) -->
							<div class="min-h-0 flex-1">
								<RecentChatsPanel {recentChats} />
							</div>

							<!-- Active Contracts Section (componentized) -->
							<div class="mb-6 min-h-0 flex-1 lg:mb-0">
								<ActiveContractsPanel {activeContracts} />
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if currentUser?.userType === 'customer' && viewReady && activeView === 'agent'}
			<div
				class="absolute inset-0"
				in:fly={{ x: -400, duration: 350, delay: 50 }}
				out:fly={{ x: -400, duration: 300 }}
			>
				<div class="flex h-full flex-col">
					<AgentChatPanel mode="embedded" />
				</div>
			</div>
		{/if}
	</div>
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
	/* --- HOME VIEW TOGGLE STYLES --- */
	.home-toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: 1.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
		white-space: nowrap;
		overflow: hidden;
		border: none;
		outline: none;
	}

	.home-toggle-active {
		width: 1.5rem;
		min-width: 1.5rem;
		max-width: 1.5rem;
		padding: 0;
		background: rgba(30, 41, 59, 0.6);
		color: transparent;
		pointer-events: none;
	}

	.home-toggle-inactive {
		flex: 1;
		padding: 0 0.75rem;
		background: rgba(51, 65, 85, 0.5);
		color: rgba(203, 213, 225, 0.9);
	}

	.home-toggle-inactive:hover {
		background: rgba(71, 85, 105, 0.6);
		color: #fff;
	}

	.home-toggle-dot {
		display: block;
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 9999px;
		box-shadow: 0 0 6px currentColor;
	}

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
