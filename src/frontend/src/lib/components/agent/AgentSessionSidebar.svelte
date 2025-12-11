<script lang="ts">
	import type { ListSessionsResponse } from '$lib/types/agent-api';

	export let sessions: ListSessionsResponse = [];
	export let currentSessionId: string = '';

	// Sort sessions by lastUpdateTime descending (latest first)
	$: sortedSessions = [...sessions].sort((a, b) => {
		const timeA = a.lastUpdateTime || 0;
		const timeB = b.lastUpdateTime || 0;
		return timeB - timeA;
	});

	function formatTime(timestamp?: number): string {
		if (!timestamp) return '';
		// Simple relative time or date formatting could go here
		// For now just returning empty string or maybe a simple date if needed
		// keeping it minimal as per request "session name style with small bold font"
		return '';
	}
</script>

<div class="flex h-full w-64 flex-col border-l border-slate-700/50 bg-slate-900">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-slate-700/50 px-4 py-4">
		<h2 class="text-sm font-semibold text-slate-200">Chats</h2>
	</div>

	<!-- Sessions List -->
	<div class="scrollable-sidebar flex-1 space-y-1 overflow-y-auto px-2 py-2">
		{#each sortedSessions as session (session.id)}
			<a
				href="/agent/{session.id}"
				class="group flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800"
				class:bg-slate-800={session.id === currentSessionId}
				class:bg-emerald-500-10={session.id === currentSessionId}
			>
				<span
					class="truncate text-xs font-bold transition-colors"
					class:text-emerald-400={session.id === currentSessionId}
					class:text-slate-300={session.id !== currentSessionId}
					class:group-hover:text-emerald-300={session.id !== currentSessionId}
					title={session.state?.sessionMetadata?.title || 'New Session'}
				>
					{session.state?.sessionMetadata?.title || 'New Session'}
				</span>

				<!-- Optional: Display time/date if needed in future -->
				<!-- <span class="text-[10px] text-slate-500">{formatTime(session.lastUpdateTime)}</span> -->
			</a>
		{:else}
			<div class="px-4 py-8 text-center text-xs text-slate-500">No conversation history</div>
		{/each}
	</div>
</div>

<style>
	/* Custom scrollbar for sidebar */
	.scrollable-sidebar::-webkit-scrollbar {
		width: 4px;
	}
	.scrollable-sidebar::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollable-sidebar::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.1);
		border-radius: 2px;
	}
	.scrollable-sidebar:hover::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.2);
	}
</style>
