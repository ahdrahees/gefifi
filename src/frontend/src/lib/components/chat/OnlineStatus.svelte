<!-- gefifi-2/src/frontend/src/lib/components/chat/OnlineStatus.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import type { Unsubscribe } from 'firebase/firestore';

	export let userId: string;
	export let showLastSeen: boolean = false;
	export let size: 'sm' | 'md' | 'lg' = 'md';

	let isOnline = false;
	let lastSeen: Date | null = null;
	let unsubscribe: Unsubscribe | null = null;

	// Size configurations
	const sizeConfig = {
		sm: { dot: 'h-2 w-2', text: 'text-xs' },
		md: { dot: 'h-3 w-3', text: 'text-sm' },
		lg: { dot: 'h-4 w-4', text: 'text-base' }
	};

	onMount(() => {
		if (userId) {
			unsubscribe = realtimeChatService.subscribeToUserPresence(userId, (online, lastSeenDate) => {
				isOnline = online;
				lastSeen = lastSeenDate || null;
			});
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	function formatLastSeen(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMinutes < 1) {
			return 'Just now';
		} else if (diffMinutes < 60) {
			return `${diffMinutes}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else if (diffDays < 7) {
			return `${diffDays}d ago`;
		} else {
			return date.toLocaleDateString();
		}
	}
</script>

<!-- Online/Offline Indicator positioned as overlay -->
<div
	class="absolute right-0 bottom-0 {sizeConfig[size].dot} rounded-full border-2 border-slate-800"
	class:bg-emerald-500={isOnline}
	class:bg-slate-500={!isOnline}
>
	{#if isOnline}
		<div class="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75"></div>
	{/if}
</div>

<!-- Status Text (only show if requested) -->
{#if showLastSeen}
	<div class="mt-1 text-center">
		<span class="text-slate-400 {sizeConfig[size].text}">
			{#if isOnline}
				Online
			{:else if lastSeen}
				{formatLastSeen(lastSeen)}
			{:else}
				Offline
			{/if}
		</span>
	</div>
{/if}
