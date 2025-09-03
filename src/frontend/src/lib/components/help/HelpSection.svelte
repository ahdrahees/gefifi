<!-- gefifi-2/src/frontend/src/lib/components/help/HelpSection.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { HelpSection } from './HelpContent';

	export let section: HelpSection;

	$: console.log('HelpSection component rendered with section:', section);

	const dispatch = createEventDispatcher();

	function toggleSection() {
		dispatch('toggle', section.id);
	}

	function provideFeedback(helpful: boolean) {
		dispatch('feedback', { sectionId: section.id, helpful });
	}

	// User type display
	function getUserTypeDisplay(userType: string) {
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

<article class="rounded-xl border border-slate-600/30 bg-slate-800/40 shadow-xl backdrop-blur-sm">
	<!-- Section Header -->
	<button
		on:click={toggleSection}
		class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-700/20"
	>
		<div class="flex items-center gap-4">
			<div class="flex-shrink-0">
				<div class="rounded-lg bg-emerald-500/20 p-2">
					<svg
						class="h-5 w-5 text-emerald-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>
			<div>
				<h2 class="text-xl font-semibold text-emerald-300">{section.title}</h2>
				<div class="mt-1 flex flex-wrap gap-2">
					{#each section.userTypes as userType}
						<span
							class="rounded-full px-2 py-1 text-xs font-medium {getUserTypeDisplay(userType)
								.bgColor} {getUserTypeDisplay(userType).color}"
						>
							{getUserTypeDisplay(userType).label}
						</span>
					{/each}
				</div>
			</div>
		</div>
		<div
			class="flex-shrink-0 transform transition-transform {section.expanded ? 'rotate-180' : ''}"
		>
			<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>

	<!-- Section Content -->
	{#if section.expanded}
		<div class="border-t border-slate-600/30 px-6 pb-6">
			<!-- Content -->
			<div class="prose prose-invert mt-6 max-w-none text-slate-200">
				{@html section.content
					.replace(/\n\n/g, '</p><p class="mt-4 text-slate-200">')
					.replace(/\n/g, '<br>')
					.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300 font-semibold">$1</strong>')
					.replace(/^(.*)$/g, '<p class="text-slate-200">$1</p>')}
			</div>

			<!-- Links -->
			{#if section.links && section.links.length > 0}
				<div class="mt-6 flex flex-wrap gap-3">
					{#each section.links as link}
						<a
							href={link.url}
							class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
							{link.text}
						</a>
					{/each}
				</div>
			{/if}

			<!-- Feedback -->
			<div class="mt-6 flex items-center justify-between border-t border-slate-600/20 pt-4">
				<span class="text-sm text-slate-400">Was this helpful?</span>
				<div class="flex gap-2">
					<button
						on:click={() => provideFeedback(true)}
						class="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300 transition-colors hover:border-green-500/50 hover:bg-green-500/20"
					>
						👍 Yes
					</button>
					<button
						on:click={() => provideFeedback(false)}
						class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/20"
					>
						👎 No
					</button>
				</div>
			</div>
		</div>
	{/if}
</article>
