<!-- gefifi-2/src/frontend/src/lib/components/ui/ProfessionalCard.svelte -->
<script lang="ts">

	import { page } from '$app/state';
	import type { AuthUser } from '$lib/types';
	import { assert } from '$lib/utils/assert';

	interface Props {
		professional: AuthUser;
		onSendInterest?: (detail: { userId: string; userName: string; userType:  'expert' | 'supplier' }) => void;
	}

	let { professional, onSendInterest }: Props = $props();



	// Determine if this is an invitation context (from a specific request)
	let isInvitationContext = $derived(!!page.url.searchParams.get('request-id'));
	let buttonText = $derived(isInvitationContext ? `Send Invitation` : 'Send Interest');

	function getProfessionalName(prof: AuthUser): string {
		if (prof.userType === 'supplier') {
			return prof.profile?.companyName || prof.email?.split('@')[0] || prof.phoneNumber || 'Supplier';
		}
		return prof.profile?.fullName || prof.email?.split('@')[0] || prof.phoneNumber || 'Professional';
	}

	function handleSendInterestClick() {
		assert(professional.userType === 'expert' || professional.userType === 'supplier', 'Professional must be either expert or supplier');
		onSendInterest?.({
			userId: professional.id,
			userName: getProfessionalName(professional),
			userType: professional.userType
		});
	}

	// Determine a default avatar if none is provided
	const avatarUrl =
		professional.profile?.avatarUrl ||
		(professional.userType === 'expert' ? '/images/default-avatar.png' : '/images/warehouse.png');
</script>

<div
	class="flex h-full flex-col justify-between rounded-xl bg-slate-700/70 p-5 shadow-xl transition-all duration-300 ease-in-out hover:ring-2 hover:shadow-emerald-500/25 hover:ring-emerald-500/40"
>
	<div>
		<div class="mb-4 flex items-center space-x-4">
			<img
				src={avatarUrl}
				alt="Profile of {getProfessionalName(professional)}"
				class="h-20 w-20 shrink-0 rounded-full border-2 border-emerald-600 object-cover p-1 shadow-md"
				loading="lazy"
			/>
			<div class="overflow-hidden">
				<h3
					class="truncate text-xl font-semibold text-emerald-300"
					title={getProfessionalName(professional)}
				>
					{getProfessionalName(professional)}
				</h3>
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase
                        {professional.userType === 'expert'
						? 'bg-sky-500/30 text-sky-300'
						: 'bg-amber-500/30 text-amber-300'}"
				>
					{professional.userType}
				</span>
			</div>
		</div>

		<div class="space-y-1.5 text-sm text-slate-300">
			{#if professional.userType === 'expert' && professional.profile?.expertise}
				<p>
					<strong class="font-medium text-slate-100">Expertise:</strong>
					<span class="text-slate-300">{professional.profile.expertise}</span>
				</p>
			{/if}
			{#if professional.userType === 'supplier' && professional.profile?.category}
				<p>
					<strong class="font-medium text-slate-100">Materials:</strong>
					<span class="text-slate-300">{professional.profile.category}</span>
				</p>
			{/if}
			{#if professional.profile?.location}
				<p>
					<strong class="font-medium text-slate-100">Location:</strong>
					<span class="text-slate-300">{professional.profile.location}</span>
				</p>
			{/if}
			{#if professional.profile?.experience}
				<p>
					<strong class="font-medium text-slate-100">Experience:</strong>
					<span class="text-slate-300">{professional.profile.experience}</span>
				</p>
			{/if}
		</div>
	</div>

	<div class="mt-5 border-t border-slate-600/70 pt-4">
		<button
			onclick={handleSendInterestClick}
			class="w-full rounded-lg {isInvitationContext
				? 'bg-emerald-500 hover:bg-emerald-600'
				: 'bg-emerald-500 hover:bg-emerald-600'} px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-150 ease-in-out focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			aria-label="{buttonText} to {getProfessionalName(professional)}"
		>
			{#if isInvitationContext}
				<svg class="mr-1.5 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
					/>
				</svg>
			{:else}
				<svg class="mr-1.5 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			{/if}
			{buttonText}
		</button>
	</div>
</div>
