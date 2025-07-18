<!-- gefifi-2/src/frontend/src/routes/(app)/chat/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

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

	type ChatListItem = {
		id: string;
		participantIds: string[];
		workRequestId?: string;
		lastMessageSnippet?: string;
		unreadCount?: number;
		updatedAt: string;
		displayName?: string;
		avatarUrl?: string;
		otherUserProfile?: UserProfile;
		lastMessage?: {
			id: string;
			content: string;
			timestamp: string;
			senderId: string;
		};
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let chats: ChatListItem[] = [];
	let isLoading = true;
	let errorMessage = '';
	let fetchedUserProfiles = new Map<string, UserProfile>();

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	function getUserTypeDisplay(userType: string): { label: string; color: string; bgColor: string } {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			case 'admin':
				return { label: 'Admin', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}

	function formatDisplayName(otherUser: UserProfile | undefined): string {
		if (!otherUser) return 'Unknown User';

		const { fullName, companyName } = otherUser.profile || {};

		switch (otherUser.userType) {
			case 'customer':
				return fullName || 'Customer';
			case 'expert':
				return fullName || 'Expert';
			case 'supplier':
				return companyName || fullName || 'Supplier';
			default:
				return fullName || companyName || 'User';
		}
	}

	function formatLastSeen(dateString: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;

		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	async function fetchChats() {
		isLoading = true;
		errorMessage = '';

		if (!currentUser || !token) {
			errorMessage = 'User not authenticated. Cannot load chats.';
			isLoading = false;
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: `Failed to fetch chats: ${response.statusText}` }));
				throw new Error(errorData.message);
			}

			const rawChats: {
				id: string;
				participants: string[];
				workRequestId?: string;
				updatedAt: string;
				createdAt: string;
			}[] = await response.json();

			// Collect all unique other participant IDs
			const allOtherParticipantIds = new Set<string>();
			rawChats.forEach((chat) => {
				chat.participants
					.filter((pId: string) => pId !== currentUser?.id)
					.forEach((pId: string) => allOtherParticipantIds.add(pId));
			});

			// Fetch profiles for unique IDs not already cached
			await Promise.all(
				Array.from(allOtherParticipantIds).map(async (pId) => {
					if (!fetchedUserProfiles.has(pId) && token) {
						try {
							const userRes = await fetch(`${API_BASE_URL}/api/users/${pId}`, {
								headers: { Authorization: `Bearer ${token}` }
							});
							if (userRes.ok) {
								const userData: UserProfile = await userRes.json();
								fetchedUserProfiles.set(pId, userData);
							} else {
								fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' });
							}
						} catch (e) {
							fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' });
						}
					}
				})
			);

			const enrichedChats: ChatListItem[] = rawChats.map((chat) => {
				const otherParticipantIds = chat.participants.filter(
					(pId: string) => pId !== currentUser?.id
				);

				let displayName = 'Chat';
				let avatarUrl: string | undefined = undefined;
				let otherUserProfile: UserProfile | undefined = undefined;

				if (otherParticipantIds.length > 0) {
					const otherPId = otherParticipantIds[0];
					otherUserProfile = fetchedUserProfiles.get(otherPId);
					displayName = formatDisplayName(otherUserProfile);
					avatarUrl = otherUserProfile?.profile?.avatarUrl;
				} else if (chat.participants.length === 1 && chat.participants[0] === currentUser?.id) {
					displayName = 'Personal Notes';
					avatarUrl = currentUser?.profile?.avatarUrl;
				}

				return {
					id: chat.id,
					participantIds: chat.participants,
					workRequestId: chat.workRequestId,
					updatedAt: chat.updatedAt,
					displayName,
					avatarUrl,
					otherUserProfile,
					lastMessageSnippet: 'No messages yet...',
					unreadCount: 0
				};
			});

			chats = enrichedChats.sort(
				(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
		} catch (err: unknown) {
			console.error('Chat list fetch error:', err);
			errorMessage = (err as Error).message || 'An error occurred while loading chats.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe((auth) => {
			if (auth.user && auth.token && !auth.isLoading) {
				currentUser = auth.user;
				token = auth.token;
				fetchChats();
			} else if (!auth.isLoading && !auth.user) {
				errorMessage = 'User not authenticated.';
				isLoading = false;
			}
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="border-b border-slate-700/50 bg-slate-800/50 p-4 backdrop-blur-sm">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-emerald-500/20 p-2">
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
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-emerald-400">Messages</h1>
					<p class="text-sm text-slate-400">
						{chats.length} conversation{chats.length === 1 ? '' : 's'}
					</p>
				</div>
			</div>

			<button
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
				on:click={fetchChats}
				disabled={isLoading}
			>
				{#if isLoading}
					<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{:else}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500"
					></div>
					<p class="text-slate-300">Loading your conversations...</p>
				</div>
			</div>
		{:else if errorMessage}
			<div class="flex h-full items-center justify-center p-6">
				<div class="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
					<div class="mb-4 inline-block rounded-full bg-red-500/20 p-3">
						<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-red-300">Unable to Load Chats</h3>
					<p class="mb-4 text-sm text-red-200">{errorMessage}</p>
					<button
						class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
						on:click={fetchChats}
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if chats.length === 0}
			<div class="flex h-full items-center justify-center p-6">
				<div class="max-w-md text-center">
					<div class="mb-6 inline-block rounded-full bg-slate-700/50 p-6">
						<svg
							class="h-16 w-16 text-slate-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
					<h2 class="mb-3 text-xl font-semibold text-slate-300">No Conversations Yet</h2>
					<p class="leading-relaxed text-slate-400">
						Start your first conversation by expressing interest in a work request or contacting a
						provider.
					</p>
				</div>
			</div>
		{:else}
			<div class="space-y-2 p-4">
				{#each chats as chat (chat.id)}
					<a
						href={`/chat/${chat.id}`}
						class="block rounded-xl bg-slate-800/50 p-4 transition-all duration-200 hover:bg-slate-700/50 hover:shadow-lg hover:shadow-emerald-500/5 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
					>
						<div class="flex items-center gap-4">
							<!-- Avatar -->
							<div class="relative">
								<img
									src={chat.avatarUrl || '/images/default-avatar.png'}
									alt="Avatar for {chat.displayName}"
									class="h-14 w-14 rounded-full border-2 border-slate-600 object-cover"
									loading="lazy"
								/>
								<!-- Online indicator (placeholder) -->
								<div
									class="absolute right-0 bottom-0 h-4 w-4 rounded-full border-2 border-slate-800 bg-emerald-500"
								></div>
							</div>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-start justify-between">
									<div class="flex items-center gap-2">
										<h3 class="truncate font-semibold text-slate-200">
											{chat.displayName}
										</h3>
										{#if chat.otherUserProfile}
											{@const typeInfo = getUserTypeDisplay(chat.otherUserProfile.userType)}
											<span
												class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {typeInfo.color} {typeInfo.bgColor}"
											>
												{typeInfo.label}
											</span>
										{/if}
									</div>
									<span class="flex-shrink-0 text-xs text-slate-500">
										{formatLastSeen(chat.updatedAt)}
									</span>
								</div>

								<!-- User details -->
								{#if chat.otherUserProfile?.profile}
									<div class="mb-2 flex items-center gap-2 text-xs text-slate-400">
										{#if chat.otherUserProfile.userType === 'expert' && chat.otherUserProfile.profile.expertise}
											<span class="flex items-center gap-1">
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5z"
													/>
												</svg>
												{chat.otherUserProfile.profile.expertise}
											</span>
										{:else if chat.otherUserProfile.userType === 'supplier' && chat.otherUserProfile.profile.category}
											<span class="flex items-center gap-1">
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
													/>
												</svg>
												{chat.otherUserProfile.profile.category}
											</span>
										{/if}
										{#if chat.otherUserProfile.profile.location}
											<span class="flex items-center gap-1">
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
													/>
												</svg>
												{chat.otherUserProfile.profile.location}
											</span>
										{/if}
									</div>
								{/if}

								<!-- Last message -->
								<div class="flex items-center justify-between">
									<p class="flex-1 truncate text-sm text-slate-400">
										{chat.lastMessageSnippet}
									</p>
									{#if chat.unreadCount && chat.unreadCount > 0}
										<span
											class="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
										>
											{chat.unreadCount}
										</span>
									{/if}
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
