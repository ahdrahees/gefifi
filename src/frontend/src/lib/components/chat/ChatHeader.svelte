<!-- gefifi-2/src/frontend/src/lib/components/chat/ChatHeader.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AuthUser } from '$lib/types';
	import { authStore } from '$lib/stores/auth';
	import OnlineStatus from './OnlineStatus.svelte';
	import DropdownMenu from '../ui/DropdownMenu.svelte';
	import MarqueeText from '../ui/MarqueeText.svelte';

	export let isLoading: boolean = true;
	export let chatPageTitle: string = 'Chat';
	export let otherParticipantProfile: AuthUser | null = null;
	export let workRequestId: string | undefined = undefined;
	export let materialRequestId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	// Determine if we should show the contract button
	$: hasRequest = workRequestId || materialRequestId;
	$: contractButtonText = 'Create Contract';

	function handleBackClick() {
		dispatch('navigateBack');
	}

	function handleCreateContract() {
		if (!hasRequest || !otherParticipantProfile) {
			console.warn('Missing required data for contract creation');
			return;
		}

		// Build URL parameters for the contract creation page
		const params = new URLSearchParams();

		if (workRequestId) {
			params.set('workRequestId', workRequestId);
		} else if (materialRequestId) {
			params.set('materialRequestId', materialRequestId);
		}

		if ($authStore.user?.userType === 'customer') {
			params.set('customerId', $authStore.user?.id);
			params.set('expertSupplierId', otherParticipantProfile.id);
		} else {
			params.set('customerId', otherParticipantProfile.id);
			params.set('expertSupplierId', $authStore?.user?.id as string);
		}

		// Navigate to the contract creation page
		goto(`/contracts/create?${params.toString()}`);
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
		<div class="flex w-full min-w-0 items-center gap-3">
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
				<div class="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-700"></div>
				<div class="min-w-0 flex-1 space-y-2">
					<div class="h-4 w-32 animate-pulse rounded bg-slate-700"></div>
					<div class="h-3 w-20 animate-pulse rounded bg-slate-700"></div>
				</div>
			{:else if otherParticipantProfile}
				{@const typeInfo = getUserTypeDisplay(otherParticipantProfile.userType)}
				<!-- Avatar with Online Status -->
				<div class="relative flex-shrink-0">
					<img
						src={otherParticipantProfile.profile?.avatarUrl || '/images/default-avatar.png'}
						alt="Avatar"
						class="box-content h-10 w-10 flex-shrink-0 rounded-full border-2 border-slate-600 object-cover"
					/>
					<OnlineStatus userId={otherParticipantProfile.id} size="md" />
				</div>
				<div class="w-full min-w-0 flex-1 space-y-1">
					<div class="flex items-center gap-2">
						<h2 class="truncate font-semibold text-slate-200">{chatPageTitle}</h2>
						<span
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {typeInfo.color} {typeInfo.bgColor}"
						>
							{typeInfo.label}
						</span>
					</div>
					<div class="flex w-full items-center gap-3 truncate text-xs text-slate-400">
						<OnlineStatus
							userId={otherParticipantProfile.id}
							showLastSeen={true}
							disableDotIndicator
							size="sm"
						/>
						{#if otherParticipantProfile.userType === 'expert' && otherParticipantProfile.profile.expertise}
							<MarqueeText
								text={otherParticipantProfile.profile.expertise}
								maxWidth="120px"
								responsiveMaxWidth="max-w-[80px] sm:max-w-[120px] lg:max-w-[150px] xl:max-w-[200px] 2xl:max-w-[300px]"
							/>
						{:else if otherParticipantProfile.userType === 'supplier' && otherParticipantProfile.profile.category}
							<MarqueeText
								text={otherParticipantProfile.profile.category}
								responsiveMaxWidth="max-w-[80px] sm:max-w-[120px] lg:max-w-[150px] xl:max-w-[200px] 2xl:max-w-[300px]"
							/>
						{/if}
						{#if otherParticipantProfile.profile?.location}
							<MarqueeText
								text="📍 {otherParticipantProfile.profile.location}"
								responsiveMaxWidth="max-w-[80px] sm:max-w-[100px] lg:max-w-[125px] xl:max-w-[150px] 2xl:max-w-[200px]"
							/>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="flex max-w-fit items-center gap-2">
			{#if hasRequest}
				<DropdownMenu position="right" let:closeDropdown>
					<svelte:fragment slot="trigger">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
							/>
						</svg>
					</svelte:fragment>

					<!-- Dropdown Menu Items -->
					<button
						type="button"
						class="dropdown-menu-item"
						on:click={() => {
							handleCreateContract();
							closeDropdown();
						}}
						title="Create a formal contract for this {workRequestId
							? 'work request'
							: 'material request'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-file-plus2-icon lucide-file-plus-2"
							><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" /><path
								d="M14 2v4a2 2 0 0 0 2 2h4"
							/><path d="M3 15h6" /><path d="M6 12v6" /></svg
						>
						{contractButtonText}
					</button>

					<!-- Future menu items can be added here -->
					<!-- Example: -->
					<!-- <div class="dropdown-menu-separator"></div> -->
					<!-- <button type="button" class="dropdown-menu-item" on:click={() => { handleSomeAction(); closeDropdown(); }}>
						<svg>...</svg>
						Some Action
					</button> -->
				</DropdownMenu>
			{/if}
		</div>
	</div>
</header>
