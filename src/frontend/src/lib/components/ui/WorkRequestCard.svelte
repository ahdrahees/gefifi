<!-- src/frontend/src/lib/components/ui/WorkRequestCard.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { WorkRequest } from '$lib/types';

	export let request: WorkRequest;

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
</div>
