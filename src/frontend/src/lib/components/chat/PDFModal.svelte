<!-- gefifi-2/src/frontend/src/lib/components/chat/PDFModal.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';

	interface Props {
		// --- PROPS ---
		show?: boolean;
		pdfSrc?: string;
		fileName?: string;
		onclose?: () => void;
	}

	let { show = false, pdfSrc = '', fileName = '', onclose }: Props = $props();

	// --- INTERNAL STATE ---
	let blobUrl: string = $state('');
	let isLoading: boolean = $state(false);
	let error: string = $state('');

	async function loadPdfAsBlob() {
		isLoading = true;
		error = '';

		try {
			const response = await fetch(pdfSrc);
			if (!response.ok) {
				throw new Error(`Failed to load PDF: ${response.status}`);
			}
			const blob = await response.blob();
			// Create a new blob with explicit PDF type
			const pdfBlob = new Blob([blob], { type: 'application/pdf' });
			blobUrl = URL.createObjectURL(pdfBlob);
		} catch (err) {
			console.error('Failed to load PDF:', err);
			error = err instanceof Error ? err.message : 'Failed to load PDF';
		} finally {
			isLoading = false;
		}
	}

	function close() {
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	onDestroy(() => {
		if (blobUrl) {
			URL.revokeObjectURL(blobUrl);
		}
	});
	// Load PDF as blob when shown (bypasses Content-Disposition: attachment headers)
	$effect(() => {
		if (show && pdfSrc) {
			loadPdfAsBlob();
		}
	});
	// Cleanup blob URL when modal closes
	$effect(() => {
		if (!show && blobUrl) {
			URL.revokeObjectURL(blobUrl);
			blobUrl = '';
			error = '';
		}
	});
</script>

{#if show}
	<div
		class="pdf-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
		onclick={close}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="PDF Viewer"
		tabindex="-1"
	>
		<!-- PDF Container -->
		<div
			class="relative flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-xl bg-slate-800 shadow-2xl"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between gap-4 border-b border-slate-700 px-4 py-3">
				<div class="flex min-w-0 flex-1 items-center gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-lg"
					>
						📄
					</div>
					<span class="truncate text-sm font-medium text-slate-200" title={fileName}>
						{fileName || 'PDF Document'}
					</span>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<!-- Download Button -->
					<!-- <button
						on:click={downloadPdf}
						class="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm text-white transition-colors hover:bg-emerald-500"
						aria-label="Download PDF"
						title="Download PDF"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 15V3" />
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<path d="m7 10 5 5 5-5" />
						</svg>
						<span class="hidden sm:inline">Download</span>
					</button> -->

					<!-- Close Button -->
					<button
						onclick={close}
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-slate-300 transition-colors hover:bg-slate-600"
						aria-label="Close PDF viewer"
						title="Close"
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
			</div>

			<!-- PDF Viewer -->
			<div class="flex-1 bg-slate-900">
				{#if isLoading}
					<!-- Loading State -->
					<div class="flex h-full flex-col items-center justify-center gap-4">
						<div
							class="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500"
						></div>
						<p class="text-sm text-slate-400">Loading PDF...</p>
					</div>
				{:else if error}
					<!-- Error State -->
					<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
						<div class="rounded-full bg-red-500/20 p-4">
							<svg
								class="h-12 w-12 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-lg font-medium text-slate-200">Unable to load PDF</p>
							<p class="mt-1 text-sm text-slate-400">{error}</p>
						</div>
						<a
							href={pdfSrc}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
							Open in New Tab
						</a>
					</div>
				{:else if blobUrl}
					<!-- PDF Content -->
					<object
						data={blobUrl}
						type="application/pdf"
						class="h-full w-full"
						title={fileName || 'PDF Document'}
					>
						<!-- Fallback for browsers that don't support PDF embedding -->
						<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
							<div class="rounded-full bg-red-500/20 p-4">
								<svg
									class="h-12 w-12 text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-lg font-medium text-slate-200">Unable to display PDF</p>
								<p class="mt-1 text-sm text-slate-400">
									Your browser doesn't support inline PDF viewing.
								</p>
							</div>
							<a
								href={pdfSrc}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
								Open in New Tab
							</a>
						</div>
					</object>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* PDF modal styles */
	:global(.pdf-modal-container) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	:global(.pdf-modal-container iframe) {
		user-select: auto;
		-webkit-user-select: auto;
	}
</style>
