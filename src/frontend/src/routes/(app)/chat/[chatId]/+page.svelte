<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	type Message = {
		id: string;
		chatId: string;
		senderId: string;
		content: string;
		timestamp: string;
		images?: string[];
		// Potentially add sender details like name/avatar if fetched
		senderName?: string;
		senderAvatar?: string;
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let messages: Message[] = [];
	let isLoading = true;
	let errorMessage = '';
	let chatId: string | null = null;
	let newMessageContent = '';
	let isSendingMessage = false;

	// For auto-scrolling
	let messagesContainer: HTMLElement;
	let shouldScrollToBottom = false;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchMessages(cId: string) {
		isLoading = true;
		errorMessage = '';
		if (!token) {
			errorMessage = 'Authentication token not available.';
			isLoading = false;
			return;
		}
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${cId}/messages`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to fetch messages.' }));
				throw new Error(errorData.message);
			}
			const fetchedMessages = await response.json();
			// TODO: Enrich messages with sender details (name, avatar) by fetching user profiles based on senderId
			// This is a common N+1 problem, so backend might ideally provide sender details with messages.
			messages = fetchedMessages.map((msg: any) => ({ ...msg }));
			shouldScrollToBottom = true; // Scroll after messages are loaded
		} catch (err: any) {
			console.error('Fetch messages error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function handleSendMessage() {
		if (!newMessageContent.trim() || !chatId || !token || !currentUser) return;
		isSendingMessage = true;
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ content: newMessageContent })
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to send message.' }));
				throw new Error(errorData.message);
			}
			const sentMessage = await response.json();
			messages = [...messages, sentMessage];
			newMessageContent = '';
			shouldScrollToBottom = true; // Scroll after new message is added
		} catch (err: any) {
			console.error('Send message error:', err);
			// Display error to user, maybe a toast notification
			alert(`Error sending message: ${err.message}`);
		} finally {
			isSendingMessage = false;
		}
	}

	onMount(() => {
		chatId = $page.params.chatId;
		if (chatId) {
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					fetchMessages(chatId!);
					unsubscribe();
					// TODO: Implement polling or WebSocket for real-time messages
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated or details missing.';
					isLoading = false;
					unsubscribe();
				}
			});
		} else {
			errorMessage = 'Chat ID not found in URL.';
			isLoading = false;
		}
	});

	afterUpdate(() => {
		if (shouldScrollToBottom && messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
			shouldScrollToBottom = false;
		}
	});

	function formatDate(timestamp: string) {
		if (!timestamp) return '';
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Placeholder function to get sender name - ideally fetched and stored with message or user store
	function getSenderName(senderId: string): string {
		if (senderId === currentUser?.id) return 'You';
		// TODO: Fetch other user's name based on senderId
		// For now, returning a generic name or part of ID
		return `User ${senderId.substring(0, 6)}...`;
	}
</script>

<div
	class="mx-auto flex h-[calc(100vh-var(--header-height,10rem))] max-w-3xl flex-col overflow-hidden rounded-t-lg bg-slate-800 shadow-xl"
>
	<!-- Chat Header (Optional - could show other participant's name) -->
	<header class="sticky top-0 z-10 border-b border-slate-700 bg-slate-700/50 p-4">
		<div class="flex items-center space-x-3">
			<button
				on:click={() => goto('/chat')}
				class="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-slate-600 hover:text-emerald-400"
				aria-label="Back to chats"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-6 w-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
				</svg>
			</button>
			<h2 class="truncate text-xl font-semibold text-emerald-400">
				Chat
				{#if chatId}<span class="ml-2 text-xs text-slate-500">ID: {chatId.substring(0, 8)}...</span
					>{/if}
			</h2>
		</div>
	</header>

	<!-- Messages Area -->
	<div
		bind:this={messagesContainer}
		class="flex-1 space-y-4 overflow-y-auto bg-slate-800 p-4 sm:p-6"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<svg
					class="h-8 w-8 animate-spin text-emerald-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					><circle class="opacity-75" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle><path
						class="opacity-50"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path></svg
				>
				<p class="ml-3 text-slate-300">Loading messages...</p>
			</div>
		{:else if errorMessage}
			<div class="rounded-md bg-red-700/20 p-6 text-center text-red-300">
				<p class="font-semibold">Error: {errorMessage}</p>
				<button
					on:click={() => fetchMessages(chatId!)}
					class="mt-3 rounded-md bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600"
					>Try Again</button
				>
			</div>
		{:else if messages.length === 0}
			<div class="py-10 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="mx-auto mb-3 h-12 w-12 text-slate-500"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12H21zM5.25 12C5.25 9.103 7.353 6.75 10.125 6.75s4.875 2.353 4.875 5.25H5.25z"
					/>
				</svg>
				<p class="text-slate-400">No messages in this chat yet. Send the first one!</p>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<div
					class="flex flex-col space-y-0.5 {message.senderId === currentUser?.id
						? 'items-end'
						: 'items-start'}"
				>
					<div
						class="rounded-xl px-4 py-2.5 shadow-md {message.senderId === currentUser?.id
							? 'rounded-br-none bg-emerald-600 text-white'
							: 'rounded-bl-none bg-slate-600 text-slate-100'}"
					>
						<p class="break-words whitespace-pre-wrap">{message.content}</p>
						<!-- TODO: Display images if message.images exist -->
					</div>
					<div
						class="px-1 text-xs {message.senderId === currentUser?.id
							? 'text-right text-slate-500'
							: 'text-left text-slate-400'}"
					>
						<span>{getSenderName(message.senderId)}</span> at
						<span>{formatDate(message.timestamp)}</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Message Input Area -->
	<div class="sticky bottom-0 border-t border-slate-700 bg-slate-700/50 p-3 sm:p-4">
		<form
			on:submit|preventDefault={handleSendMessage}
			class="flex items-center space-x-2 sm:space-x-3"
		>
			<input
				type="text"
				bind:value={newMessageContent}
				placeholder="Type your message..."
				class="flex-1 rounded-lg border-slate-500/70 bg-slate-600 px-4 py-2.5 text-sm text-slate-100 transition-colors duration-150 outline-none placeholder:text-slate-400/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-base"
				disabled={isSendingMessage || isLoading}
			/>
			<!-- TODO: Add button for image upload in chat -->
			<button
				type="submit"
				disabled={isSendingMessage || !newMessageContent.trim()}
				class="focus:ring-opacity-75 rounded-lg bg-emerald-500 p-2.5 font-semibold text-white shadow transition-colors duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-md focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:bg-slate-500 sm:px-5 sm:py-2.5"
				aria-label="Send message"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-5 w-5 sm:h-6 sm:w-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
					/>
				</svg>
			</button>
		</form>
	</div>
</div>

<style>
	/* Define a variable for header height to be used in h-screen calculation if layout changes */
	/* For example, if the (app) layout header is 64px, and this page's header is 68px */
	/* :root {
    --chat-page-header-height: 68px;
    --effective-screen-height: calc(100vh - var(--app-layout-header-height, 0px) - var(--chat-page-header-height));
  }
  .h-chat-area {
      height: var(--effective-screen-height);
  } */
	/* For simplicity, using a fixed offset in h-[calc(...)] for now.
     Assumes parent layout header + this page header totals about 10rem (a rough estimate) for viewport height adjustment.
     This can be made more precise if needed, e.g. using a store for layout dimensions or CSS variables passed down. */
</style>
