<script lang="ts">
	import AgentChatInput from '$lib/components/agent/AgentChatInput.svelte';
	import AgentSessionSidebar from '$lib/components/agent/AgentSessionSidebar.svelte';
	import ErrorToast from '$lib/components/ui/ErrorToast.svelte';
	import type { ListSessionsResponse } from '$lib/types/agent-api';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';

	import { newChat, sendChat } from '$lib/services/agentChat';

	// --- DATA STATE ---
	let { children } = $props();

	let sessionId = $derived(page.params.sessionId);
	let sessions: ListSessionsResponse = [];
	let isSending = $state(false);
	let errorMessage = $state('');

	// --- API INTEGRATION (User to implement) ---
	onMount(async () => {
		// TODO: Fetch list of sessions
		// sessions = await api.getSessions();
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
</script>

<div class="flex h-full w-full overflow-hidden bg-slate-900 text-slate-200">
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
	<div class="hidden shrink-0 border-l border-slate-700/50 md:block">
		<AgentSessionSidebar {sessions} currentSessionId={sessionId} />
	</div>
</div>
