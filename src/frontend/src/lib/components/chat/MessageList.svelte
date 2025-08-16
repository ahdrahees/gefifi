<!-- gefifi-2/src/frontend/src/lib/components/chat/MessageList.svelte -->
<script lang="ts">
	import { tick } from 'svelte';
	import type { AuthUser, Message } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	// Child Components
	import AudioMessageView from '$lib/components/chat/AudioMessageView.svelte';
	import DateSeparator from '$lib/components/chat/DateSeparator.svelte';
	import TypingIndicator from '$lib/components/chat/TypingIndicator.svelte';

	// --- PROPS ---
	export let isLoading: boolean = true;
	export let errorMessage: string = '';
	export let groupedMessages: Array<{ type: 'date' | 'message'; id: string; data: any }> = [];
	export let currentUser: AuthUser | null = null;
	export let chatId: string = '';
	export let isLoadingOlder: boolean = false;
	export let hasMoreMessages: boolean = true;

	// --- INTERNAL STATE & BINDINGS ---
	let messagesContainer: HTMLElement;
	let isNearBottom: boolean = true;
	let previousScrollHeight: number = 0;

	// --- PUBLIC API (for parent component) ---
	export const scrollToBottom = async (behavior: 'smooth' | 'auto' = 'auto') => {
		// Wait for the DOM to update before scrolling
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior });
		}
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

		const threshold = 150; // Pixels from the bottom
		const atBottom =
			messagesContainer.scrollHeight -
				messagesContainer.scrollTop -
				messagesContainer.clientHeight <
			threshold;
		isNearBottom = atBottom;

		// Check if user scrolled near the top to load older messages
		const nearTop = messagesContainer.scrollTop < 100;
		if (nearTop && hasMoreMessages && !isLoadingOlder && groupedMessages.length > 0) {
			loadOlderMessages();
		}
	};

	const loadOlderMessages = () => {
		// Store current scroll height before loading
		previousScrollHeight = messagesContainer.scrollHeight;

		// Find the first message (oldest currently loaded)
		const firstMessage = groupedMessages.find((item) => item.type === 'message')?.data as Message;
		if (firstMessage) {
			// Dispatch event to parent to load older messages
			const event = new CustomEvent('loadOlder', {
				detail: { lastMessage: firstMessage }
			});
			messagesContainer.dispatchEvent(event);
		}
	};

	// --- HELPER FUNCTIONS ---
	const formatTimestamp = (timestamp: string): string =>
		new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const parseAndSanitize = (content: string): string => {
		if (typeof window !== 'undefined') {
			// Ensure links open in a new tab and are secure
			const rawHtml = marked.parse(content, { gfm: true, breaks: true });
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
		class="absolute inset-0 overflow-y-auto p-4"
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
							<div class="flex items-center justify-center py-2">
								<div
									class="flex items-center justify-center gap-2 rounded-full bg-slate-700/50 px-4 py-2"
								>
									<svg
										class="h-4 w-4 text-slate-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>

									<span class="text-[11px] text-slate-400 sm:text-xs"
										>{@html parseAndSanitize(message.content)}</span
									>
								</div>
							</div>
						{:else}
							<!-- User Message -->
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
							</div>
						{/if}
					{/if}
				{/each}

				<!-- Typing indicator -->
				{#if chatId && currentUser}
					<TypingIndicator {chatId} currentUserId={currentUser.id} />
				{/if}
			</div>
		{/if}
	</div>

	{#if !isNearBottom}
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
