<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { AgentEvent, ArtifactPart } from '$lib/types/agent-api';

	import AgentMessageList from '$lib/components/agent/AgentMessageList.svelte';

	// --- DATA STATE ---
	// let sessions: ListSessionsResponse = [];
	let agentEvents: AgentEvent[] = $state([]);
	let artifacts: Record<string, ArtifactPart> = $state({});

	// --- API INTEGRATION (User to implement) ---
	onMount(async () => {
		// TODO: Fetch details for current sessionId
		// loadSession(sessionId);
		const sessionId = page.params.sessionId;
		console.log(sessionId);
	});
</script>

<!-- Message List (Scrollable) -->
<div class="custom-scrollbar flex-1 overflow-y-auto">
	<div class="mx-auto max-w-4xl py-6">
		<AgentMessageList events={agentEvents} {artifacts} />

		{#if agentEvents.length === 0}
			<!-- Empty State Placeholder -->
			<div class="flex h-full items-center justify-center p-8 text-slate-500">
				<p>No messages yet. Start the conversation!</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Scrollbar Styling for Chat Area */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.2);
		border-radius: 9999px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(148, 163, 184, 0.4);
	}
</style>
