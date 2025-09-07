<!-- gefifi-2/src/frontend/src/lib/components/chat/MessageList.svelte -->
<script lang="ts">
	import { tick, createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AuthUser, Message } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	// Create event dispatcher for parent communication
	const dispatch = createEventDispatcher();

	// Child Components
	import AudioMessageView from '$lib/components/chat/AudioMessageView.svelte';
	import DateSeparator from '$lib/components/chat/DateSeparator.svelte';
	import TypingIndicator from '$lib/components/chat/TypingIndicator.svelte';
	import SystemMessage from '$lib/components/chat/SystemMessage.svelte';

	// --- PROPS ---
	export let isLoading: boolean = true;
	export let errorMessage: string = '';
	export let groupedMessages: Array<{ type: 'date' | 'message'; id: string; data: any }> = [];
	export let currentUser: AuthUser | null = null;
	export const chatId: string = '';
	export let isLoadingOlder: boolean = false;
	export let hasMoreMessages: boolean = true;
	export let infiniteScrollEnabled: boolean = true;
	export let typingUsers: Array<{ userId: string; userName: string }> = [];

	// --- INTERNAL STATE & BINDINGS ---
	let messagesContainer: HTMLElement;
	let isUserNearBottom: boolean = true;
	let previousScrollHeight: number = 0;
	let hasUserScrolled: boolean = false;

	// --- PUBLIC API (for parent component) ---
	export const scrollToBottom = async (behavior: 'smooth' | 'auto' = 'auto') => {
		// Wait for the DOM to update before scrolling
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior });
		}
	};

	export const isNearBottom = (): boolean => {
		if (!messagesContainer) return false;
		const threshold = 150; // Same threshold as in handleScroll
		return (
			messagesContainer.scrollHeight -
				messagesContainer.scrollTop -
				messagesContainer.clientHeight <
			threshold
		);
	};

	export const maintainScrollPosition = async () => {
		// Maintain scroll position after loading older messages
		await tick();
		if (messagesContainer && previousScrollHeight > 0) {
			const newScrollHeight = messagesContainer.scrollHeight;
			const heightDifference = newScrollHeight - previousScrollHeight;
			messagesContainer.scrollTop += heightDifference;
		}
	};

	// --- EVENT HANDLERS ---
	const handleScroll = () => {
		if (!messagesContainer) return;

		// Mark that user has scrolled (enables infinite scroll)
		if (!hasUserScrolled) {
			hasUserScrolled = true;
			console.log('[MessageList] User has scrolled - infinite scroll enabled');
		}

		const threshold = 150; // Pixels from the bottom
		const atBottom =
			messagesContainer.scrollHeight -
				messagesContainer.scrollTop -
				messagesContainer.clientHeight <
			threshold;
		isUserNearBottom = atBottom;

		// Check if user scrolled near the top to load older messages
		const nearTop = messagesContainer.scrollTop < 100;
		const shouldLoadOlder =
			nearTop &&
			hasMoreMessages &&
			!isLoadingOlder &&
			groupedMessages.length > 0 &&
			(infiniteScrollEnabled || hasUserScrolled);

		// Debug logging can be removed in production
		// if (nearTop) {
		// 	console.log('[MessageList] Near top detected:', {
		// 		nearTop, hasMoreMessages, isLoadingOlder, groupedMessagesLength: groupedMessages.length,
		// 		infiniteScrollEnabled, hasUserScrolled, shouldLoadOlder
		// 	});
		// }

		if (shouldLoadOlder) {
			console.log('[MessageList] Triggering loadOlderMessages');
			loadOlderMessages();
		}
	};

	const loadOlderMessages = () => {
		// Store current scroll height before loading
		previousScrollHeight = messagesContainer.scrollHeight;

		// Find the oldest message currently loaded (first message in the list)
		// Since messages are displayed oldest-first, the first message is the oldest
		const messageItems = groupedMessages.filter((item) => item.type === 'message');
		const oldestMessage = messageItems[0]?.data as Message;

		// Debug logging can be removed in production
		// console.log('[MessageList] loadOlderMessages called');
		// console.log('[MessageList] Total grouped messages:', groupedMessages.length);
		// console.log('[MessageList] Message items:', messageItems.length);
		// console.log('[MessageList] Oldest message:', oldestMessage?.id, oldestMessage?.timestamp);

		if (oldestMessage) {
			// Dispatch Svelte event to parent component
			dispatch('loadOlder', { lastMessage: oldestMessage });
		} else {
			console.warn('[MessageList] No oldest message found to load older messages');
		}
	};

	// --- HELPER FUNCTIONS ---
	const formatTimestamp = (timestamp: string): string =>
		new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const parseAndSanitize = (content: string): string => {
		if (typeof window !== 'undefined') {
			// Ensure links open in a new tab and are secure
			const rawHtml = marked.parse(content, { gfm: true, breaks: true }) as string;
			const sanitized = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
			// Post-process to add target="_blank" to all links
			const doc = new DOMParser().parseFromString(sanitized, 'text/html');
			doc.querySelectorAll('a').forEach((a) => {
				a.setAttribute('target', '_blank');
				a.setAttribute('rel', 'noopener noreferrer');
			});
			return doc.body.innerHTML;
		}
		return content; // Fallback for SSR (though unlikely to be rendered)
	};

	const handleUserMessageClick = (message: Message) => {
		// Only handle clicks for messages with entity references
		if (message.ExpertRequestId) {
			goto(`/my-requests/${message.ExpertRequestId}`);
		} else if (message.MaterialRequestId) {
			goto(`/my-requests/${message.MaterialRequestId}`);
		}
	};
</script>

<!--
  The fix for the scrolling button is this structure:
  1. A parent div with `position: relative` that takes up all the flex space.
  2. The scrolling container is inside and is absolutely positioned to fill the parent.
  3. The button is a sibling of the scrolling container, so it's positioned relative
     to the non-scrolling parent, making it appear fixed.
-->
<div class="relative flex-1">
	<div
		bind:this={messagesContainer}
		on:scroll={handleScroll}
		class="scrollable-content absolute inset-0 overflow-y-auto p-4"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<p class="text-slate-400">Loading messages...</p>
			</div>
		{:else if errorMessage}
			<div class="flex h-full items-center justify-center">
				<p class="text-center text-red-400">{errorMessage}</p>
			</div>
		{:else if groupedMessages.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="text-slate-500">No messages yet. Start the conversation!</p>
			</div>
		{:else}
			<div class="space-y-2">
				<!-- Loading indicator for older messages -->
				{#if isLoadingOlder}
					<div class="flex justify-center py-2">
						<div class="flex items-center gap-2 text-slate-400">
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
							></div>
							<span class="text-sm">Loading older messages...</span>
						</div>
					</div>
				{/if}

				{#each groupedMessages as item (item.id)}
					{#if item.type === 'date'}
						<DateSeparator timestamp={item.data.timestamp} />
					{:else if item.type === 'message'}
						{@const message = item.data as Message}
						<!-- System Message -->
						{#if message.senderId === 'system'}
							<SystemMessage {message} />
						{:else}
							<!-- User Message -->
							<div
								class="flex"
								class:justify-end={message.senderId === currentUser?.id}
								class:justify-start={message.senderId !== currentUser?.id}
							>
								{#if message.ExpertRequestId || message.MaterialRequestId}
									<!-- User Message with Clickable Action -->
									<div
										class="max-w-md rounded-xl px-3 py-2 shadow-md"
										class:rounded-br-none={message.senderId === currentUser?.id}
										class:bg-emerald-600={message.senderId === currentUser?.id}
										class:text-white={message.senderId === currentUser?.id}
										class:rounded-bl-none={message.senderId !== currentUser?.id}
										class:bg-slate-700={message.senderId !== currentUser?.id}
										class:text-slate-100={message.senderId !== currentUser?.id}
									>
										<!-- Message Content -->
										{#if message.audioType === 'voice'}
											<AudioMessageView {message} />
										{:else}
											{#if message.images && message.images.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.images as imageSrc (imageSrc)}
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

										<!-- Timestamp and Action Button Row -->
										<div
											class="mt-2 flex items-center justify-between gap-2"
											class:flex-row-reverse={message.senderId === currentUser?.id}
										>
											<!-- Timestamp -->
											<div
												class="text-xs"
												class:text-emerald-200={message.senderId === currentUser?.id}
												class:text-slate-400={message.senderId !== currentUser?.id}
											>
												{formatTimestamp(message.timestamp)}
											</div>

											<!-- View Request Button -->
											<button
												class="view-request-button group flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-lg transition-all duration-200 hover:scale-105 hover:border-emerald-400/50 hover:bg-slate-700 hover:shadow-lg hover:shadow-emerald-500/20"
												aria-label="View request details"
												on:click={() => handleUserMessageClick(message)}
											>
												<span>View request</span>
												<svg
													class="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"
													/>
												</svg>
											</button>
										</div>
									</div>
								{:else}
									<!-- Non-clickable User Message -->
									<div
										class="max-w-md rounded-xl px-3 py-2 shadow-md"
										class:rounded-br-none={message.senderId === currentUser?.id}
										class:bg-emerald-600={message.senderId === currentUser?.id}
										class:text-white={message.senderId === currentUser?.id}
										class:rounded-bl-none={message.senderId !== currentUser?.id}
										class:bg-slate-700={message.senderId !== currentUser?.id}
										class:text-slate-100={message.senderId !== currentUser?.id}
									>
										<!-- Message Content -->
										{#if message.audioType === 'voice'}
											<AudioMessageView {message} />
										{:else}
											{#if message.images && message.images.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.images as imageSrc (imageSrc)}
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
								{/if}
							</div>
						{/if}
					{/if}
				{/each}

				<!-- Typing indicator -->
				<TypingIndicator {typingUsers} />
			</div>
		{/if}
	</div>

	{#if !isUserNearBottom}
		<button
			on:click={() => scrollToBottom('smooth')}
			class="absolute right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-600/40 text-white backdrop-blur-sm transition-transform hover:scale-110"
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

	/* View Request Button Hover Effects */
	.view-request-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
	}
</style>
