<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { Message, Chat } from '$lib/types';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import type { Unsubscribe } from 'firebase/firestore';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';

	// Import the new modular components
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import MessageList from '$lib/components/chat/MessageList.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import AudioRecordingForm from '$lib/components/chat/AudioRecordingForm.svelte';
	import PermissionModal from '$lib/components/chat/PermissionModal.svelte';
	import { assertNonNullish } from '$lib/utils/assert';

	// --- Component Instances ---
	let messageListComponent: MessageList;

	// --- Svelte 5 State ---
	let messages = $state<Message[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let isSendingMessage = $state(false);

	// --- Real-time State ---
	let messagesUnsubscribe: Unsubscribe | null = null;
	let isLoadingOlder = $state(false);
	let hasMoreMessages = $state(true);
	let infiniteScrollEnabled = $state(false);
	let typingUnsubscribe: Unsubscribe | null = null;
	let typingUsers = $state<Array<{ userId: string; userName: string }>>([]);

	// --- Chat & Participant State ---
	let currentChatDetails = $state<Chat | null>(null);
	let otherParticipantProfile = $state<AuthUser | null>(null);

	// --- UI & Interaction State ---
	let newMessageContent = $state(''); // Bound to the ChatInput component

	// --- Voice Recording State ---
	let isRecording = $state(false);
	let permissionState = $state<'prompt' | 'granted' | 'denied'>('prompt');

	// --- File Upload State ---
	let selectedFiles = $state<File[]>([]);
	let isUploadingFiles = $state(false);

	// --- Firebase Auth state tracking ---
	let firebaseAuthReady = $state(false);

	// --- SvelteKit Lifecycle & Reactive Data (Svelte 5 Runes) ---
	const chatId = $derived($page.params.chatId);
	const currentUser = $derived($authStore.user);

	const chatPageTitle = $derived(
		otherParticipantProfile
			? otherParticipantProfile.userType === 'supplier'
				? otherParticipantProfile.profile?.companyName || 'User'
				: otherParticipantProfile.profile?.fullName || 'User'
			: 'Chat'
	);

	// --- Date Grouping Logic (WhatsApp Style) ---
	const groupedMessages = $derived.by(() => {
		const groups: Array<{ type: 'date' | 'message'; id: string; data: JsonObject }> = [];
		let lastDate: string | null = null;
		for (const message of messages) {
			const messageDate = new Date(message.timestamp).toDateString();
			if (messageDate !== lastDate) {
				groups.push({ type: 'date', id: messageDate, data: { timestamp: message.timestamp } });
				lastDate = messageDate;
			}
			groups.push({ type: 'message', id: message.id, data: message });
		}
		return groups;
	});

	// --- Effects for Lifecycle Management ---

	// Set up Firebase Auth listener
	$effect(() => {
		const authUnsubscribe = onAuthStateChanged(auth, (user) => {
			firebaseAuthReady = !!user;
		});
		return () => authUnsubscribe();
	});

	// Set up presence and handle user online/offline status
	$effect(() => {
		if (currentUser?.id && firebaseAuthReady) {
			realtimeChatService.setUserOnline(currentUser.id);
			// Return cleanup function to set user offline
			return () => {
				if (currentUser?.id) {
					// Re-check as user might have logged out
					realtimeChatService.setUserOffline(currentUser.id);
				}
			};
		}
	});

	// Main effect for loading chat data and managing real-time subscriptions
	$effect(() => {
		const currentChatId = chatId;
		if (currentChatId && currentUser) {
			// Reset state when chat ID changes
			messages = [];
			currentChatDetails = null;
			otherParticipantProfile = null;
			isLoading = true;
			errorMessage = '';
			infiniteScrollEnabled = false;
			hasMoreMessages = true;
			typingUsers = [];

			loadChatAndParticipantDetails(currentChatId);
		}

		// Cleanup subscriptions when the effect re-runs or component is destroyed
		return () => {
			if (messagesUnsubscribe) {
				messagesUnsubscribe();
				messagesUnsubscribe = null;
			}
			if (typingUnsubscribe) {
				typingUnsubscribe();
				typingUnsubscribe = null;
			}
		};
	});

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
				// chatPageTitle is now a derived value, no need to set it here.
			}

			// Set up real-time message listener
			setupRealtimeMessages(cId);

			// Set up typing indicators
			setupTypingIndicators(cId);
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Could not load chat information.';
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
						userName:
							otherParticipantProfile?.id === userId
								? otherParticipantProfile.userType !== 'supplier'
									? otherParticipantProfile.profile.fullName || 'User'
									: otherParticipantProfile.profile.companyName || 'User'
								: 'User' // Placeholder - should fetch actual names
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

	async function loadOlderMessages(detail: { lastMessage: Message }) {
		console.log('[Chat] loadOlderMessages called with:', detail);
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
		const { lastMessage } = detail;

		console.log('[Chat] Loading older messages before:', lastMessage.id, lastMessage.timestamp);

		try {
			assertNonNullish(chatId, 'chatId is null or undefined');
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
		if ((!newMessageContent.trim() && selectedFiles.length === 0) || isSendingMessage) return;

		isSendingMessage = true;
		isUploadingFiles = true;

		// Clear typing indicator when sending message
		if (currentUser?.id) {
			assertNonNullish(chatId, 'chatId is null or undefined');
			realtimeChatService.clearTyping(chatId, currentUser.id);
		}

		try {
			// Upload files first if any are selected
			let images: string[] = [];
			let attachments: Array<{
				fileName: string;
				filePath: string;
				fileType: string;
				size: number;
			}> = [];
			let messageId: string | null = null;

			assertNonNullish(chatId, 'chatId is null or undefined');

			if (selectedFiles.length > 0) {
				// Upload each file
				for (const file of selectedFiles) {
					const formData = new FormData();
					formData.append('file', file);
					// Don't send messageId - let backend generate it for the first file
					if (messageId) {
						formData.append('messageId', messageId); // Use the same messageId for subsequent files
						console.log('🔍 [DEBUG] Sending messageId to backend:', messageId);
					} else {
						console.log('🔍 [DEBUG] No messageId provided, backend will generate one');
					}
					const result = await apiClient.uploadChatFile(chatId, formData);
					console.log('🔍 [DEBUG] Upload result:', {
						messageId: result.messageId,
						fileName: result.fileName
					});

					// Use the messageId from the first file for all subsequent files
					if (!messageId) {
						messageId = result.messageId;
						console.log('🔍 [DEBUG] Set messageId from first file:', messageId);
					}

					// Separate images from other files
					if (file.type.startsWith('image/')) {
						images.push(result.filePath);
					} else {
						attachments.push({
							fileName: result.fileName, // This is now the original filename
							filePath: result.filePath,
							fileType: file.type,
							size: file.size
						});
					}
				}
			}

			// Prepare message payload
			const payload: JsonObject = {
				content: newMessageContent.trim()
			};

			if (images.length > 0) {
				payload.images = images;
			}
			if (attachments.length > 0) {
				payload.attachments = attachments;
			}
			if (messageId) {
				payload.messageId = messageId; // Include the messageId from file uploads
			}

			// Reset input fields immediately
			newMessageContent = '';
			selectedFiles = [];

			// Send message via API (this will trigger real-time update)
			await apiClient.sendChatMessage(chatId, payload);
			// No need to manually update messages - real-time listener will handle it
		} catch (err) {
			console.error('Send message error:', err);
			// Restore content on failure
			// Note: We don't restore files as they would need to be re-uploaded
		} finally {
			isSendingMessage = false;
			isUploadingFiles = false;
		}
	};

	const handleSendVoiceMessage = async (detail: { audioUrl: string; audioDuration: number }) => {
		isRecording = false;
		isSendingMessage = true;
		try {
			assertNonNullish(chatId, 'chatId is null or undefined');
			// Send voice message via API (real-time listener will handle the update)
			await apiClient.sendChatMessage(chatId, {
				audioType: 'voice',
				audioUrl: detail.audioUrl,
				audioDuration: detail.audioDuration
			});
		} catch (err) {
			console.error('Send voice message error:', err);
		} finally {
			isSendingMessage = false;
		}
	};

	// --- File Upload Logic ---
	const handleSelectFiles = (detail: { files: File[] }) => {
		selectedFiles = detail.files;
	};

	const handleRemoveFile = (detail: { index: number }) => {
		selectedFiles = selectedFiles.filter((_, i) => i !== detail.index);
	};

	const handleClearFiles = () => {
		selectedFiles = [];
	};

	// --- Voice Recording Logic ---
	const handleStartRecording = async () => {
		try {
			const result = await navigator.permissions.query({ name: 'microphone' });
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
		} catch (error: unknown) {
			console.error('Start recording error:', error);
			permissionState = 'denied';
		}
	};
</script>

<div class="flex h-full flex-col bg-slate-900">
	<ChatHeader
		{isLoading}
		{chatPageTitle}
		{otherParticipantProfile}
		workRequestId={currentChatDetails?.workRequestId}
		materialRequestId={currentChatDetails?.materialRequestId}
		onNavigateBack={() => goto('/chat')}
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
		onLoadOlder={loadOlderMessages}
	/>

	<!-- Input Area: Switches between recording and text input -->
	<div class="border-t border-slate-700/50 bg-slate-800">
		{#if isRecording}
			<AudioRecordingForm
				bind:isSending={isSendingMessage}
				onCancel={() => (isRecording = false)}
				onSend={handleSendVoiceMessage}
			/>
		{:else}
			<ChatInput
				bind:value={newMessageContent}
				bind:isSending={isSendingMessage}
				bind:isUploadingFiles
				bind:selectedFiles
				{chatId}
				currentUserId={currentUser?.id || ''}
				{currentUser}
				chatDetails={currentChatDetails}
				onSendMessage={handleSendMessage}
				onStartRecording={handleStartRecording}
				onSelectFiles={handleSelectFiles}
				onRemoveFile={handleRemoveFile}
				onClearFiles={handleClearFiles}
			/>
		{/if}
	</div>
</div>

<!-- Modals -->
<!-- Contract creation now handled via dedicated page, modal code kept for backward compatibility if needed -->

{#if permissionState === 'denied'}
	<PermissionModal onClose={() => (permissionState = 'prompt')} />
{/if}

<style>
</style>
