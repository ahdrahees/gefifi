<!-- src/frontend/src/lib/components/agent/AgentChatPanel.svelte -->
<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { inlineAgentState } from '$lib/states/inlineAgent.svelte';
	import { sessionEventsState, artifactsState, agentLoaders } from '$lib/states/agent.svelte';
	import { fetchSession, sendChat, newInlineChat } from '$lib/services/agentChat';
	import { isValidSessionId } from '$lib/utils/agentUtils';
	import AgentMessageList from './AgentMessageList.svelte';
	import AgentChatInput from './AgentChatInput.svelte';

	// --- PROPS ---
	let {
		mode = 'embedded' // 'embedded' (for home page) or 'modal' (for FAB)
	}: {
		mode?: 'embedded' | 'modal';
	} = $props();

	// --- DERIVED STATE ---
	let sessionId = $derived(inlineAgentState.sessionId || '');
	let agentEvents = $derived(sessionEventsState[sessionId] ?? []);
	let artifacts = $derived(artifactsState[sessionId] ?? {});
	let isGenerating = $derived(agentLoaders.generating[sessionId] || false);

	let isSending = $state(false);
	let scrollContainer: HTMLDivElement | undefined = $state();

	const suggestions = [
		{ text: 'Find me an expert plumber in Mumbai', icon: '🔧' },
		{ text: 'Need quotes for 50 bags of cement', icon: '🧱' },
		{ text: 'What’s the status of my active requests?', icon: '📊' },
		{ text: 'Hire an architect for a villa project', icon: '📐' }
	];

	// --- FETCH SESSION EVENTS ---
	$effect(() => {
		const currSession = inlineAgentState.sessionId;
		const userId = $authStore?.user?.id;

		if (currSession && isValidSessionId(currSession) && userId) {
			if (!sessionEventsState[currSession]) {
				(async () => {
					try {
						agentLoaders.loadingSessionEvents = true;
						await fetchSession(userId, currSession);
					} catch (e) {
						console.error('[AgentChatPanel] Failed to fetch session:', e);
					} finally {
						agentLoaders.loadingSessionEvents = false;
					}
				})();
			}
		}
	});

	// --- SUBMIT MESSAGE ---
	async function handleSubmit(detail: { message: string; files: File[] }) {
		const { message, files } = detail;
		const userId = $authStore?.user?.id;
		if (!userId) return;

		isSending = true;
		try {
			if (inlineAgentState.sessionId) {
				await sendChat(inlineAgentState.sessionId, userId, message, files);
			} else {
				await newInlineChat(userId, message, files);
			}
		} catch (error) {
			console.error('[AgentChatPanel] Error sending message:', error);
		} finally {
			isSending = false;
		}
	}

	function handleSuggestionClick(text: string) {
		handleSubmit({ message: text, files: [] });
	}

	function handleNewChat() {
		inlineAgentState.sessionId = null;
	}

	// --- AUTO SCROLL ---
	$effect(() => {
		const currSession = inlineAgentState.sessionId;
		if (currSession && (agentEvents.length > 0 || agentLoaders.generating[currSession])) {
			setTimeout(() => {
				if (scrollContainer) {
					scrollContainer.scrollTo({
						top: scrollContainer.scrollHeight,
						behavior: 'smooth'
					});
				}
			}, 60);
		}
	});
</script>

<div
	class="flex h-full flex-grow flex-col overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-900/40 backdrop-blur-xl transition-all duration-300"
>
	<!-- Chat messages area with floating overlay -->
	<div class="relative flex-1 min-h-0 overflow-hidden">
		{#if inlineAgentState.sessionId}
			<button
				onclick={handleNewChat}
				class="absolute top-4 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-slate-300 shadow-lg backdrop-blur-md transition-all hover:border-emerald-500/30 hover:bg-slate-700/80 hover:text-emerald-400 focus:outline-none active:scale-95"
				title="Start New Chat"
				aria-label="New chat"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
			</button>
		{/if}

		<div
			bind:this={scrollContainer}
			class="custom-scrollbar h-full overflow-y-auto bg-slate-900 px-4 py-4"
		>
		{#if agentEvents.length > 0}
			<AgentMessageList events={agentEvents} {artifacts} {isGenerating} />

			{#if isGenerating && (agentEvents.length === 0 || (agentEvents[agentEvents.length - 1].author !== 'assistant' && agentEvents[agentEvents.length - 1].author !== 'agent'))}
				<div class="flex w-full justify-start py-2">
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
			{/if}
		{:else if agentLoaders.loadingSessionEvents}
			<div class="flex w-full justify-start py-2">
				<div class="h-16 w-64 animate-pulse rounded-xl rounded-bl-none bg-slate-800/80"></div>
			</div>
		{:else}
			<!-- Welcome / Suggestions Screen -->
			<div class="flex h-full flex-col items-center justify-center py-6 text-center">
				<div
					class="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-700/30 bg-slate-800/30 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-transform duration-500 hover:scale-105 hover:bg-slate-800/50"
				>
					<!-- Agent Logo -->
					<img
						class="h-full w-full object-contain mix-blend-lighten drop-shadow-lg transition-opacity"
						src="/agent/logo/agent-logo-with-bg.png"
						alt="Agent Logo 1"
					/>

					<!-- Inner Glow -->
					<div class="absolute inset-0 -z-10 rounded-3xl bg-emerald-500/20 blur-xl"></div>
				</div>

				<!-- ////		 -->
				<h4 class="text-base font-semibold text-slate-200">How can I help you build today?</h4>
				<p class="mt-1 max-w-md px-4 text-xs text-slate-400">
					Get matched with expert pros, find pricing for building materials, or orchestrate custom
					quotes instantly.
				</p>

				<!-- Suggestion Chips Grid -->
				<div class="mt-6 grid w-full max-w-lg grid-cols-1 gap-2.5 px-4 sm:grid-cols-2">
					{#each suggestions as sug, index (index)}
						<button
							onclick={() => handleSuggestionClick(sug.text)}
							disabled={isSending || isGenerating}
							class="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 text-left text-xs text-slate-300 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
						>
							<span class="shrink-0 text-sm">{sug.icon}</span>
							<span class="line-clamp-2 font-medium">{sug.text}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	</div>

	<!-- Fixed Input Panel (At Bottom of Container) -->
	<div class="shrink-0">
		<AgentChatInput isSending={isSending || isGenerating} onSubmit={handleSubmit} noTopBorder />
	</div>
</div>

<style>
	/* Custom Scrollbar for Chat Panel */
	.custom-scrollbar::-webkit-scrollbar {
		width: 5px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.15);
		border-radius: 9999px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(148, 163, 184, 0.35);
	}
</style>
