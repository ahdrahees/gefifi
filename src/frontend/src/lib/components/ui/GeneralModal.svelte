<!-- gefifi-2/src/frontend/src/lib/components/ui/GeneralModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		show?: boolean;
		title?: string | undefined;
		maxWidthClass?: string; // Default max width, can be overridden
		closeButton?: boolean; // Prop to control visibility of the top-right close button
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		onClose?: () => void;
	}

	let {
		show = $bindable(false),
		title = undefined,
		maxWidthClass = 'max-w-lg',
		closeButton = true,
		children,
		footer,
		onClose
	}: Props = $props();

	function closeModal() {
		onClose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	let listening = $state(false);

	function setupListener() {
		if (typeof window !== 'undefined' && !listening) {
			window.addEventListener('keydown', handleKeydown);
			listening = true;
		}
	}

	function cleanupListener() {
		if (typeof window !== 'undefined' && listening) {
			window.removeEventListener('keydown', handleKeydown);
			listening = false;
		}
	}

	onMount(() => {
		if (show) {
			setupListener();
		}
	});

	onDestroy(() => {
		cleanupListener();
	});

	// Reactive statement to add/remove listener when `show` prop changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			// Ensure window exists (client-side)
			if (show && !listening) {
				setupListener();
			} else if (!show && listening) {
				cleanupListener();
			}
		}
	});
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'general-modal-title' : undefined}
	>
		<div
			class="relative flex w-full flex-col {maxWidthClass} overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800 shadow-2xl"
			role="document"
		>
			{#if title || closeButton}
				<div
					class="flex shrink-0 items-center justify-between border-b border-slate-700 p-4 sm:p-5"
				>
					{#if title}
						<h3 id="general-modal-title" class="text-lg font-semibold text-emerald-400">
							{title}
						</h3>
					{:else}
						<div></div>
						<!-- Placeholder to keep close button to the right if no title -->
					{/if}
					{#if closeButton}
						<button
							onclick={closeModal}
							class="-mr-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
							aria-label="Close modal"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="h-5 w-5"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<div class="modal-content-area scrollable-content flex-grow overflow-y-auto p-4 sm:p-6">
				{@render children?.()}
				<!-- Modal content goes here -->
			</div>

			<!-- Optional: Slot for modal actions/footer -->
			{@render footer?.()}
		</div>
	</div>
{/if}

<style lang="postcss">
	.modal-content-area {
		max-height: calc(
			100vh - 8rem
		); /* Adjust 8rem based on typical header/footer height of the modal itself */
	}
	.modal-content-area::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	.modal-content-area::-webkit-scrollbar-track {
		@reference rounded-full bg-slate-700/50;
	}
	.modal-content-area::-webkit-scrollbar-thumb {
		@reference rounded-full bg-slate-500;
	}
	.modal-content-area::-webkit-scrollbar-thumb:hover {
		@reference bg-slate-400;
	}

	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
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
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
		color-scheme: dark;
	}
</style>
