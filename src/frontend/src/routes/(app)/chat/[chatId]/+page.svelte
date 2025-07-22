<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	import ChatInputController from '$lib/components/chat/ChatInputController.svelte';
	import AudioMessageView from '$lib/components/chat/AudioMessageView.svelte';
	import type { Message, UserProfile, Chat } from '$lib/types';

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let messages: Message[] = [];
	let isLoading = true;
	let errorMessage = '';
	let chatId: string;
	let isSendingMessage = false;

	let currentChatDetails: Chat | null = null;
	let otherParticipantProfile: UserProfile | null = null;
	let chatPageTitle = 'Chat';

	let messagesContainer: HTMLElement;
	let shouldAutoScroll = true;
	let isNearBottom = true;
	let hasInitiatedLoad = false;

	// --- SvelteKit Lifecycle & Reactive Data ---

	// Subscribe to stores at the component level
	$: chatId = $page.params.chatId;
	$: ({ user: currentUser, token } = $authStore);

	// This reactive statement is the key fix. It will run whenever its dependencies
	// (chatId, token, currentUser) change, ensuring we have all the data we need
	// before trying to load the chat.
	$: if (chatId && token && currentUser && !hasInitiatedLoad) {
		hasInitiatedLoad = true; // Prevent re-triggering on minor reactive changes
		console.log('[Debug] Reactive trigger: All data available. Loading chat details...');
		loadChatAndParticipantDetails(chatId);
	}

	// --- Scrolling Logic ---

	function checkIfNearBottom(): boolean {
		if (!messagesContainer) return true;
		const threshold = 150; // Pixels from the bottom
		return (
			messagesContainer.scrollHeight -
				messagesContainer.scrollTop -
				messagesContainer.clientHeight <
			threshold
		);
	}

	async function scrollToBottom(behavior: 'smooth' | 'auto' = 'auto') {
		await tick(); // Wait for the DOM to update
		if (messagesContainer) {
			messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior });
		}
	}

	function handleScroll() {
		shouldAutoScroll = checkIfNearBottom();
	}

	// --- Data Loading Logic ---

	async function loadChatAndParticipantDetails(cId: string) {
		if (!token || !currentUser) {
			errorMessage = 'Authentication error. Cannot load chat.';
			return;
		}
		isLoading = true;
		errorMessage = '';

		try {
			console.log(`[Debug] Fetching details for chat ID: ${cId}`);
			const chatRes = await fetch(`${API_BASE_URL}/api/chat/${cId}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!chatRes.ok) {
				const errorText = await chatRes.text();
				throw new Error(
					`Failed to load chat details. Server responded with ${chatRes.status}: ${errorText}`
				);
			}
			currentChatDetails = await chatRes.json();

			const otherParticipantId = currentChatDetails?.participants.find(
				(p) => p !== currentUser?.id
			);

			if (otherParticipantId) {
				const userRes = await fetch(`${API_BASE_URL}/api/users/${otherParticipantId}`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (userRes.ok) {
					otherParticipantProfile = await userRes.json();
				}
			}

			chatPageTitle = getChatTitle();
			await fetchMessages(cId);
		} catch (err: any) {
			console.error('[Debug] CRITICAL ERROR in loadChatAndParticipantDetails:', err);
			errorMessage = err.message || 'Could not load chat information.';
		} finally {
			isLoading = false;
		}
	}

	async function fetchMessages(cId: string) {
		if (!token) return;
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${cId}/messages`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) throw new Error('Failed to fetch messages.');
			const data = await response.json();
			messages = data.messages || [];
			await scrollToBottom('auto');
		} catch (err: any) {
			throw err; // Re-throw to be caught by the parent function
		}
	}

	// --- Message Sending Logic ---

	async function handleSendMessage(event: CustomEvent<{ content: string }>) {
		if (!token || !chatId) return;
		isSendingMessage = true;
		shouldAutoScroll = true; // Always scroll when we send a message

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify(event.detail)
			});
			if (!response.ok) throw new Error('Failed to send message.');
			const sentMessage: Message = await response.json();
			messages = [...messages, sentMessage];
			if (shouldAutoScroll) await scrollToBottom('smooth');
		} catch (err: any) {
			console.error('Send message error:', err);
		} finally {
			isSendingMessage = false;
		}
	}

	async function handleSendVoiceMessage(
		event: CustomEvent<{ audioUrl: string; audioDuration: number }>
	) {
		if (!token || !chatId) return;
		isSendingMessage = true;
		shouldAutoScroll = true;
		try {
			const payload = {
				audioType: 'voice' as const,
				audioUrl: event.detail.audioUrl,
				audioDuration: event.detail.audioDuration
			};
			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify(payload)
			});
			if (!response.ok) throw new Error('Failed to send voice message.');
			const sentMessage: Message = await response.json();
			messages = [...messages, sentMessage];
			if (shouldAutoScroll) await scrollToBottom('smooth');
		} catch (err: any) {
			console.error('Send voice message error:', err);
		} finally {
			isSendingMessage = false;
		}
	}

	async function handleSendImage(event: CustomEvent<{ file: File }>) {
		if (!token || !chatId) return;
		const file = event.detail.file;
		isSendingMessage = true;
		shouldAutoScroll = true;
		const formData = new FormData();
		formData.append('file', file);

		try {
			const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData
			});
			if (!uploadResponse.ok) throw new Error('Image upload failed.');
			const uploadResult = await uploadResponse.json();
			const imagePath = uploadResult.filePath;

			const payload = { content: '', images: [imagePath] };
			const messageResponse = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify(payload)
			});
			if (!messageResponse.ok) throw new Error('Failed to send image message.');
			const sentMessage: Message = await messageResponse.json();
			messages = [...messages, sentMessage];
			if (shouldAutoScroll) await scrollToBottom('smooth');
		} catch (err: any) {
			console.error('Send image error:', err);
		} finally {
			isSendingMessage = false;
		}
	}

	// --- Helper Functions ---

	function getChatTitle(): string {
		if (!otherParticipantProfile) return 'Chat';
		const { fullName, companyName } = otherParticipantProfile.profile || {};
		return fullName || companyName || 'User';
	}

	function parseAndSanitize(content: string): string {
		if (typeof window !== 'undefined') {
			return DOMPurify.sanitize(marked.parse(content, { gfm: true, breaks: true }));
		}
		return content;
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	$: isNearBottom = checkIfNearBottom();
</script>

<div class="flex h-full flex-col bg-slate-900">
	<!-- Header -->
	<header
		class="sticky top-0 z-20 border-b border-slate-700/50 bg-slate-800/60 p-3 backdrop-blur-sm"
	>
		<div class="flex items-center justify-between">
			<div class="flex min-w-0 items-center gap-3">
				<button
					on:click={() => goto('/chat')}
					class="flex-shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
					aria-label="Back to chat list"
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				{#if isLoading}
					<div class="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-700" />
					<div class="min-w-0 flex-1 space-y-2">
						<div class="h-4 w-32 animate-pulse rounded bg-slate-700" />
						<div class="h-3 w-20 animate-pulse rounded bg-slate-700" />
					</div>
				{:else if otherParticipantProfile}
					<img
						src={otherParticipantProfile.profile?.avatarUrl || '/images/default-avatar.png'}
						alt="Avatar"
						class="h-10 w-10 flex-shrink-0 rounded-full border-2 border-slate-600 object-cover"
					/>
					<div class="min-w-0 flex-1">
						<h2 class="truncate font-semibold text-slate-200">{chatPageTitle}</h2>
						<p class="truncate text-sm text-slate-400">Online</p>
					</div>
				{/if}
			</div>

			{#if currentChatDetails?.workRequestId}
				<button
					on:click={() => goto(`/work-requests/${currentChatDetails?.workRequestId}`)}
					class="flex-shrink-0 rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-slate-600"
					aria-label="View associated work request"
				>
					View Request
				</button>
			{/if}
		</div>
	</header>

	<!-- Message List -->
	<div
		bind:this={messagesContainer}
		on:scroll={handleScroll}
		class="relative flex-1 overflow-y-auto p-4"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<p class="text-slate-400">Loading messages...</p>
			</div>
		{:else if errorMessage}
			<div class="flex h-full items-center justify-center">
				<p class="text-center text-red-400">{errorMessage}</p>
			</div>
		{:else if messages.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="text-slate-500">No messages yet. Start the conversation!</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each messages as message (message.id)}
					<div
						class="flex"
						class:justify-end={message.senderId === currentUser?.id}
						class:justify-start={message.senderId !== currentUser?.id}
					>
						<div
							class="max-w-md rounded-xl px-3 py-2 shadow-md"
							class:rounded-br-none={message.senderId === currentUser?.id}
							class:bg-emerald-600={message.senderId === currentUser?.id}
							class:text-white={message.senderId === currentUser?.id}
							class:rounded-bl-none={message.senderId !== currentUser?.id}
							class:bg-slate-700={message.senderId !== currentUser?.id}
							class:text-slate-100={message.senderId !== currentUser?.id}
						>
							{#if message.audioType === 'voice'}
								<AudioMessageView {message} />
							{:else}
								{#if message.images && message.images.length > 0}
									<div class="mb-2 space-y-2">
										{#each message.images as imageSrc}
											<img
												src={imageSrc}
												alt="Chat attachment"
												class="max-w-xs rounded-lg border border-slate-600 object-contain"
											/>
										{/each}
									</div>
								{/if}
								{#if message.content && message.content.trim()}
									<div class="prose prose-sm prose-p:my-1 max-w-none text-inherit">
										{@html parseAndSanitize(message.content)}
									</div>
								{/if}
							{/if}
							<div
								class="mt-1 text-xs"
								class:text-right={message.senderId === currentUser?.id}
								class:text-emerald-200={message.senderId === currentUser?.id}
								class:text-left={message.senderId !== currentUser?.id}
								class:text-slate-400={message.senderId !== currentUser?.id}
							>
								{formatTimestamp(message.timestamp)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if !isNearBottom}
			<button
				on:click={() => scrollToBottom('smooth')}
				class="absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-600/80 text-white backdrop-blur-sm transition-transform hover:scale-110"
				aria-label="Scroll to bottom"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Message Input Controller -->
	<ChatInputController
		bind:isSending={isSendingMessage}
		on:sendMessage={handleSendMessage}
		on:sendVoiceMessage={handleSendVoiceMessage}
		on:sendImage={handleSendImage}
	/>
</div>
