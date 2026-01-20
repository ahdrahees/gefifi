<script lang="ts">
	import AgentChatInput from '$lib/components/agent/AgentChatInput.svelte';
	import AgentSessionSidebar from '$lib/components/agent/AgentSessionSidebar.svelte';
	import AgentMobileNav from '$lib/components/agent/AgentMobileNav.svelte';
	import ErrorToast from '$lib/components/ui/ErrorToast.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';

	import { fetchAllSessions, newChat, sendChat } from '$lib/services/agentChat';
	import { agentLoaders, agentSessionState, sessionEventsState } from '$lib/states/agent.svelte';

	// --- DATA STATE ---
	let { children } = $props();

	let sessionId = $derived(page.params.sessionId);
	// let sessions: ListSessionsResponse = [];
	let isSending = $state(false);
	let errorMessage = $state('');
	let isSidebarOpen = $state(false);

	// Close sidebar on navigation on mobile
	$effect(() => {
		if (sessionId) {
			isSidebarOpen = false;
		}
	});

	// --- API INTEGRATION (User to implement) ---
	onMount(async () => {
		// ... (keep existing onMount logic)
		try {
			const userId = $authStore?.user?.id;
			if (!userId) {
				errorMessage = 'Please log in and register';
				return;
			}

			if (agentLoaders.isSessionsListLoadedAlready) {
				agentLoaders.loadingSessionsList = false;
				return;
			}

			agentLoaders.loadingSessionsList = true;
			await fetchAllSessions(userId);
			agentLoaders.loadingSessionsList = false;
		} catch (error) {
			console.error('Error fetching sessions:', error);
			errorMessage = `Failed fetching sessions: ${error}`;
		}
	});

	async function handleSubmit(detail: { message: string; files: File[] }) {
		const { message, files } = detail;
		isSending = true;

		try {
			const userId = $authStore?.user?.id;
			if (!userId) {
				errorMessage = 'Please log in and register';
				return;
			}

			if (sessionId) {
				await sendChat(sessionId, userId, message, files);
			} else {
				await newChat(userId, message, files);
			}
		} catch (error) {
			console.error('Error sending message:', error);
			errorMessage = `Failed sending message: ${error}`;
		} finally {
			isSending = false;
		}
	}

	$inspect(sessionEventsState);
</script>

<div class="relative flex h-full w-full overflow-hidden rounded-xl bg-slate-900 text-slate-200">
	<!-- Mobile Nav Toggle Group -->
	<div class="md:hidden">
		<AgentMobileNav {isSidebarOpen} onToggleSidebar={() => (isSidebarOpen = !isSidebarOpen)} />
	</div>

	<!-- CENTER: Main Chat Area -->
	<div class="relative flex min-w-0 flex-1 flex-col">
		<ErrorToast bind:message={errorMessage} />

		{@render children?.()}

		<!-- Chat Input (Fixed Bottom) -->
		<div class="z-10 shrink-0">
			<AgentChatInput {isSending} onSubmit={handleSubmit} />
		</div>
	</div>

	<!-- RIGHT: Session Sidebar -->
	<!-- Mobile Overlay -->
	{#if isSidebarOpen}
		<button
			tabindex="0"
			class="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden"
			onclick={() => (isSidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<div
		class="fixed inset-y-0 right-0 z-50 transform border-l border-slate-700/50 transition-transform duration-300 md:relative md:block md:translate-x-0 md:transform-none {isSidebarOpen
			? 'translate-x-0'
			: 'translate-x-full'}"
	>
		<AgentSessionSidebar
			sessions={agentSessionState}
			currentSessionId={sessionId}
			onClose={() => (isSidebarOpen = false)}
		/>
	</div>
</div>
