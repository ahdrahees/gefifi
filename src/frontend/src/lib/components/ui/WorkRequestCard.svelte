<!-- src/frontend/src/lib/components/ui/WorkRequestCard.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { WorkRequest } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	export let request: WorkRequest;
	export let showInterestButton: boolean = false;
	export let currentUserId: string | null | undefined = null;

	const dispatch = createEventDispatcher();

	$: alreadyInterested = !!(
		currentUserId &&
		(request.interestedExperts?.includes(currentUserId) ||
			request.interestedSuppliers?.includes(currentUserId))
	);

	function handleSendInterest(event: MouseEvent) {
		event.stopPropagation(); // Prevent card's on:click from firing
		if (alreadyInterested) return;
		dispatch('sendInterest', {
			customerId: request.customerId,
			workRequestId: request.id
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

	function truncateText(text: string | null | undefined, maxLength: number) {
		if (!text) return '';
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}
</script>

<div
	class="flex h-full cursor-pointer flex-col justify-between rounded-xl bg-slate-700/70 p-5 shadow-xl transition-all duration-300 ease-in-out hover:ring-2 hover:shadow-sky-500/25 hover:ring-sky-500/40"
	on:click={() => goto(`/work-requests/${request.id}`)}
	title="Click to view details"
>
	<div>
		<div class="mb-4 border-b border-slate-600 pb-4">
			<h3 class="truncate text-xl font-semibold text-sky-300" title={request.title}>
				{request.title}
			</h3>
			<p class="text-xs text-slate-400">
				<span>Location: {request.location}</span>
				<span class="mx-2">|</span>
				<span>Posted: {formatDate(request.createdAt)}</span>
			</p>
		</div>

		{#if request.description}
			<div>
				<h4 class="mb-1 font-semibold text-emerald-300">Description:</h4>
				<p class="text-sm text-slate-300">
					{truncateText(request.description, 150)}
				</p>
			</div>
		{/if}
	</div>

	<div class="mt-5 border-t border-slate-600/70 pt-4">
		<div class="flex items-center justify-between text-xs text-slate-400">
			<span>Category: {request.category || 'N/A'}</span>
			<span class="font-medium capitalize">{request.status.replace('_', ' ')}</span>
		</div>
	</div>

	{#if showInterestButton}
		<div class="mt-5 border-t border-slate-600/70 pt-4">
			<button
				on:click={handleSendInterest}
				disabled={alreadyInterested}
				class="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-150 ease-in-out hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-600 disabled:opacity-70"
			>
				{#if alreadyInterested}
					Interest Sent
				{:else}
					Express Interest
				{/if}
			</button>
		</div>
	{/if}
</div>
