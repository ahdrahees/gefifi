<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient, { ApiError } from '$lib/api';
	import type { Message, Chat } from '$lib/types';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import type { Unsubscribe } from 'firebase/firestore';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

	// Import the new modular components
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import MessageList from '$lib/components/chat/MessageList.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import AudioRecordingForm from '$lib/components/chat/AudioRecordingForm.svelte';
	import PermissionModal from '$lib/components/chat/PermissionModal.svelte';
	import { onMount, onDestroy } from 'svelte';
	// import ContractModal from '$lib/components/contracts/ContractModal.svelte'; // No longer needed

	// --- Component Instances ---
	let messageListComponent: MessageList;

	// --- Core State ---
	let currentUser: AuthUser | null = null;
	let messages: Message[] = [];
	let isLoading = true;
	let errorMessage = '';
	let isSendingMessage = false;
	let hasInitiatedLoad = false;

	// --- Real-time State ---
	let messagesUnsubscribe: Unsubscribe | null = null;
	let isLoadingOlder = false;
	let hasMoreMessages = true;
	let infiniteScrollEnabled = false; // Prevent infinite scroll on initial load
	let typingUnsubscribe: Unsubscribe | null = null;
	let typingUsers: Array<{ userId: string; userName: string }> = [];

	// --- Chat & Participant State ---
	let chatId: string;
	let currentChatDetails: Chat | null = null;
	let otherParticipantProfile: AuthUser | null = null;

	// --- UI & Interaction State ---
	let chatPageTitle = 'Chat';
	let newMessageContent = ''; // Bound to the ChatInput component

	// --- Voice Recording State ---
	let isRecording = false;
	let permissionState: 'prompt' | 'granted' | 'denied' = 'prompt';

	// --- Image Upload State ---
	let selectedFile: File | null = null;
	let uploadedImagePath: string | null = null;
	let isUploadingImage = false;

	// --- Contract Modal State ---
	// let showContractModal = false; // No longer needed with page-based contract creation

	// --- SvelteKit Lifecycle & Reactive Data ---
	$: chatId = $page.params.chatId;
	$: ({ user: currentUser } = $authStore);

	// Key reactive statement for robust data loading
	$: if (chatId && currentUser && !hasInitiatedLoad) {
		hasInitiatedLoad = true;
		loadChatAndParticipantDetails(chatId);
	}

	// Firebase Auth state tracking
	let firebaseAuthReady = false;
	let authUnsubscribe: (() => void) | null = null;

	// Set up Firebase Auth listener
	onMount(() => {
		authUnsubscribe = onAuthStateChanged(auth, (user) => {
			firebaseAuthReady = !!user;

			// Set up presence when both conditions are met
			if (firebaseAuthReady && currentUser?.id) {
				realtimeChatService.setUserOnline(currentUser.id);
			}
		});
	});

	// Set up presence when user is available and Firebase Auth is ready
	$: if (currentUser?.id && firebaseAuthReady) {
		realtimeChatService.setUserOnline(currentUser.id);
	}

	// --- Date Grouping Logic (WhatsApp Style) ---
	let groupedMessages: Array<{ type: 'date' | 'message'; id: string; data: any }> = [];
	$: {
		const groups: typeof groupedMessages = [];
		let lastDate: string | null = null;
		for (const message of messages) {
			const messageDate = new Date(message.timestamp).toDateString();
			if (messageDate !== lastDate) {
				groups.push({ type: 'date', id: messageDate, data: { timestamp: message.timestamp } });
				lastDate = messageDate;
			}
			groups.push({ type: 'message', id: message.id, data: message });
		}
		groupedMessages = groups;
	}

	// --- Data Loading ---
	async function loadChatAndParticipantDetails(cId: string) {
		isLoading = true;
		errorMessage = '';
		try {
			// Fetch chat details and participant profile
			const chatData = await apiClient.getChatById(cId);
			currentChatDetails = chatData;

			const otherId = chatData.participants.find((p) => p !== currentUser?.id);
			if (otherId) {
				otherParticipantProfile = await apiClient.getUserById(otherId);

				chatPageTitle =
					otherParticipantProfile.userType === 'supplier'
						? otherParticipantProfile.profile?.companyName || 'User'
						: otherParticipantProfile.profile?.fullName || 'User';
			}

			// Set up real-time message listener
			setupRealtimeMessages(cId);

			// Set up typing indicators
			setupTypingIndicators(cId);
		} catch (err: any) {
			errorMessage = err.message || 'Could not load chat information.';
			isLoading = false;
		}
	}

	function setupRealtimeMessages(cId: string) {
		// Clean up existing subscription
		if (messagesUnsubscribe) {
			messagesUnsubscribe();
		}

		// Subscribe to real-time messages
		messagesUnsubscribe = realtimeChatService.subscribeToMessages(
			cId,
			(newMessages) => {
				const wasInitialLoad = isLoading; // Capture the loading state before changing it
				messages = newMessages;
				isLoading = false;

				if (wasInitialLoad) {
					// Initial load - scroll to bottom immediately and enable infinite scroll after delay
					console.log('[Chat] Initial load complete, setting up infinite scroll');
					setTimeout(() => {
						messageListComponent?.scrollToBottom('auto');
						// Enable infinite scroll after initial scroll is complete
						setTimeout(() => {
							infiniteScrollEnabled = true;
							console.log('[Chat] Infinite scroll enabled');
						}, 100); // Wait 100ms after scroll to enable infinite scroll
					}, 50);
				} else {
					// Subsequent messages - scroll to bottom smoothly
					messageListComponent?.scrollToBottom('smooth');
				}
			},
			50 // Initial message limit
		);
	}

	function setupTypingIndicators(cId: string) {
		// Clean up existing subscription
		if (typingUnsubscribe) {
			typingUnsubscribe();
		}

		// Subscribe to typing indicators
		if (currentUser?.id) {
			typingUnsubscribe = realtimeChatService.subscribeToTyping(
				cId,
				currentUser.id,
				(typingUserIds) => {
					// Convert user IDs to user objects (for now just use IDs as names)
					// TODO: Fetch actual user names from user IDs
					const newTypingUsers = typingUserIds.map((userId) => ({
						userId,
						userName: 'User' // Placeholder - should fetch actual names
					}));

					const wasEmpty = typingUsers.length === 0;
					typingUsers = newTypingUsers;

					// Auto-scroll to bottom when typing indicators appear (only if user is near bottom)
					if (!wasEmpty && typingUsers.length > 0) {
						// Check if user is near bottom before auto-scrolling for typing indicators
						setTimeout(() => {
							if (messageListComponent?.isNearBottom()) {
								messageListComponent?.scrollToBottom('smooth');
							}
						}, 100);
					}
				}
			);
		}
	}

	async function loadOlderMessages(event: CustomEvent<{ lastMessage: Message }>) {
		console.log('[Chat] loadOlderMessages called with:', event.detail);
		console.log('[Chat] Current state:', {
			infiniteScrollEnabled,
			isLoadingOlder,
			hasMoreMessages,
			currentMessagesCount: messages.length
		});

		// Don't load older messages if infinite scroll is not enabled yet (prevents initial load issues)
		if (!infiniteScrollEnabled || isLoadingOlder || !hasMoreMessages) {
			console.log('[Chat] Skipping load - conditions not met');
			return;
		}

		isLoadingOlder = true;
		const { lastMessage } = event.detail;

		console.log('[Chat] Loading older messages before:', lastMessage.id, lastMessage.timestamp);

		try {
			await realtimeChatService.loadOlderMessages(
				chatId,
				lastMessage,
				(olderMessages) => {
					console.log('[Chat] Received older messages:', olderMessages.length);
					if (olderMessages.length === 0) {
						hasMoreMessages = false;
						console.log('[Chat] No more messages available');
					} else {
						// Prepend older messages
						const previousCount = messages.length;
						messages = [...olderMessages, ...messages];
						console.log('[Chat] Messages updated:', previousCount, '->', messages.length);
						// Maintain scroll position
						messageListComponent?.maintainScrollPosition();
					}
					isLoadingOlder = false;
				},
				50
			);
		} catch (error) {
			console.error('Error loading older messages:', error);
			isLoadingOlder = false;
		}
	}

	// --- Message Sending Logic ---
	const handleSendMessage = async () => {
		if ((!newMessageContent.trim() && !uploadedImagePath) || isSendingMessage) return;

		isSendingMessage = true;
		const payload = {
			content: newMessageContent.trim(),
			...(uploadedImagePath && { images: [uploadedImagePath] })
		};

		// Clear typing indicator when sending message
		if (currentUser?.id) {
			realtimeChatService.clearTyping(chatId, currentUser.id);
		}

		// Reset input fields immediately
		newMessageContent = '';
		uploadedImagePath = null;
		selectedFile = null;

		try {
			// Send message via API (this will trigger real-time update)
			await apiClient.sendChatMessage(chatId, payload);
			// No need to manually update messages - real-time listener will handle it
		} catch (err) {
			console.error('Send message error:', err);
			// Restore content on failure
			newMessageContent = payload.content;
			uploadedImagePath = payload.images ? payload.images[0] : null;
		} finally {
			isSendingMessage = false;
		}
	};

	const handleSendVoiceMessage = async (
		event: CustomEvent<{ audioUrl: string; audioDuration: number }>
	) => {
		isRecording = false;
		isSendingMessage = true;
		try {
			// Send voice message via API (real-time listener will handle the update)
			await apiClient.sendChatMessage(chatId, {
				audioType: 'voice',
				audioUrl: event.detail.audioUrl,
				audioDuration: event.detail.audioDuration
			});
		} catch (err) {
			console.error('Send voice message error:', err);
		} finally {
			isSendingMessage = false;
		}
	};

	// --- Image Upload Logic ---
	const handleSelectFile = async (event: CustomEvent<{ file: File }>) => {
		selectedFile = event.detail.file;
		isUploadingImage = true;
		const formData = new FormData();
		formData.append('file', selectedFile);
		try {
			const result = await apiClient.uploadFile(formData);
			uploadedImagePath = result.filePath;
		} catch (err: any) {
			errorMessage = `Image upload failed: ${err.message}`;
			handleRemoveImage();
		} finally {
			isUploadingImage = false;
		}
	};

	const handleRemoveImage = () => {
		uploadedImagePath = null;
		selectedFile = null;
	};

	// --- Voice Recording Logic ---
	const handleStartRecording = async () => {
		try {
			const result = await navigator.permissions.query({ name: 'microphone' as any });
			if (result.state === 'granted') {
				permissionState = 'granted';
				isRecording = true;
			} else if (result.state === 'prompt') {
				await navigator.mediaDevices.getUserMedia({ audio: true });
				permissionState = 'granted';
				isRecording = true;
			} else {
				permissionState = 'denied';
			}
		} catch (error) {
			permissionState = 'denied';
		}
	};

	// --- Lifecycle ---
	onDestroy(() => {
		// Clean up subscriptions
		if (messagesUnsubscribe) {
			messagesUnsubscribe();
		}

		if (typingUnsubscribe) {
			typingUnsubscribe();
		}

		// Clean up Firebase Auth listener
		if (authUnsubscribe) {
			authUnsubscribe();
		}

		// Set user offline
		if (currentUser?.id) {
			realtimeChatService.setUserOffline(currentUser.id);
		}
	});
</script>

<div class="flex h-full flex-col bg-slate-900">
	<ChatHeader
		{isLoading}
		{chatPageTitle}
		{otherParticipantProfile}
		workRequestId={currentChatDetails?.workRequestId}
		materialRequestId={currentChatDetails?.materialRequestId}
		on:navigateBack={() => goto('/chat')}
	/>

	<MessageList
		bind:this={messageListComponent}
		{isLoading}
		{errorMessage}
		{groupedMessages}
		{currentUser}
		{chatId}
		{isLoadingOlder}
		{hasMoreMessages}
		{infiniteScrollEnabled}
		{typingUsers}
		on:loadOlder={loadOlderMessages}
	/>

	<!-- Input Area: Switches between recording and text input -->
	<div class="border-t border-slate-700/50 bg-slate-800">
		{#if isRecording}
			<AudioRecordingForm
				bind:isSending={isSendingMessage}
				on:cancel={() => (isRecording = false)}
				on:send={handleSendVoiceMessage}
			/>
		{:else}
			<ChatInput
				bind:value={newMessageContent}
				bind:isSending={isSendingMessage}
				bind:isUploadingImage
				bind:uploadedImagePath
				bind:selectedFile
				{chatId}
				currentUserId={currentUser?.id || ''}
				on:sendMessage={handleSendMessage}
				on:startRecording={handleStartRecording}
				on:selectFile={handleSelectFile}
				on:removeImage={handleRemoveImage}
			/>
		{/if}
	</div>
</div>

<!-- Modals -->
<!-- Contract creation now handled via dedicated page, modal code kept for backward compatibility if needed -->

{#if permissionState === 'denied'}
	<PermissionModal on:close={() => (permissionState = 'prompt')} />
{/if}

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
