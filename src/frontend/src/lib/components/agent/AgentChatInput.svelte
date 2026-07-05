<script lang="ts">
	import { slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';

	// --- PROPS ---
	let {
		isSending = false,
		onSubmit,
		noTopBorder = false
	}: {
		isSending?: boolean;
		onSubmit?: (detail: { message: string; files: File[] }) => void;
		noTopBorder?: boolean;
	} = $props();
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
	let value = $state('');
	let textarea: HTMLTextAreaElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let selectedFiles: File[] = $state([]);
	const previewUrls = new WeakMap<File, string>();

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
		let url = previewUrls.get(file);
		if (!url) {
			url = URL.createObjectURL(file);
			previewUrls.set(file, url);
		}
		return url;
	}

	// function formatBytes(bytes: number): string {
	// 	if (bytes === 0) return '0 Bytes';
	// 	const k = 1024;
	// 	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	// 	const i = Math.floor(Math.log(bytes) / Math.log(k));
	// 	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	// }

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

	function revokePreviewUrl(file: File) {
		const url = previewUrls.get(file);
		if (url) {
			URL.revokeObjectURL(url);
			previewUrls.delete(file);
		}
	}

	function removeFile(index: number) {
		const file = selectedFiles[index];
		if (file) revokePreviewUrl(file);
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	onDestroy(() => {
		selectedFiles.forEach(revokePreviewUrl);
	});

	function handleSubmit() {
		if ((!value.trim() && selectedFiles.length === 0) || isSending) return;

		onSubmit?.({
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

	// Handle TextArea focus
	let isVirtualKeyboard = $state(false);

	onMount(() => {
		// This query checks if the PRIMARY input is a finger (touch)
		// Devices with only virtual keyboards (phones/standard tablets)
		// match "coarse"
		const checkKeyboardType = () => {
			isVirtualKeyboard = window.matchMedia('(pointer: coarse)').matches;
		};

		checkKeyboardType();

		// Optional: Listen for changes (e.g., if someone plugs in a
		// specialized touch monitor to a desktop)
		const watcher = window.matchMedia('(pointer: coarse)');
		watcher.addEventListener('change', (e) => (isVirtualKeyboard = e.matches));
	});

	function handleKeydownWindow(e: KeyboardEvent) {
		// Ignore if user is using a shortcut modifier (Command, Control, Alt)
		if (e.metaKey || e.ctrlKey || e.altKey) {
			return;
		}

		// List of control/navigation keys that shouldn't trigger autofocus
		const ignoreKeys = [
			'Enter',
			'Shift',
			'Control',
			'Meta',
			'Alt',
			'Escape',
			'Tab',
			'CapsLock',
			'ArrowUp',
			'ArrowDown',
			'ArrowLeft',
			'ArrowRight',
			'Backspace',
			'Delete'
		];

		if (ignoreKeys.includes(e.key) || isVirtualKeyboard) {
			return;
		}

		// Avoid stealing focus if user is already typing in another input/textarea
		const activeEl = document.activeElement;
		if (
			activeEl &&
			(activeEl.tagName === 'INPUT' ||
				activeEl.tagName === 'TEXTAREA' ||
				activeEl.getAttribute('contenteditable') === 'true')
		) {
			return;
		}

		// Avoid stealing focus if the user currently has text selected (e.g. attempting to copy)
		if (window.getSelection()?.toString()) {
			return;
		}

		textarea?.focus();
	}

	/**
	 * @param {HTMLTextAreaElement} node
	 */
	function autofocus(node: HTMLTextAreaElement) {
		node.focus();
	}

	// $effect runs whenever the values inside it (like page.url) change
	$effect(() => {
		const pathname = page.url.pathname;

		// For mobile and other devices with virtual keyboard, focus the textarea when in the newchat page (which is /agent)
		if (isVirtualKeyboard && pathname === '/agent') {
			textarea?.focus();
			return;
		}

		if (pathname === '/agent' || pathname.startsWith('/agent/')) {
			textarea?.focus();
		}
	});
</script>

<svelte:window onkeydown={handleKeydownWindow} />
<div class="border-t border-slate-700/50 bg-slate-900 p-4{noTopBorder ? ' border-t-0' : ''}">
	<div
		class="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800/50 p-2 shadow-lg backdrop-blur-sm transition-colors focus-within:border-slate-600 hover:border-slate-600"
	>
		<!-- File Preview Row -->
		{#if selectedFiles.length > 0}
			<div class="scrollable-content mb-2 flex gap-3 overflow-x-auto px-2 py-2" transition:slide>
				{#each selectedFiles as file, i (file.name)}
					<div
						class="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-visible rounded-xl border border-slate-700/50 bg-slate-900/50 shadow-sm transition-transform hover:scale-[1.02]"
					>
						{#if shouldShowThumbnail(file)}
							<img
								src={createFilePreviewUrl(file)}
								alt={file.name}
								class="h-full w-full rounded-xl object-cover"
							/>
						{:else}
							<div class="flex flex-col items-center gap-1">
								<span class="text-2xl">{getFileIcon(file.name)}</span>
								<span class="max-w-[60px] truncate text-[9px] text-slate-500">{file.name}</span>
							</div>
						{/if}

						<!-- Remove Button -->
						<button
							onclick={() => removeFile(i)}
							aria-label="Remove file"
							class="absolute -top-1.5 -right-1.5 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-white shadow-xl transition-all hover:scale-110 hover:bg-red-500"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
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
			use:autofocus
			oninput={autoResize}
			onkeydown={handleKeydown}
			disabled={isSending}
			rows="1"
			class="scrollable-content w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-200 placeholder-slate-400 focus:border-0 focus:ring-0 focus:outline-0 focus:outline-none"
			placeholder="Type your message here..."
			style="min-height: 24px; max-height: 240px; overflow-y: {(textarea?.scrollHeight || 0) > 230
				? 'auto'
				: 'hidden'}; outline: none !important; box-shadow: none !important;"
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
					onchange={handleFilesSelected}
					accept={ALLOWED_EXTENSIONS.map((e) => '.' + e).join(',')}
				/>
				<button
					onclick={() => fileInput?.click()}
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
					onclick={handleSubmit}
					disabled={(!value.trim() && selectedFiles.length === 0) || isSending}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500"
					aria-label="Send message"
				>
					{#if isSending}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></div>
					{:else}
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
					{/if}
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

	/* Slimmer, more subtle emerald scrollbar for a premium feel */
	.scrollable-content::-webkit-scrollbar {
		width: 4px;
		height: 4px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: transparent;
		border-radius: 9999px;
		margin: 2px;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.3),
			rgba(5, 150, 105, 0.4)
		); /* Subtle emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.1);
		transition: all 0.3s ease;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.7),
			rgba(5, 150, 105, 0.9)
		); /* Glows on hover */
		border-color: rgba(16, 185, 129, 0.3);
	}
	.scrollable-content::-webkit-scrollbar-corner {
		background: transparent;
	}
	/* Firefox support */
	.scrollable-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.3) transparent;
		color-scheme: dark;
	}
</style>
