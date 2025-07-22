<!-- gefifi-2/src/frontend/src/lib/components/chat/AudioRecordingForm.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import WaveSurfer from 'wavesurfer.js';
	import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

	export let isSending = false;

	const dispatch = createEventDispatcher<{
		cancel: void;
		send: { audioUrl: string; audioDuration: number };
	}>();

	let waveSurfer: WaveSurfer | null = null;
	let record: RecordPlugin | null = null;
	let waveformEl: HTMLElement;
	let statusMessage = 'Initializing...';
	let isPaused = false;
	let duration = 0;
	let pauseAudioBlob: Blob | null = null;

	let token: string | null;
	let chatId: string;

	authStore.subscribe((auth) => (token = auth.token));
	page.subscribe((p) => (chatId = p.params.chatId));

	function getCompatibleMimeType() {
		const isFirefox = navigator.userAgent.includes('Firefox');

		if (isFirefox) {
			return 'audio/ogg;codecs=opus'; // Better Firefox compatibility
		}
		return 'audio/webm;codecs=opus'; // smaller file size and low latency
	}

	onMount(() => {
		if (!waveformEl) return;

		waveSurfer = WaveSurfer.create({
			container: waveformEl,
			waveColor: '#64748b', // slate-500
			progressColor: '#10b981', // emerald-500
			barWidth: 3,
			barGap: 2,
			barRadius: 3,
			height: 48
		});

		record = waveSurfer.registerPlugin(
			RecordPlugin.create({
				scrollingWaveform: true,
				// Enforce a cross-browser compatible mimeType
				mimeType: getCompatibleMimeType()
			})
		);

		// When recording ends (by sending or timeout)
		record.on('record-end', (blob: Blob) => {
			uploadAndDispatch(blob);
		});

		// Update timer during recording
		record.on('record-progress', (time: number) => {
			duration = Math.floor(time / 1000);
		});

		// Pause audio blob
		record.on('record-pause', (blob: Blob) => {
			pauseAudioBlob = blob;
		});

		startRecording();

		// Set 3-minute timeout
		record.on('record-progress', (durationms) => {
			if (durationms >= 180000) {
				record?.stopRecording();
				isSending = true; // Show a sending-like state to indicate completion
				statusMessage = 'Recording finished. Ready to send.';
			}
		});

		return () => {
			// onDestroy is called here
		};
	});

	onDestroy(() => {
		record?.unAll();
		record?.destroy();
		waveSurfer?.destroy();
	});

	function startRecording() {
		if (record) {
			record.startRecording().then(() => {
				statusMessage = 'Recording...';
			});
		}
	}

	function togglePause() {
		if (!record) return;

		if (record.isPaused()) {
			record.resumeRecording();
			isPaused = false;
			statusMessage = 'Recording...';
		} else if (record.isRecording()) {
			record.pauseRecording();
			isPaused = true;
			statusMessage = 'Paused';
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleSend() {
		if (record?.isRecording()) {
			record.stopRecording();
		} else if (record?.isPaused() && pauseAudioBlob) {
			uploadAndDispatch(pauseAudioBlob);
		}
		isSending = true;
		statusMessage = 'Sending...';
	}

	async function uploadAndDispatch(blob: Blob) {
		const messageId = crypto.randomUUID(); // Client-side generated ID for filename
		// Get the extension from the blob's mime type, default to .webm
		const extension = blob.type.split('/')[1]?.split(';')[0] || 'webm';
		const fileName = `${messageId}.${extension}`;
		const file = new File([blob], fileName, { type: blob.type });

		const formData = new FormData();
		formData.append('voice', file);
		formData.append('messageId', messageId);

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/upload-voice`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				},
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to upload voice message.');
			}

			const result = await response.json();

			dispatch('send', {
				audioUrl: result.filePath, // This is the private GCS path
				audioDuration: duration
			});
		} catch (error) {
			console.error('Upload failed:', error);
			alert(
				`Error sending voice message: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
			dispatch('cancel'); // Go back to the message form on failure
		} finally {
			isSending = false;
		}
	}

	function formatTime(seconds: number): string {
		const min = Math.floor(seconds / 60);
		const sec = seconds % 60;
		return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	}
</script>

<div
	class="flex items-center gap-3 border-t border-slate-700/50 bg-slate-800/50 p-3 sm:p-4"
	class:animate-pulse={isSending}
>
	{#if isSending}
		<div class="flex h-12 flex-1 items-center justify-center">
			<p class="text-slate-400">{statusMessage}</p>
		</div>
	{:else}
		<!-- Cancel Button -->
		<button
			on:click={handleCancel}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-red-400"
			aria-label="Cancel recording"
		>
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
			</svg>
		</button>

		<!-- Pause/Play Button -->
		<button
			on:click={togglePause}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-slate-700"
			aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
		>
			{#if isPaused}
				<!-- Record/Resume Icon -->
				<svg class="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="7" />
				</svg>
			{:else}
				<!-- Pause Icon -->
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
				</svg>
			{/if}
		</button>

		<!-- Waveform and Timer -->
		<div class="flex flex-1 items-center gap-3 overflow-hidden">
			<div bind:this={waveformEl} class="h-12 w-full"></div>
			<span class="font-mono text-sm text-slate-400">{formatTime(duration)}</span>
		</div>

		<!-- Send Button -->
		<button
			on:click={handleSend}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-500"
			aria-label="Send voice message"
		>
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
			</svg>
		</button>
	{/if}
</div>
