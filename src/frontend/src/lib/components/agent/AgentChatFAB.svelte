<!-- src/frontend/src/lib/components/agent/AgentChatFAB.svelte -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { inlineAgentState } from '$lib/states/inlineAgent.svelte';
	import AgentChatPanel from './AgentChatPanel.svelte';

	let isOpen = $derived(inlineAgentState.isModalOpen);
	let clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
	let escapeHandler: ((e: KeyboardEvent) => void) | null = null;
	let modalElement: HTMLDivElement | undefined = $state();

	function toggleModal() {
		inlineAgentState.isModalOpen = !inlineAgentState.isModalOpen;
	}

	function closeModal() {
		inlineAgentState.isModalOpen = false;
	}

	onMount(() => {
		// Close modal when clicking outside
		clickOutsideHandler = (e: MouseEvent) => {
			if (isOpen && modalElement && !modalElement.contains(e.target as Node)) {
				// Don't close if clicking the FAB trigger button itself
				const trigger = document.getElementById('agent-fab-trigger');
				if (trigger && !trigger.contains(e.target as Node)) {
					closeModal();
				}
			}
		};

		// Close modal on Escape key press
		escapeHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				closeModal();
			}
		};

		document.addEventListener('click', clickOutsideHandler, true);
		document.addEventListener('keydown', escapeHandler, true);
	});

	onDestroy(() => {
		if (clickOutsideHandler) document.removeEventListener('click', clickOutsideHandler, true);
		if (escapeHandler) document.removeEventListener('keydown', escapeHandler, true);
	});
</script>

<div class="relative z-50">
	<!-- FAB Trigger Button -->
	<button
		id="agent-fab-trigger"
		onclick={toggleModal}
		class="fixed right-6 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-emerald-400 active:scale-95 focus:ring-4 focus:ring-emerald-500/30 focus:outline-none"
		aria-label={isOpen ? 'Close Assistant' : 'Open Assistant'}
	>
		{#if isOpen}
			<!-- Down Chevron close icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-300 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		{:else}
			<!-- Brain Logo Icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-7.5 w-7.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 18V5m3 8a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4m8.598-6.5A3 3 0 1012 5a3 3 0 10-5.598 1.5m11.595-.125a4 4 0 012.526 5.77M18 18a4 4 0 002-7.464m-0.033 6.483A4 4 0 1112 18a4 4 0 11-7.967-.517M6 18a4 4 0 01-2-7.464m2.003-6.339a4 4 0 00-2.526 5.77" />
			</svg>
		{/if}
	</button>

	<!-- Chat Modal Dialog overlay -->
	{#if isOpen}
		<div
			bind:this={modalElement}
			class="fixed right-6 bottom-24 w-[360px] xs:w-[400px] h-[520px] rounded-2xl border border-slate-700/50 bg-slate-900/90 shadow-3xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-300 md:w-[420px] md:h-[580px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-32px)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 zoom-in-95 duration-200"
		>
			<div class="flex-grow flex flex-col overflow-hidden">
				<AgentChatPanel mode="modal" />
			</div>
		</div>
	{/if}
</div>

<style>
	/* Scale and enter/exit animation helpers if Tailwind directives aren't active in build */
	@keyframes -global-slide-in-from-bottom {
		0% {
			opacity: 0;
			transform: translateY(20px) scale(0.96);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	.animate-in {
		animation: -global-slide-in-from-bottom 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
