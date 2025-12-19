<!-- gefifi-2/src/frontend/src/lib/components/contracts/ContractModal.svelte -->
<script lang="ts">
	import type { Contract } from '$lib/types'; // Import Contract type
	import { onMount, onDestroy } from 'svelte';
	import ContractForm from './ContractForm.svelte';

	interface Props {
		show?: boolean;
		workRequestId?: string | undefined;
		materialRequestId?: string | undefined;
		customerId: string;
		expertSupplierId: string;
		onClose?: () => void;
	}

	let {
		show = $bindable(false),
		workRequestId = undefined,
		materialRequestId = undefined,
		customerId,
		expertSupplierId,
		onClose
	}: Props = $props();

	function closeModal() {
		show = false;
		onClose?.();
	}

	function handleContractCreated(contract: Contract) {
		// Optionally, you might want to automatically close the modal after contract creation
		// or display a success message within the modal before closing.
		console.log('ContractModal: Contract created event received', contract);
		// For now, let's keep the modal open so the user can see the success message in the form.
		// If you want to auto-close:
		// setTimeout(() => {
		//   closeModal();
		// }, 2000);
	}

	// Handle Escape key to close modal
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if show}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="contract-modal-title"
	>
		<div
			class="relative w-full max-w-2xl overflow-hidden rounded-xl bg-slate-800 shadow-2xl"
			role="document"
		>
			<div class="flex items-center justify-between border-b border-slate-700 p-4">
				<h3 id="contract-modal-title" class="text-xl font-semibold text-emerald-400">
					Create Contract
				</h3>
				<button
					onclick={closeModal}
					class="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
					aria-label="Close contract creation modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-6 w-6"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="max-h-[calc(100vh-12rem)] overflow-y-auto p-2 sm:p-4 md:p-6">
				<ContractForm
					{workRequestId}
					{materialRequestId}
					{customerId}
					{expertSupplierId}
					onContractCreated={handleContractCreated}
				/>
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	/* Ensures that the modal content can scroll if it's too tall for the viewport height,
     * especially on smaller screens.
     * 12rem is an arbitrary value to account for modal padding, header, and some breathing room.
     * Adjust as necessary based on your actual modal's surrounding elements and padding.
     */
</style>
