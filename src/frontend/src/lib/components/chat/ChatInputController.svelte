<!-- gefifi-2/src/frontend/src/lib/components/chat/ChatInputController.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MessageForm from './MessageForm.svelte';
	import AudioRecordingForm from './AudioRecordingForm.svelte';
	import PermissionModal from './PermissionModal.svelte';

	export let isSending = false;

	type PermissionState = 'prompt' | 'granted' | 'denied';

	let permissionState: PermissionState = 'prompt';
	let isRecording = false;

	const dispatch = createEventDispatcher<{
		sendMessage: {
			content: string;
			images?: string[];
		};
		sendVoiceMessage: {
			audioUrl: string;
			audioDuration: number;
		};
		sendImage: {
			file: File;
		};
	}>();

	// Image upload state
	let selectedFile: File | null = null;
	let uploadedImagePath: string | null = null;
	let isUploadingImage = false;

	const handleStartRecording = async () => {
		if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
			alert('Media Devices API not supported in this browser.');
			return;
		}

		try {
			// Check for permission without prompting
			const result = await navigator.permissions.query({ name: 'microphone' as any });
			permissionState = result.state;

			if (permissionState === 'granted') {
				isRecording = true;
			} else if (permissionState === 'prompt') {
				// Request permission
				await navigator.mediaDevices.getUserMedia({ audio: true });
				permissionState = 'granted';
				isRecording = true;
			} else {
				// Permission is denied
				permissionState = 'denied';
			}
		} catch (error) {
			console.error('Error requesting microphone permission:', error);
			permissionState = 'denied';
		}
	};

	const handleCancelRecording = () => {
		isRecording = false;
	};

	const handleSendVoiceMessage = (
		event: CustomEvent<{ audioUrl: string; audioDuration: number }>
	) => {
		isRecording = false;
		dispatch('sendVoiceMessage', event.detail);
	};

	const handleClosePermissionModal = () => {
		permissionState = 'prompt'; // Reset to allow trying again, though browser might block it
	};
</script>

<div class="relative w-full">
	{#if isRecording}
		<AudioRecordingForm
			on:cancel={handleCancelRecording}
			on:send={handleSendVoiceMessage}
			bind:isSending
		/>
	{:else}
		<MessageForm on:startRecording={handleStartRecording} on:sendMessage bind:isSending />
	{/if}

	{#if permissionState === 'denied'}
		<PermissionModal on:close={handleClosePermissionModal} />
	{/if}
</div>
