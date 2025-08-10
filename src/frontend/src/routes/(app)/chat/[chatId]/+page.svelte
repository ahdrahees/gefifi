<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient, { ApiError } from '$lib/api';
	import type { Message, Chat } from '$lib/types';

	// Import the new modular components
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import MessageList from '$lib/components/chat/MessageList.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import AudioRecordingForm from '$lib/components/chat/AudioRecordingForm.svelte';
	import PermissionModal from '$lib/components/chat/PermissionModal.svelte';
	import { onMount } from 'svelte';
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
			// Fetch chat details and participant profile in parallel for speed
			const [chatData, messagesData] = await Promise.all([
				apiClient.getChatById(cId), // Assuming you create this API client method
				apiClient.getChatMessages(cId)
			]);

			currentChatDetails = chatData;
			messages = messagesData.messages || [];

			const otherId = chatData.participants.find((p) => p !== currentUser?.id);
			if (otherId) {
				otherParticipantProfile = await apiClient.getUserById(otherId);

				chatPageTitle =
					otherParticipantProfile.userType === 'supplier'
						? otherParticipantProfile.profile?.companyName || 'User'
						: otherParticipantProfile.profile?.fullName || 'User';
			}

			messageListComponent?.scrollToBottom('auto');
		} catch (err: any) {
			errorMessage = err.message || 'Could not load chat information.';
		} finally {
			isLoading = false;
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

		// Reset input fields immediately
		newMessageContent = '';
		uploadedImagePath = null;
		selectedFile = null;

		try {
			const sentMessage = await apiClient.sendChatMessage(chatId, payload);
			messages = [...messages, sentMessage];
			messageListComponent?.scrollToBottom('smooth');
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
			const sentMessage = await apiClient.sendChatMessage(chatId, {
				audioType: 'voice',
				audioUrl: event.detail.audioUrl,
				audioDuration: event.detail.audioDuration
			});
			messages = [...messages, sentMessage];
			messageListComponent?.scrollToBottom('smooth');
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
