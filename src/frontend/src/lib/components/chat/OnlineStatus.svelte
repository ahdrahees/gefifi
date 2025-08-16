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

<div class="flex items-center gap-1.5">
	<!-- Online/Offline Indicator -->
	<div class="relative">
		<div
			class="rounded-full {sizeConfig[size].dot}"
			class:bg-emerald-500={isOnline}
			class:bg-slate-500={!isOnline}
		></div>
		{#if isOnline}
			<div
				class="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75 {sizeConfig[
					size
				].dot}"
			></div>
		{/if}
	</div>

	<!-- Status Text -->
	{#if showLastSeen}
		<span class="text-slate-400 {sizeConfig[size].text}">
			{#if isOnline}
				Online
			{:else if lastSeen}
				{formatLastSeen(lastSeen)}
			{:else}
				Offline
			{/if}
		</span>
	{/if}
</div>
