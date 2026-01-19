<script lang="ts">
	import type { AgentSession } from '$lib/types/agent-api';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { agentLoaders } from '$lib/states/agent.svelte';
	import { formatRelativeTime, getTemporalGroup } from '$lib/utils/timeUtils';

	interface Props {
		sessions: Iterable<AgentSession>;
		currentSessionId?: string;
		newChat?: () => void;
	}

	let { sessions, currentSessionId = '', newChat }: Props = $props();

	// Group sessions for better UI organization
	let groupedSessions = $derived.by(() => {
		const groups = {
			Today: [] as AgentSession[],
			Yesterday: [] as AgentSession[],
			Earlier: [] as AgentSession[]
		};

		for (const session of sessions) {
			const group = getTemporalGroup(session.lastUpdateTime);
			groups[group].push(session);
		}
		return groups;
	});

	function getSessionTitle(session: AgentSession): string {
		const state = session.state as { sessionMetadata?: { title?: string } } | undefined;
		return state?.sessionMetadata?.title || 'New Session';
	}

	async function handleNewChat() {
		if (newChat) {
			newChat();
		}
		await goto(resolve('/agent'));
	}
</script>

<div class="flex h-full w-64 flex-col border-l border-slate-700/50 bg-slate-900">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-slate-700/50 px-4 py-4">
		<h2 class="text-sm font-semibold tracking-tight text-slate-200">Chats</h2>
		<button
			onclick={handleNewChat}
			class="flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] hover:bg-emerald-500 active:scale-[0.98]"
			title="Start a new chat"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-3.5 w-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			New
		</button>
	</div>

	<!-- Sessions List -->
	<div class="scrollable-sidebar flex-1 space-y-6 overflow-y-auto px-3 py-4">
		{#if agentLoaders.loadingSessionsList}
			<!-- Skeleton Loader -->
			<div class="space-y-4">
				{#each Array(5) as _, index (index)}
					<div class="flex w-full flex-col gap-2 rounded-lg px-2 py-2">
						<div class="h-3 w-full animate-pulse rounded bg-slate-800"></div>
						<div class="h-2 w-1/2 animate-pulse rounded bg-slate-800/50"></div>
					</div>
				{/each}
			</div>
		{:else}
			{#each Object.entries(groupedSessions) as [groupName, groupItems] (groupName)}
				{#if groupItems.length > 0}
					<div class="space-y-1">
						<h3 class="px-2 pb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
							{groupName}
						</h3>
						<div class="space-y-0.5">
							{#each groupItems as session (session.id)}
								<a
									href="/agent/{session.id}"
									class="group relative flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 {session.id ===
									currentSessionId
										? 'selected bg-slate-800'
										: 'hover:bg-slate-800/60'}"
								>
									<div class="flex items-start justify-between gap-2">
										<span
											class="truncate text-[11px] leading-tight font-bold transition-colors"
											class:text-emerald-400={session.id === currentSessionId}
											class:text-slate-400={session.id !== currentSessionId}
											class:group-hover:text-emerald-300={session.id !== currentSessionId}
											title={getSessionTitle(session)}
										>
											{getSessionTitle(session)}
										</span>
										<span
											class="shrink-0 text-[9px] font-medium text-slate-500 transition-colors group-hover:text-slate-400"
										>
											{formatRelativeTime(session.lastUpdateTime)}
										</span>
									</div>

									{#if session.id === currentSessionId}
										<div
											class="absolute inset-y-2 -left-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
										></div>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			{:else}
				<div class="flex h-32 flex-col items-center justify-center p-4 text-center opacity-60">
					<div class="mb-2 text-2xl text-slate-600">💬</div>
					<p class="text-[11px] font-medium text-slate-500">No conversation history</p>
				</div>
			{/each}
		{/if}
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
		background: rgba(148, 163, 184, 0.05);
		border-radius: 2px;
	}
	.scrollable-sidebar:hover::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.15);
	}

	.selected {
		box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.1);
	}
</style>
