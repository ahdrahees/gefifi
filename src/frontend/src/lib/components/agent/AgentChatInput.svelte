<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	// --- PROPS ---
	export let isSending: boolean = false;

	// --- CONSTANTS ---
	const MAX_FILES = 10;
	// Allowed file extensions
	const ALLOWED_EXTENSIONS = [
		'jpg',
		'jpeg',
		'png',
		'gif',
		'webp',
		'svg',
		'pdf',
		'doc',
		'docx',
		'xls',
		'xlsx',
		'dwg',
		'dxf'
	];

	// --- INTERNAL STATE ---
	let value = '';
	let textarea: HTMLTextAreaElement;
	let fileInput: HTMLInputElement;
	let selectedFiles: File[] = [];

	const dispatch = createEventDispatcher<{
		submit: { message: string; files: File[] };
	}>();

	// --- HELPERS ---
	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function shouldShowThumbnail(file: File): boolean {
		return file.type.startsWith('image/');
	}

	function createFilePreviewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function validateFile(file: File): boolean {
		const ext = file.name.split('.').pop()?.toLowerCase() || '';
		return ALLOWED_EXTENSIONS.includes(ext);
	}

	// --- HANDLERS ---
	function handleFilesSelected(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			const newFiles = Array.from(target.files);
			const validFiles = newFiles.filter(validateFile);

			if (validFiles.length < newFiles.length) {
				alert('Some files were rejected. Allowed types: ' + ALLOWED_EXTENSIONS.join(', '));
			}

			if (selectedFiles.length + validFiles.length > MAX_FILES) {
				alert(`Max ${MAX_FILES} files allowed.`);
				return;
			}

			selectedFiles = [...selectedFiles, ...validFiles];
		}
		// Reset input
		if (target) target.value = '';
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		if ((!value.trim() && selectedFiles.length === 0) || isSending) return;

		dispatch('submit', {
			message: value,
			files: selectedFiles
		});

		// Clear state
		value = '';
		selectedFiles = [];
		if (textarea) {
			textarea.style.height = 'auto';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function autoResize(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		target.style.height = 'auto';
		target.style.height = Math.min(target.scrollHeight, 24 * 10) + 'px'; // Max 10 lines approx
	}
</script>

<div class="border-t border-slate-700/50 bg-slate-900 p-4">
	<div
		class="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800/50 p-2 shadow-lg backdrop-blur-sm transition-colors focus-within:border-slate-600 hover:border-slate-600"
	>
		<!-- File Preview Row -->
		{#if selectedFiles.length > 0}
			<div class="scrollbar-hide mb-2 flex gap-2 overflow-x-auto px-1 py-1" transition:slide>
				{#each selectedFiles as file, i (file.name)}
					<div
						class="group relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-visible rounded-lg border border-slate-600 bg-slate-700"
					>
						{#if shouldShowThumbnail(file)}
							<img
								src={createFilePreviewUrl(file)}
								alt={file.name}
								class="h-full w-full rounded-lg object-cover"
							/>
						{:else}
							<span class="text-2xl">{getFileIcon(file.name)}</span>
						{/if}

						<!-- Remove Button -->
						<button
							on:click={() => removeFile(i)}
							class="absolute -top-1 -right-1 z-50 box-border flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 p-1 text-xs text-white shadow-md sm:hidden sm:group-hover:flex"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-x-icon lucide-x"
								><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
							>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Input Area -->
		<textarea
			bind:this={textarea}
			bind:value
			on:input={autoResize}
			on:keydown={handleKeydown}
			disabled={isSending}
			rows="1"
			class="scrollable-content w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-200 placeholder-slate-400 focus:border-0 focus:ring-0 focus:outline-0 focus:outline-none"
			placeholder="Type your message here..."
			style="min-height: 24px; max-height: 240px; outline: none !important; box-shadow: none !important;"
		></textarea>

		<!-- Actions Row -->
		<div class="mt-2 flex items-center justify-between px-1">
			<!-- Attachment Button -->
			<div class="group relative">
				<input
					type="file"
					multiple
					class="hidden"
					bind:this={fileInput}
					on:change={handleFilesSelected}
					accept={ALLOWED_EXTENSIONS.map((e) => '.' + e).join(',')}
				/>
				<button
					on:click={() => fileInput.click()}
					disabled={isSending}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200"
					aria-label="Add files"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
						/>
					</svg>
				</button>
				<!-- Tooltip -->
				<div
					class="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-black px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
				>
					Add files
				</div>
			</div>

			<!-- Send Button -->
			<div class="group relative">
				<button
					on:click={handleSubmit}
					disabled={(!value.trim() && selectedFiles.length === 0) || isSending}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500"
					aria-label="Send message"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m5 12 7-7 7 7" />
						<path d="M12 19V5" />
					</svg>
				</button>
				<!-- Tooltip -->
				<div
					class="absolute right-0 bottom-full mb-2 hidden rounded bg-black px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
				>
					Send message
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: transparent;
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
		scrollbar-color: rgba(16, 185, 129, 0.6) transparent;
		color-scheme: dark;
	}
</style>
