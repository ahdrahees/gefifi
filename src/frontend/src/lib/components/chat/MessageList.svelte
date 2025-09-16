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

	// --- FILE TYPE UTILITIES ---
	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function getFileTypeDescription(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'Image';
		if (extension === 'pdf') return 'PDF Document';
		if (['doc', 'docx'].includes(extension)) return 'Word Document';
		if (['xls', 'xlsx'].includes(extension)) return 'Excel Spreadsheet';
		if (extension === 'dwg') return 'AutoCAD Drawing';
		if (extension === 'dxf') return 'DXF Drawing';
		return 'Document';
	}

	function getFileTypeClasses(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
			return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
		}
		if (extension === 'pdf') return 'bg-red-500/20 text-red-300 border-red-500/30';
		if (['doc', 'docx'].includes(extension))
			return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
		if (['xls', 'xlsx'].includes(extension))
			return 'bg-green-500/20 text-green-300 border-green-500/30';
		if (['dwg', 'dxf'].includes(extension))
			return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
		return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
	}

	function formatBytes(bytes: number, decimals = 1): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	function isViewableFile(fileName: string): boolean {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(extension);
	}

	// --- IMAGE MODAL STATE ---
	let showImageModal = false;
	let modalImageSrc = '';
	let imageScale = 1;
	let imagePosition = { x: 0, y: 0 };
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };
	let imageElement: HTMLImageElement;

	function openImageModal(imageSrc: string) {
		modalImageSrc = imageSrc;
		showImageModal = true;
		// Reset zoom and position when opening
		imageScale = 1;
		imagePosition = { x: 0, y: 0 };
	}

	function closeImageModal() {
		showImageModal = false;
		modalImageSrc = '';
		// Reset state
		imageScale = 1;
		imagePosition = { x: 0, y: 0 };
		isDragging = false;
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.1, Math.min(5, imageScale * delta));
		imageScale = newScale;
	}

	function handleMouseDown(event: MouseEvent) {
		if (imageScale > 1) {
			event.preventDefault(); // Prevent default drag behavior
			isDragging = true;
			dragStart = { x: event.clientX - imagePosition.x, y: event.clientY - imagePosition.y };
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && imageScale > 1) {
			imagePosition = {
				x: event.clientX - dragStart.x,
				y: event.clientY - dragStart.y
			};
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	// Touch support for mobile
	function handleTouchStart(event: TouchEvent) {
		if (imageScale > 1 && event.touches.length === 1) {
			event.preventDefault();
			isDragging = true;
			const touch = event.touches[0];
			dragStart = { x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y };
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (isDragging && imageScale > 1 && event.touches.length === 1) {
			event.preventDefault();
			const touch = event.touches[0];
			imagePosition = {
				x: touch.clientX - dragStart.x,
				y: touch.clientY - dragStart.y
			};
		}
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function resetZoom() {
		imageScale = 1;
		imagePosition = { x: 0, y: 0 };
	}

	function fitToScreen() {
		if (!imageElement) return;

		const container = imageElement.parentElement;
		if (!container) return;

		const containerRect = container.getBoundingClientRect();
		const imageRect = imageElement.getBoundingClientRect();

		const scaleX = (containerRect.width - 40) / imageRect.width; // 40px padding
		const scaleY = (containerRect.height - 40) / imageRect.height;
		const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

		imageScale = scale;
		imagePosition = { x: 0, y: 0 };
	}

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
										class="max-w-xs rounded-xl px-3 py-2 shadow-md sm:max-w-md"
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
											<!-- Images -->
											{#if message.images && message.images.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.images as imageSrc (imageSrc)}
														<button
															on:click={() => openImageModal(imageSrc)}
															class="block max-w-xs overflow-hidden rounded-lg border border-slate-600 transition-opacity hover:opacity-90 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
															aria-label="View full size image"
														>
															<img src={imageSrc} alt="" class="h-auto w-full object-contain" />
														</button>
													{/each}
												</div>
											{/if}

											<!-- Attachments -->
											{#if message.attachments && message.attachments.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.attachments as attachment (attachment.filePath)}
														<div
															class="flex w-full max-w-full items-center gap-2 rounded-lg border border-slate-600/30 bg-slate-800/50 p-2 sm:gap-3 sm:p-3"
														>
															<div class="flex-shrink-0">
																<div
																	class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-lg sm:h-10 sm:w-10 sm:text-2xl"
																>
																	{getFileIcon(attachment.fileName)}
																</div>
															</div>
															<div class="min-w-0 flex-1">
																<div
																	class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
																>
																	<span
																		class="truncate text-xs font-medium text-slate-200"
																		title={attachment.fileName}
																		style="max-width: 100px;"
																	>
																		{attachment.fileName.length > 20
																			? `${attachment.fileName.substring(0, 8)}...${attachment.fileName.substring(attachment.fileName.lastIndexOf('.'))}`
																			: attachment.fileName}
																	</span>
																	<span class="text-xs text-slate-400" style="font-size: 10px;">
																		{formatBytes(attachment.size)}
																	</span>
																</div>
																<div class="mt-1">
																	<span
																		class={`inline-flex items-center rounded border px-1 py-0.5 text-xs font-medium sm:px-2 ${getFileTypeClasses(attachment.fileName)}`}
																		style="font-size: 9px;"
																	>
																		{getFileTypeDescription(attachment.fileName)}
																	</span>
																</div>
															</div>
															<div class="flex-shrink-0">
																{#if isViewableFile(attachment.fileName)}
																	<a
																		href={attachment.filePath}
																		target="_blank"
																		rel="noopener noreferrer"
																		class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 sm:px-3 sm:py-1.5"
																	>
																		<svg
																			class="h-3 w-3"
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
																		View
																	</a>
																{:else}
																	<a
																		href={attachment.filePath}
																		download={attachment.fileName}
																		class="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20 sm:px-3 sm:py-1.5"
																	>
																		<svg
																			class="h-3 w-3"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																			/>
																		</svg>
																		Download
																	</a>
																{/if}
															</div>
														</div>
													{/each}
												</div>
											{/if}

											{#if message.content && message.content.trim()}
												<div
													class="prose prose-sm prose-p:my-1 overflow-wrap-anywhere max-w-none break-words text-inherit"
												>
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
										class="max-w-xs rounded-xl px-3 py-2 shadow-md sm:max-w-md"
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
											<!-- Images -->
											{#if message.images && message.images.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.images as imageSrc (imageSrc)}
														<button
															on:click={() => openImageModal(imageSrc)}
															class="block max-w-xs overflow-hidden rounded-lg border border-slate-600 transition-opacity hover:opacity-90 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
															aria-label="View full size image"
														>
															<img src={imageSrc} alt="" class="h-auto w-full object-contain" />
														</button>
													{/each}
												</div>
											{/if}

											<!-- Attachments -->
											{#if message.attachments && message.attachments.length > 0}
												<div class="mb-2 space-y-2">
													{#each message.attachments as attachment (attachment.filePath)}
														<div
															class="flex w-full max-w-full items-center gap-2 rounded-lg border border-slate-600/30 bg-slate-800/50 p-2 sm:gap-3 sm:p-3"
														>
															<div class="flex-shrink-0">
																<div
																	class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-lg sm:h-10 sm:w-10 sm:text-2xl"
																>
																	{getFileIcon(attachment.fileName)}
																</div>
															</div>
															<div class="min-w-0 flex-1">
																<div
																	class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
																>
																	<span
																		class="truncate text-xs font-medium text-slate-200"
																		title={attachment.fileName}
																		style="max-width: 100px;"
																	>
																		{attachment.fileName.length > 20
																			? `${attachment.fileName.substring(0, 8)}...${attachment.fileName.substring(attachment.fileName.lastIndexOf('.'))}`
																			: attachment.fileName}
																	</span>
																	<span class="text-xs text-slate-400" style="font-size: 10px;">
																		{formatBytes(attachment.size)}
																	</span>
																</div>
																<div class="mt-1">
																	<span
																		class={`inline-flex items-center rounded border px-1 py-0.5 text-xs font-medium sm:px-2 ${getFileTypeClasses(attachment.fileName)}`}
																		style="font-size: 9px;"
																	>
																		{getFileTypeDescription(attachment.fileName)}
																	</span>
																</div>
															</div>
															<div class="flex-shrink-0">
																{#if isViewableFile(attachment.fileName)}
																	<a
																		href={attachment.filePath}
																		target="_blank"
																		rel="noopener noreferrer"
																		class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 sm:px-3 sm:py-1.5"
																	>
																		<svg
																			class="h-3 w-3"
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
																		View
																	</a>
																{:else}
																	<a
																		href={attachment.filePath}
																		download={attachment.fileName}
																		class="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20 sm:px-3 sm:py-1.5"
																	>
																		<svg
																			class="h-3 w-3"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																			/>
																		</svg>
																		Download
																	</a>
																{/if}
															</div>
														</div>
													{/each}
												</div>
											{/if}

											{#if message.content && message.content.trim()}
												<div
													class="prose prose-sm prose-p:my-1 overflow-wrap-anywhere max-w-none break-words text-inherit"
												>
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

	<!-- Image Modal -->
	{#if showImageModal}
		<div
			class="image-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
			class:dragging={isDragging}
			on:click={closeImageModal}
			on:keydown={(e) => e.key === 'Escape' && closeImageModal()}
			on:wheel={handleWheel}
			on:mousemove={handleMouseMove}
			on:mouseup={handleMouseUp}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Image Container -->
			<div
				class="relative flex h-full w-full items-center justify-center overflow-hidden p-4"
				role="button"
				tabindex="0"
				on:click={(e) => e.stopPropagation()}
				on:keydown={(e) => e.key === 'Enter' && e.stopPropagation()}
			>
				<!-- Image with zoom and pan -->
				<div
					class="relative flex items-center justify-center"
					style="transform: scale({imageScale}) translate({imagePosition.x}px, {imagePosition.y}px); transition: {isDragging
						? 'none'
						: 'transform 0.2s ease-out'};"
				>
					<button
						class="relative rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
						style="cursor: {imageScale > 1 ? 'grab' : 'zoom-in'};"
						on:mousedown={handleMouseDown}
						on:touchstart={handleTouchStart}
						on:keydown={(e) => e.key === 'Enter' && e.preventDefault()}
						aria-label="Image viewer - scroll to zoom, drag to pan"
					>
						<img
							bind:this={imageElement}
							src={modalImageSrc}
							alt=""
							class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
							on:load={fitToScreen}
						/>
					</button>
				</div>
			</div>

			<!-- Control Buttons -->
			<div class="absolute top-4 right-4 flex gap-2">
				<!-- Fit to Screen Button -->
				<button
					on:click={(e) => {
						e.stopPropagation();
						fitToScreen();
					}}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
					aria-label="Fit to screen"
					title="Fit to screen"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>

				<!-- Reset Zoom Button -->
				<button
					on:click={(e) => {
						e.stopPropagation();
						resetZoom();
					}}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
					aria-label="Reset zoom"
					title="Reset zoom (100%)"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>

				<!-- Close Button -->
				<button
					on:click={(e) => {
						e.stopPropagation();
						closeImageModal();
					}}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
					aria-label="Close image"
					title="Close image"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<!-- Zoom Level Indicator -->
			<div class="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-sm text-white">
				{Math.round(imageScale * 100)}%
			</div>

			<!-- Instructions -->
			<div class="absolute right-4 bottom-4 rounded-lg bg-black/50 px-3 py-2 text-xs text-white">
				<div>Scroll to zoom • Drag to pan</div>
			</div>
		</div>
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

	/* Image modal styles */
	:global(.image-modal-container) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	:global(.image-modal-container img) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		pointer-events: auto;
	}

	:global(.image-modal-container.dragging) {
		cursor: grabbing;
	}

	:global(.image-modal-container.dragging img) {
		cursor: grabbing;
	}
</style>
