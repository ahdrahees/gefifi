<!-- gefifi-2/src/frontend/src/lib/components/chat/MessageForm.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isSending = false;

	let messageContent = '';

	const dispatch = createEventDispatcher<{
		sendMessage: { content: string };
		startRecording: void;
	}>();

	function handleSendMessage() {
		if (isSending || messageContent.trim() === '') return;
		dispatch('sendMessage', { content: messageContent.trim() });
		messageContent = '';
	}

	function triggerFileInput() {
		const fileInput = document.getElementById('file-input');
		if (fileInput) {
			fileInput.click();
		}
	}

	function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			// In a real app, you might want to show a preview
			// For now, we'll just forward the file to the parent
			dispatch('sendImage', { file: target.files[0] });
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}
</script>

<div class="flex items-center gap-3 border-t border-slate-700/50 bg-slate-800/50 p-3 sm:p-4">
	<input
		type="file"
		id="file-input"
		class="hidden"
		accept="image/*"
		on:change={handleFileSelected}
	/>
	<button
		on:click={triggerFileInput}
		class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
		aria-label="Attach image"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
			></path></svg
		>
	</button>

	<textarea
		bind:value={messageContent}
		on:keydown={handleKeyPress}
		disabled={isSending}
		rows="1"
		placeholder="Type a message..."
		class="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-700 p-3 text-slate-100 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
	></textarea>

	{#if messageContent.trim()}
		<button
			on:click={handleSendMessage}
			disabled={isSending}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-500 disabled:scale-100 disabled:bg-slate-600 disabled:opacity-70"
			aria-label="Send message"
		>
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
			</svg>
		</button>
	{:else}
		<button
			on:click={() => dispatch('startRecording')}
			disabled={isSending}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-500 disabled:scale-100 disabled:bg-slate-600 disabled:opacity-70"
			aria-label="Record voice message"
		>
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"
				/>
			</svg>
		</button>
	{/if}
</div>
