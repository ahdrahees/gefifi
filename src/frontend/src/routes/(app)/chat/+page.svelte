<!-- gefifi-2/src/frontend/src/routes/(app)/chat/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string; // Allow string for flexibility
		profile?: {
			fullName?: string;
			companyName?: string;
			mainExpertise?: string;
			mainMaterial?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	type ChatListItem = {
		id: string;
		// Assuming the backend provides a way to get a display name for the chat
		// This might be the other participant's name or a group chat title.
		// For one-on-one chats, we'll need to fetch user details for other participants.
		// For now, let's use participant IDs and a generic title, then enhance.
		participantIds: string[];
		workRequestId?: string;
		lastMessageSnippet?: string; // This would ideally come from the server or be derived
		unreadCount?: number; // Also ideally from server
		updatedAt: string; // From Chat object
		// We will need to fetch actual participant names for display
		displayName?: string;
		// We might also fetch the last message for the snippet
		lastMessage?: any;
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

	function trimString(str: string | undefined | null, maxLength: number): string {
		if (!str) return '';
		if (str.length <= maxLength) return str;
		return str.substring(0, maxLength) + '...';
	}

	function formatDisplayName(
		otherUser: UserProfile | undefined,
		currentUser: AuthUser | null
	): string {
		if (!otherUser || !otherUser.profile) {
			return `User ${otherUser?.id?.substring(0, 8) || 'Unknown'}...`; // Fallback
		}

		const { userType, profile } = otherUser;
		// Ensure profile is not undefined for destructuring
		const { fullName, companyName, mainExpertise, mainMaterial, location } = profile || {};

		if (userType === 'customer') {
			return fullName || `Customer ${otherUser.id.substring(0, 4)}...`;
		} else if (userType === 'expert') {
			const expertisePart = trimString(mainExpertise, 12);
			const parts = [fullName, expertisePart, location].filter(Boolean); // Filter out empty/null values
			return parts.join(' | ') || `Expert ${otherUser.id.substring(0, 4)}...`;
		} else if (userType === 'supplier') {
			const materialPart = trimString(mainMaterial, 12);
			const parts = [companyName, materialPart, location].filter(Boolean); // Filter out empty/null values
			return parts.join(' | ') || `Supplier ${otherUser.id.substring(0, 4)}...`;
		}
		// Default fallback if userType is unknown or profile details are missing
		return fullName || companyName || `User ${otherUser.id.substring(0, 8)}...`;
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
			const rawChats: any[] = await response.json();

			// Collect all unique other participant IDs
			const allOtherParticipantIds = new Set<string>();
			rawChats.forEach((chat) => {
				(chat.participants as string[])
					.filter((pId: string) => pId !== currentUser?.id)
					.forEach((pId: string) => allOtherParticipantIds.add(pId));
			});

			// Fetch profiles for unique IDs not already cached
			// Use Promise.all to fetch concurrently
			await Promise.all(
				Array.from(allOtherParticipantIds).map(async (pId) => {
					if (!fetchedUserProfiles.has(pId) && token) {
						// Ensure token is available
						try {
							const userRes = await fetch(`${API_BASE_URL}/api/users/${pId}`, {
								headers: { Authorization: `Bearer ${token}` }
							});
							if (userRes.ok) {
								const userData: UserProfile = await userRes.json();
								fetchedUserProfiles.set(pId, userData);
							} else {
								console.warn(`Failed to fetch profile for user ${pId}: ${userRes.statusText}`);
								// Store a minimal representation or undefined to prevent constant refetching on errors
								fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' });
							}
						} catch (e) {
							console.error(`Error fetching profile for user ${pId}`, e);
							fetchedUserProfiles.set(pId, { id: pId, email: '', userType: 'unknown' }); // Mark as fetched with error
						}
					}
				})
			);

			const enrichedChats: ChatListItem[] = rawChats.map((chat) => {
				let displayName = 'Chat';
				const otherParticipantIds = (chat.participants as string[]).filter(
					(pId: string) => pId !== currentUser?.id
				);

				if (otherParticipantIds.length > 0) {
					// For one-on-one chats, use the first other participant's ID
					const otherPId = otherParticipantIds[0];
					const otherUserProfile = fetchedUserProfiles.get(otherPId);
					displayName = formatDisplayName(otherUserProfile, currentUser);
				} else if (
					(chat.participants as string[]).length === 1 &&
					chat.participants[0] === currentUser?.id
				) {
					displayName = 'Personal Notes / Self Chat';
				}

				return {
					id: chat.id,
					participantIds: chat.participants as string[],
					workRequestId: chat.workRequestId,
					updatedAt: chat.updatedAt,
					displayName: displayName,
					lastMessageSnippet: 'Tap to view messages...', // Placeholder
					unreadCount: 0 // Placeholder, backend should provide this
				};
			});

			chats = enrichedChats.sort(
				(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
		} catch (err: any) {
			console.error('Chat list fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading chats.';
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
				unsubscribe();
			} else if (!auth.isLoading && !auth.user) {
				errorMessage = 'User not authenticated.';
				isLoading = false;
				unsubscribe();
			}
		});
	});

	function formatDate(dateString: string): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
	}
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<h1 class="text-3xl font-bold text-emerald-400">Chat Inbox</h1>
		<!-- Placeholder for a 'New Chat' button if applicable -->
		<!-- <button class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">New Chat</button> -->
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
			<p class="text-slate-300">Loading your chats...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300 shadow">
			<h3 class="text-lg font-bold">Error Loading Chats</h3>
			<p>{errorMessage}</p>
			<button
				class="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
				on:click={fetchChats}>Try Again</button
			>
		</div>
	{:else if chats.length === 0}
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
					d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12H21zM5.25 12C5.25 9.103 7.353 6.75 10.125 6.75s4.875 2.353 4.875 5.25H5.25z"
				/>
			</svg>
			<h2 class="mb-2 text-xl font-semibold text-sky-400">No Chats Yet</h2>
			<p class="text-slate-300">
				You haven't started any conversations. Express interest in a work request or contact a
				provider to begin.
			</p>
		</div>
	{:else}
		<div class="space-y-3 rounded-lg bg-slate-700/40 p-3 shadow-md sm:p-4">
			{#each chats as chat (chat.id)}
				<a
					href={`/chat/${chat.id}`}
					class="focus:ring-opacity-75 block rounded-lg bg-slate-600/70 p-4 shadow-sm transition-all duration-150 ease-in-out hover:bg-slate-500/70 hover:shadow-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					aria-label="Open chat with {chat.displayName}"
				>
					<div class="mb-1.5 flex items-start justify-between">
						<p class="truncate pr-2 text-base font-semibold text-sky-300" title={chat.displayName}>
							{chat.displayName || 'Chat'}
						</p>
						{#if chat.unreadCount && chat.unreadCount > 0}
							<span
								class="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white"
							>
								{chat.unreadCount}
							</span>
						{/if}
					</div>
					<p class="mb-2 truncate text-sm text-slate-300" title={chat.lastMessageSnippet}>
						{chat.lastMessageSnippet || 'No messages yet...'}
					</p>
					<p class="text-right text-xs text-slate-400/80">
						Last activity: {formatDate(chat.updatedAt)}
					</p>
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- 
  TODO for Chat List:
  - Implement fetching actual participant names (requires a /api/users/:id endpoint or similar).
  - Fetch actual last message snippet and unread counts from the backend (API needs to support this).
  - Consider real-time updates for chat list (new messages, unread counts).
  - Add a "New Chat" button/functionality if users can initiate chats outside of work requests.
-->

<style>
	/* Page specific styles if any */
</style>
