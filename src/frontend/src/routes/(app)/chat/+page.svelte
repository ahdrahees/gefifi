<!-- gefifi-2/src/frontend/src/routes/(app)/chat/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import apiClient from '$lib/api';
	import type { Chat } from '$lib/types';
	import type { Unsubscribe } from 'firebase/firestore';
	import OnlineStatus from '$lib/components/chat/OnlineStatus.svelte';

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

	type EnrichedChat = Chat & {
		displayName: string;
		avatarUrl?: string;
		otherUserProfile?: UserProfile;
		lastMessageSnippet: string;
		unreadCount: number;
	};

	let currentUser: AuthUser | null = null;
	let chats: EnrichedChat[] = [];
	let isLoading = true;
	let errorMessage = '';
	let fetchedUserProfiles = new Map<string, UserProfile>();
	let chatsUnsubscribe: Unsubscribe | null = null;

	$: ({ user: currentUser } = $authStore);

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

	async function fetchUserProfiles(userIds: string[]): Promise<void> {
		const newUserIds = userIds.filter((id) => !fetchedUserProfiles.has(id));

		if (newUserIds.length === 0) return;

		await Promise.all(
			newUserIds.map(async (userId) => {
				try {
					const userData = await apiClient.getUserById(userId);
					fetchedUserProfiles.set(userId, userData);
				} catch (error) {
					console.error(`Failed to fetch user profile for ${userId}:`, error);
					fetchedUserProfiles.set(userId, {
						id: userId,
						email: '',
						userType: 'unknown'
					});
				}
			})
		);
	}

	function enrichChats(rawChats: Chat[]): EnrichedChat[] {
		return rawChats.map((chat) => {
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

			let lastMessageSnippet = 'No messages yet...';

			// Check both lastMessage and lastMessageContent for backward compatibility
			const lastMsg = chat.lastMessage;
			if (lastMsg && (lastMsg.content || lastMsg.audioType || lastMsg.images)) {
				// Handle different message types
				if (lastMsg.audioType === 'voice') {
					lastMessageSnippet =
						lastMsg.senderId === currentUser?.id ? 'You: 🎤 Voice message' : '🎤 Voice message';
				} else if (lastMsg.images && lastMsg.images.length > 0) {
					lastMessageSnippet = lastMsg.senderId === currentUser?.id ? 'You: 📷 Photo' : '📷 Photo';
				} else if (lastMsg.content && lastMsg.content.trim()) {
					const prefix = lastMsg.senderId === currentUser?.id ? 'You: ' : '';
					lastMessageSnippet = prefix + lastMsg.content.trim();
				}
			}

			return {
				...chat,
				displayName,
				avatarUrl,
				otherUserProfile,
				lastMessageSnippet,
				unreadCount: 0 // TODO: Implement unread count logic
			} as EnrichedChat;
		});
	}

	async function setupRealtimeChats(): Promise<void> {
		if (!currentUser?.id) return;

		isLoading = true;
		errorMessage = '';

		try {
			// Set up real-time chat list subscription
			chatsUnsubscribe = realtimeChatService.subscribeToUserChats(
				currentUser.id,
				async (rawChats) => {
					// Collect all participant IDs for profile fetching
					const allParticipantIds = new Set<string>();
					rawChats.forEach((chat) => {
						chat.participants
							.filter((pId) => pId !== currentUser?.id)
							.forEach((pId) => allParticipantIds.add(pId));
					});

					// Fetch user profiles for participants we don't have yet
					await fetchUserProfiles(Array.from(allParticipantIds));

					// Enrich chats with user profiles and display info
					chats = enrichChats(rawChats);
					isLoading = false;
				}
			);
		} catch (error) {
			console.error('Error setting up real-time chats:', error);
			errorMessage = 'Failed to load conversations. Please try again.';
			isLoading = false;
		}
	}

	// Set up real-time chats when user is available
	$: if (currentUser?.id && !chatsUnsubscribe) {
		setupRealtimeChats();
	}

	onDestroy(() => {
		if (chatsUnsubscribe) {
			chatsUnsubscribe();
		}
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
						{#if isLoading}
							Loading conversations...
						{:else}
							{chats.length} conversation{chats.length === 1 ? '' : 's'}
						{/if}
					</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Content -->
	<div class="scrollable-content flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="mb-6 inline-block h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"
					></div>
					<h3 class="mb-2 text-lg font-semibold text-slate-300">Loading Conversations</h3>
					<p class="text-slate-400">Setting up real-time messaging...</p>
				</div>
			</div>
		{:else if errorMessage}
			<div class="flex h-full items-center justify-center p-6">
				<div
					class="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm"
				>
					<div class="mb-6 inline-block rounded-full bg-red-500/20 p-4">
						<svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 class="mb-3 text-xl font-semibold text-red-300">Connection Error</h3>
					<p class="mb-6 text-sm text-red-200/80">{errorMessage}</p>
					<button
						class="rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 hover:shadow-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
						on:click={() => setupRealtimeChats()}
					>
						Retry Connection
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
						class="group block rounded-xl border border-slate-600/30 bg-slate-700/30 p-3.5 transition-all duration-200 hover:border-emerald-500/30 hover:bg-slate-600/40 hover:shadow-lg"
					>
						<div class="flex items-center gap-3">
							<!-- Avatar with Online Status -->
							<div class="relative flex-shrink-0">
								<img
									src={chat.avatarUrl || '/images/default-avatar.png'}
									alt="Avatar for {chat.displayName}"
									class="h-12 w-12 rounded-full border-2 border-slate-600 object-cover"
									loading="lazy"
								/>
								<!-- Online Status Indicator -->
								{#if chat.otherUserProfile?.id}
									<OnlineStatus userId={chat.otherUserProfile.id} size="sm" />
								{/if}
							</div>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center justify-between gap-2">
									<div class="flex min-w-0 flex-1 items-center gap-2">
										<h3
											class="truncate font-semibold text-emerald-300 group-hover:text-emerald-200"
										>
											{chat.displayName}
										</h3>
										{#if chat.otherUserProfile}
											{@const typeInfo = getUserTypeDisplay(chat.otherUserProfile.userType)}
											<span
												class="hidden items-center rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex {typeInfo.color} {typeInfo.bgColor} flex-shrink-0 border border-current/20"
											>
												{typeInfo.label}
											</span>
										{/if}
									</div>
									<span class="flex-shrink-0 text-xs text-slate-500 group-hover:text-slate-400">
										{formatLastSeen(chat.updatedAt)}
									</span>
								</div>

								<!-- User details -->
								{#if chat.otherUserProfile?.profile}
									<div
										class="mb-1.5 flex items-center gap-2 overflow-hidden text-xs text-slate-400"
									>
										{#if chat.otherUserProfile.userType === 'expert' && chat.otherUserProfile.profile.expertise}
											<span
												class="max-w-[120px] flex-shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
												>{chat.otherUserProfile.profile.expertise}</span
											>
										{:else if chat.otherUserProfile.userType === 'supplier' && chat.otherUserProfile.profile.category}
											<span
												class="max-w-[120px] flex-shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
												>{chat.otherUserProfile.profile.category}</span
											>
										{/if}
										{#if chat.otherUserProfile.profile.location}
											<span
												class="max-w-[100px] flex-shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
												>📍 {chat.otherUserProfile.profile.location}</span
											>
										{/if}
									</div>
								{/if}

								<!-- Last message -->
								<div class="flex items-center justify-between">
									<p class="flex-1 truncate text-sm text-slate-400 group-hover:text-slate-300">
										{chat.lastMessageSnippet}
									</p>
									{#if chat.unreadCount && chat.unreadCount > 0}
										<span
											class="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
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
