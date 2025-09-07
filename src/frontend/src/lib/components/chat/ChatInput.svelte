<!-- gefifi-2/src/frontend/src/lib/components/chat/ChatInput.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { realtimeChatService } from '$lib/services/realtimeChat';

	// --- PROPS ---
	export let isSending: boolean = false;
	export let isUploadingImage: boolean = false;
	export let uploadedImagePath: string | null = null;
	export let selectedFile: File | null = null;
	export let value: string = ''; // For two-way binding of textarea content
	export let chatId: string = '';
	export let currentUserId: string = '';

	// --- INTERNAL STATE & BINDINGS ---
	let fileInput: HTMLInputElement;
	let typingTimeout: NodeJS.Timeout | null = null;

	// --- EVENTS ---
	const dispatch = createEventDispatcher<{
		sendMessage: void;
		startRecording: void;
		selectFile: { file: File };
		removeImage: void;
	}>();

	// --- EVENT HANDLERS ---
	const triggerFileInput = () => fileInput?.click();

	const handleFileSelected = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			dispatch('selectFile', { file: target.files[0] });
		}
	};

	const handleSendMessage = () => {
		if (isSending) return;
		dispatch('sendMessage');
	};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	};

	const handleInput = () => {
		// Set typing indicator
		if (chatId && currentUserId && value.trim()) {
			realtimeChatService.setTyping(chatId, currentUserId);

			// Clear previous timeout
			if (typingTimeout) {
				clearTimeout(typingTimeout);
			}

			// Clear typing indicator after 2 seconds of no typing
			typingTimeout = setTimeout(() => {
				realtimeChatService.clearTyping(chatId, currentUserId);
			}, 2000);
		} else if (chatId && currentUserId) {
			// Clear typing if input is empty
			realtimeChatService.clearTyping(chatId, currentUserId);
		}
	};
</script>

<div class="border-t border-slate-700/50 bg-slate-800 p-3">
	<!-- Image Preview / Upload Progress -->
	{#if isUploadingImage}
		<div class="mb-2 flex animate-pulse items-center gap-3 rounded-lg bg-slate-700 p-2">
			<div class="h-10 w-10 rounded-md bg-slate-600" />
			<p class="text-sm text-slate-400">Uploading image...</p>
		</div>
	{:else if uploadedImagePath}
		<div class="mb-2 flex items-center gap-3 rounded-lg bg-slate-700 p-2">
			<img
				src={uploadedImagePath}
				alt="Preview"
				class="h-10 w-10 rounded-md border border-slate-600 object-cover"
			/>
			<span class="flex-1 truncate text-sm text-slate-300">{selectedFile?.name || 'Image'}</span>
			<button
				on:click={() => dispatch('removeImage')}
				class="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-red-400"
				aria-label="Remove image"
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
	{/if}

	<!-- Main Input Form -->
	<div class="flex items-center gap-3">
		<input
			type="file"
			bind:this={fileInput}
			on:change={handleFileSelected}
			accept="image/*"
			class="hidden"
		/>
		<button
			on:click={triggerFileInput}
			class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
			aria-label="Attach image"
		>
			<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
				/>
			</svg>
		</button>
		<textarea
			bind:value
			on:keydown={handleKeyPress}
			on:input={handleInput}
			disabled={isSending}
			rows="1"
			placeholder="Type a message..."
			class="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-700 p-3 text-slate-100 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
		></textarea>
		{#if value.trim() || uploadedImagePath}
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
</div>
