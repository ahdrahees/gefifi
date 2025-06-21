<!-- gefifi-2/src/frontend/src/lib/components/ui/ProfessionalCard.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { UserProfile } from '$lib/types';

	export let professional: UserProfile;

	const dispatch = createEventDispatcher();

	function getProfessionalName(prof: UserProfile): string {
		return (
			prof.profile?.fullName ||
			prof.profile?.companyName ||
			prof.email.split('@')[0] ||
			'Professional'
		);
	}

	function handleSendInterestClick() {
		dispatch('sendInterest', {
			userId: professional.id,
			userName: getProfessionalName(professional)
		});
	}

	// Determine a default avatar if none is provided
	// Ensure '/hero/Default Avatar Construction Worker.png' exists in your `frontend/static/hero/` directory,
	// or replace with another suitable public placeholder URL or local static path.
	// const avatarUrl = professional.profile?.avatarUrl || '/images/default-avatar.png';

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
				class="h-20 w-20 flex-shrink-0 rounded-full border-2 border-emerald-600 object-cover p-1 shadow-md"
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
			on:click={handleSendInterestClick}
			class="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-150 ease-in-out hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			aria-label="Send interest to {getProfessionalName(professional)}"
		>
			Send Interest
		</button>
	</div>
</div>
