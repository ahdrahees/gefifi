<!-- gefifi-2/src/frontend/src/lib/components/chat/AudioMessageView.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Message } from '$lib/types';
	import WaveSurfer from 'wavesurfer.js';
	import { httpsCallable } from 'firebase/functions';
	// Correctly import the initialized 'functions' service
	import { functions } from '$lib/firebase';

	export let message: Message;

	let waveformEl: HTMLElement;
	let waveSurfer: WaveSurfer | null = null;
	let isPlaying = false;
	let isLoading = true;
	let errorMessage = '';
	let currentTime = '0:00';
	let totalDuration = '0:00';

	onMount(async () => {
		if (!message.audioUrl) {
			errorMessage = 'No audio source provided.';
			isLoading = false;
			return;
		}

		let signedUrl: string | null = null;

		try {
			// Use the imported 'functions' instance which is already initialized and emulator-aware
			const getSignedAudioUrl = httpsCallable(functions, 'getSignedAudioUrl');

			console.log(`[AudioMessageView] Requesting signed URL for path: ${message.audioUrl}`);
			const result = await getSignedAudioUrl({ path: message.audioUrl });

			signedUrl = (result.data as { url: string }).url;
			console.log(`[AudioMessageView] Successfully received signed URL.`);
		} catch (error: any) {
			console.error('[AudioMessageView] Failed to get signed URL:', error);
			if (error.code === 'functions/permission-denied') {
				errorMessage = 'Permission denied.';
			} else if (error.code === 'functions/not-found') {
				errorMessage = 'Audio file not found.';
			} else {
				errorMessage = 'Could not load audio.';
			}
			isLoading = false;
			return;
		}

		if (waveformEl && signedUrl) {
			waveSurfer = WaveSurfer.create({
				container: waveformEl,
				waveColor: '#475569', // slate-600 - subtle but visible on dark background
				progressColor: '#10b981', // emerald-500 - bright emerald for progress
				barWidth: 2.5,
				barGap: 1.5,
				barRadius: 30,
				height: 32,
				url: signedUrl,
				cursorWidth: 2
			});

			waveSurfer.on('ready', (duration) => {
				totalDuration = formatTime(duration);
				isLoading = false;
			});

			waveSurfer.on('play', () => (isPlaying = true));
			waveSurfer.on('pause', () => (isPlaying = false));
			waveSurfer.on('finish', () => (isPlaying = false));

			waveSurfer.on('timeupdate', (time) => {
				currentTime = formatTime(time);
			});

			waveSurfer.on('error', (err) => {
				console.error('[AudioMessageView] Wavesurfer error:', err);
				errorMessage = 'Error playing audio.';
				isLoading = false;
			});
		}
	});

	onDestroy(() => {
		waveSurfer?.destroy();
	});

	function togglePlay() {
		if (!waveSurfer) return;
		if (waveSurfer.isPlaying()) {
			waveSurfer.pause();
		} else {
			waveSurfer.play();
		}
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const min = Math.floor(seconds / 60);
		const sec = Math.floor(seconds % 60);
		return `${min}:${String(sec).padStart(2, '0')}`;
	}
</script>

<div class="flex max-w-sm min-w-[280px] items-center gap-3 p-0 pt-1">
	<button
		on:click={togglePlay}
		disabled={isLoading || !!errorMessage}
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-50"
		aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
	>
		{#if isLoading}
			<!-- Spinner -->
			<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if errorMessage}
			<!-- Error Icon -->
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
		{:else if isPlaying}
			<!-- Pause Icon -->
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
			</svg>
		{:else}
			<!-- Play Icon -->
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>

	<div class="min-w-0 flex-1">
		{#if errorMessage}
			<p class="text-sm text-red-400">{errorMessage}</p>
		{:else}
			<div bind:this={waveformEl} class="h-8 w-full"></div>
		{/if}
	</div>

	<div class="min-w-[2.5rem] text-right font-mono text-xs text-slate-300 tabular-nums">
		{#if !isLoading && !errorMessage}
			{#if isPlaying}{currentTime}{:else}{totalDuration}{/if}
		{/if}
	</div>
</div>
