<!-- src/frontend/src/lib/components/ui/MaterialRequestCard.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MaterialRequest } from '$lib/types';

	export let request: MaterialRequest;
	export let showInterestButton: boolean = false; // Default to false
	export let currentUserId: string | null | undefined = null;

	const dispatch = createEventDispatcher();

	$: alreadyInterested = !!(currentUserId && request.interestedSuppliers?.includes(currentUserId));

	function handleSendInterest() {
		if (alreadyInterested) return; // Should not happen if button is disabled, but good practice
		dispatch('sendInterest', {
			customerId: request.customerId,
			materialRequestId: request.id
		});
	}

	function formatDate(dateString: string) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div
	class="flex h-full flex-col justify-between rounded-xl bg-slate-700/70 p-5 shadow-xl transition-all duration-300 ease-in-out hover:ring-2 hover:shadow-amber-500/25 hover:ring-amber-500/40"
>
	<div>
		<div class="mb-4 border-b border-slate-600 pb-4">
			<h3 class="truncate text-xl font-semibold text-amber-300" title={request.title}>
				{request.title}
			</h3>
			<p class="text-xs text-slate-400">
				<span>Location: {request.deliveryLocation}</span>
				<span class="mx-2">|</span>
				<span>Posted: {formatDate(request.createdAt)}</span>
			</p>
		</div>

		<div class="mb-4 space-y-1">
			<h4 class="mb-2 font-semibold text-sky-300">Requested Items:</h4>
			<ul class="scrollable-content max-h-48 space-y-2 overflow-y-auto pr-2">
				{#each request.items as item, i (i)}
					<li class="rounded-md bg-slate-800/50 p-2 text-sm">
						<div class="flex justify-between">
							<span class="font-medium text-slate-200">{item.itemName}</span>
							<span class="font-bold text-emerald-400">{item.quantity}</span>
						</div>
						{#if item.notes}
							<p class="mt-1 text-xs text-slate-400">Notes: {item.notes}</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if request.description}
			<div>
				<h4 class="mb-1 font-semibold text-sky-300">Description:</h4>
				<p class="text-sm text-slate-300">
					{request.description}
				</p>
			</div>
		{/if}
	</div>

	{#if showInterestButton}
		<div class="mt-5 border-t border-slate-600/70 pt-4">
			<button
				on:click={handleSendInterest}
				disabled={alreadyInterested}
				class="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-150 ease-in-out hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-600 disabled:opacity-70"
			>
				{#if alreadyInterested}
					Interest Already Sent
				{:else}
					Express Interest & Start Chat
				{/if}
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 6px;
		height: 6px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 2px;
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
