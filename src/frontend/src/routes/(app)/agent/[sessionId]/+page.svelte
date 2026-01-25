<script lang="ts">
	import { page } from '$app/state';
	import AgentMessageList from '$lib/components/agent/AgentMessageList.svelte';
	import { isValidSessionId } from '$lib/utils/agentUtils';
	import { goto } from '$app/navigation';
	import { sessionEventsState, artifactsState, agentLoaders } from '$lib/states/agent.svelte';
	import { fetchSession } from '$lib/services/agentChat';
	import { authStore } from '$lib/stores/auth';

	// --- DATA STATE ---
	let agentEvents = $derived(sessionEventsState[page.params.sessionId || ''] ?? []);
	let artifacts = $derived(artifactsState[page.params.sessionId || ''] ?? {});

	// --- API INTEGRATION ---
	$effect(() => {
		const sessionId = page.params.sessionId;
		const userId = $authStore?.user?.id;

		if (!sessionId || !isValidSessionId(sessionId) || !userId) {
			goto('/agent');
			return;
		}

		if (sessionEventsState[sessionId]) return;

		(async () => {
			try {
				agentLoaders.loadingSessionEvents = true;
				await fetchSession(userId, sessionId);
			} catch (e) {
				console.error(e);
				goto('/agent');
			} finally {
				agentLoaders.loadingSessionEvents = false;
			}
		})();
	});

	// --- AUTO SCROLL ---
	let scrollContainer: HTMLDivElement;
	$effect(() => {
		const sessionId = page.params.sessionId || '';
		// Auto-scroll to bottom when messages change or generation is active
		if (agentEvents || agentLoaders.generating[sessionId]) {
			// Small delay to allow DOM to update
			setTimeout(() => {
				if (scrollContainer) {
					scrollContainer.scrollTo({
						top: scrollContainer.scrollHeight,
						behavior: 'smooth'
					});
				}
			}, 50);
		}
	});

	let isGenerating = $derived(agentLoaders.generating[page.params.sessionId || ''] || false);
</script>

<!-- Message List (Scrollable) -->
<div bind:this={scrollContainer} class="custom-scrollbar flex-1 overflow-y-auto">
	<div class="mx-auto max-w-4xl py-6">
		<AgentMessageList events={agentEvents} {artifacts} {isGenerating} />

		{#if isGenerating && (agentEvents.length === 0 || (agentEvents[agentEvents.length - 1].author !== 'assistant' && agentEvents[agentEvents.length - 1].author !== 'agent'))}
			<div class="flex flex-col gap-6 p-4">
				<!-- Agent Message Skeleton Wrapper -->
				<div class="flex w-full justify-start px-4">
					<div
						class="flex items-center gap-1.5 rounded-xl rounded-bl-none bg-slate-800/80 px-4 py-3 shadow-sm"
					>
						<div
							class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"
						></div>
						<div
							class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"
						></div>
						<div class="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
					</div>
				</div>
			</div>
		{/if}

		{#if agentLoaders.loadingSessionEvents}
			<div class="flex flex-col gap-6 p-4">
				<!-- Agent Message Skeleton -->
				<div class="flex w-full justify-start">
					<div class="flex max-w-[75%] flex-col gap-2">
						<div class="h-16 w-64 animate-pulse rounded-xl rounded-bl-none bg-slate-800/80"></div>
					</div>
				</div>
			</div>
		{/if}

		{#if agentEvents.length === 0 && !agentLoaders.loadingSessionEvents && !isGenerating}
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
