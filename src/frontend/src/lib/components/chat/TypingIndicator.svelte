<!-- gefifi-2/src/frontend/src/lib/components/chat/TypingIndicator.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import type { Unsubscribe } from 'firebase/firestore';

	export let chatId: string;
	export let currentUserId: string;

	let typingUsers: string[] = [];
	let unsubscribe: Unsubscribe | null = null;

	onMount(() => {
		if (chatId && currentUserId) {
			unsubscribe = realtimeChatService.subscribeToTyping(chatId, currentUserId, (users) => {
				typingUsers = users;
			});
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	$: isTyping = typingUsers.length > 0;
</script>

{#if isTyping}
	<div class="flex items-center gap-2 px-4 py-2 text-slate-400">
		<div class="flex space-x-1">
			<div
				class="h-2 w-2 animate-bounce rounded-full bg-slate-400"
				style="animation-delay: 0ms"
			></div>
			<div
				class="h-2 w-2 animate-bounce rounded-full bg-slate-400"
				style="animation-delay: 150ms"
			></div>
			<div
				class="h-2 w-2 animate-bounce rounded-full bg-slate-400"
				style="animation-delay: 300ms"
			></div>
		</div>
		<span class="text-sm">
			{#if typingUsers.length === 1}
				Someone is typing...
			{:else}
				{typingUsers.length} people are typing...
			{/if}
		</span>
	</div>
{/if}
