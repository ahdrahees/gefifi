<script lang="ts">
	import { onDestroy } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import apiClient from '$lib/api';
	import type { Chat, EnrichedChat, UserProfileUI } from '$lib/types';
	import type { Unsubscribe } from 'firebase/firestore';
	import Avatar from '$lib/components/Avatar.svelte';
	import OnlineStatus from '$lib/components/chat/OnlineStatus.svelte';

	interface Props {
		recentChats?: EnrichedChat[];
	}

	let { recentChats = $bindable([]) }: Props = $props();

	let currentUser: AuthUser | null = $derived($authStore.user);
	let fetchedUserProfiles = new Map<string, UserProfileUI>();
	let chatsUnsubscribe: Unsubscribe | null = $state(null);

	function formatLastSeen(dateString: string) {
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

	function formatDisplayName(otherUser: UserProfileUI | undefined): string {
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
			let otherUserProfile: UserProfileUI | undefined = undefined;

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
				lastMessageSnippet
			} as EnrichedChat;
		});
	}

	async function setupRealtimeChats(): Promise<void> {
		if (!currentUser?.id || chatsUnsubscribe) return;

		try {
			// Set up real-time chat list subscription (limit to 5 for recent chats)
			chatsUnsubscribe = realtimeChatService.subscribeToUserChats(
				currentUser.id,
				async (rawChats) => {
					// Limit to 5 most recent chats
					const limitedChats = rawChats.slice(0, 5);

					// Collect all participant IDs for profile fetching
					const allParticipantIds = new Set<string>();
					limitedChats.forEach((chat) => {
						chat.participants
							.filter((pId) => pId !== currentUser?.id)
							.forEach((pId) => allParticipantIds.add(pId));
					});

					// Fetch user profiles for participants we don't have yet
					await fetchUserProfiles(Array.from(allParticipantIds));

					// Enrich chats with user profiles and display info
					recentChats = enrichChats(limitedChats);
				}
			);
		} catch (error) {
			console.error('Error setting up real-time chats in RecentChatsPanel:', error);
		}
	}

	// Set up real-time chats when user is available
	$effect(() => {
		if (currentUser?.id && !chatsUnsubscribe) {
			setupRealtimeChats();
		}
	});

	onDestroy(() => {
		if (chatsUnsubscribe) {
			chatsUnsubscribe();
		}
	});
</script>

<section
	class="flex h-full flex-1 flex-col rounded-xl bg-slate-700/40 p-5 shadow-lg backdrop-blur-sm"
>
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h2 class="text-xl font-semibold text-emerald-400">Recent Chats</h2>
		</div>
		<a
			href="/chat"
			class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-400/20 hover:text-emerald-200 hover:shadow-md"
			title="View all conversations"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
				/>
			</svg>
			<span>View All</span>
		</a>
	</div>

	{#if recentChats && recentChats.length > 0}
		<div
			class="scrollable-content flex-1 space-y-2 overflow-y-auto pr-1"
			style="max-height: 24rem;"
		>
			{#each recentChats as chat (chat.id)}
				<a
					href={`/chat/${chat.id}`}
					class="group block rounded-xl border border-slate-600/30 bg-slate-700/30 p-3.5 transition-all duration-200 hover:border-emerald-500/30 hover:bg-slate-600/40 hover:shadow-lg"
					title={`Chat with ${chat.displayName || 'user'}`}
				>
					<div class="flex items-center gap-3">
						<!-- Avatar with Online Status -->
						<div class="relative">
							<Avatar url={chat.avatarUrl} size="sm" name={chat.displayName} />
							{#if chat.otherUserProfile?.id}
								<OnlineStatus userId={chat.otherUserProfile.id} size="md" />
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<p class="truncate font-semibold text-emerald-300 group-hover:text-emerald-200">
										{chat.displayName || 'Unknown User'}
									</p>
									{#if chat.otherUserProfile}
										{@const info = getUserTypeDisplay(chat.otherUserProfile.userType)}
										<span
											class="hidden items-center rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex {info.color} {info.bgColor} border border-current/20"
										>
											{info.label}
										</span>
									{/if}
								</div>
								<span class="shrink-0 text-xs text-slate-500 group-hover:text-slate-400"
									>{formatLastSeen(chat.updatedAt)}</span
								>
							</div>

							{#if chat.otherUserProfile?.profile}
								<div
									class="mb-1.5 flex items-center gap-2 overflow-hidden text-[11px] text-slate-400"
								>
									{#if chat.otherUserProfile.userType === 'expert' && chat.otherUserProfile.profile.expertise}
										<span
											class="max-w-[120px] shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
											>{chat.otherUserProfile.profile.expertise}</span
										>
									{:else if chat.otherUserProfile.userType === 'supplier' && chat.otherUserProfile.profile.category}
										<span
											class="max-w-[120px] shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
											>{chat.otherUserProfile.profile.category}</span
										>
									{/if}
									{#if chat.otherUserProfile.profile.location}
										<span
											class="max-w-[100px] shrink-0 truncate rounded-md bg-slate-600/30 px-1.5 py-0.5"
											>📍 {chat.otherUserProfile.profile.location}</span
										>
									{/if}
								</div>
							{/if}
							<p class="line-clamp-1 text-xs text-slate-400 group-hover:text-slate-300">
								{chat.lastMessageSnippet}
							</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="mb-3 inline-block rounded-full bg-slate-600/30 p-4">
					<svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<p class="text-sm text-slate-400">No recent conversations</p>
				<p class="text-xs text-slate-500">Start chatting to see them here</p>
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
