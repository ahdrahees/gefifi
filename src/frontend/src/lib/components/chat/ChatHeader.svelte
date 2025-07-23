<!-- gefifi-2/src/frontend/src/lib/components/chat/ChatHeader.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AuthUser } from '$lib/types';

	export let isLoading: boolean = true;
	export let chatPageTitle: string = 'Chat';
	export let otherParticipantProfile: AuthUser | null = null;
	export let workRequestId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	function handleBackClick() {
		dispatch('navigateBack');
	}

	function handleOpenContractModal() {
		dispatch('openContractModal');
	}

	function getUserTypeDisplay(userType: string | undefined): {
		label: string;
		color: string;
		bgColor: string;
	} {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}
</script>

<header class="sticky top-0 z-20 border-b border-slate-700/50 bg-slate-800/60 p-3 backdrop-blur-sm">
	<div class="flex items-center justify-between">
		<div class="flex min-w-0 items-center gap-3">
			<button
				on:click={handleBackClick}
				class="flex-shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
				aria-label="Back to chat list"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>

			{#if isLoading}
				<div class="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-700" />
				<div class="min-w-0 flex-1 space-y-2">
					<div class="h-4 w-32 animate-pulse rounded bg-slate-700" />
					<div class="h-3 w-20 animate-pulse rounded bg-slate-700" />
				</div>
			{:else if otherParticipantProfile}
				{@const typeInfo = getUserTypeDisplay(otherParticipantProfile.userType)}
				<img
					src={otherParticipantProfile.profile?.avatarUrl || '/images/default-avatar.png'}
					alt="Avatar"
					class="h-10 w-10 flex-shrink-0 rounded-full border-2 border-slate-600 object-cover"
				/>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<h2 class="truncate font-semibold text-slate-200">{chatPageTitle}</h2>
						<span
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {typeInfo.color} {typeInfo.bgColor}"
						>
							{typeInfo.label}
						</span>
					</div>
					<p class=" flex items-center truncate text-slate-400">
						{otherParticipantProfile.profile?.expertise ||
							otherParticipantProfile.profile?.category ||
							'Available'}

						{#if otherParticipantProfile.profile?.location}
							<span class="ml-2 flex items-baseline"
								>• <svg
									class="mx-1 inline h-3 w-3"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle
										cx="12"
										cy="10"
										r="3"
									/></svg
								>{otherParticipantProfile.profile?.location}
							</span>
						{/if}
					</p>
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if workRequestId}
				<button
					on:click={handleOpenContractModal}
					class="flex-shrink-0 rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-slate-600"
				>
					Create Contract
				</button>
			{/if}
		</div>
	</div>
</header>
