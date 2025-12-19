<script lang="ts">
	interface Props {
		activeTab?: 'details' | 'quotations';
		quotesCount?: number;
		onTabChange?: (detail: { tab: 'details' | 'quotations' }) => void;
	}

	let { activeTab = 'details', quotesCount = 0, onTabChange }: Props = $props();

	const tabs = [
		{
			id: 'details',
			label: 'Details',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			color: 'text-blue-400 border-blue-500/50 bg-blue-500/10'
		},
		{
			id: 'quotations',
			label: 'Quotations',
			icon: 'M8 2h8a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M12 11h4 M12 16h4 M8 11h.01 M8 16h.01',
			color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10'
		}
	];

	function handleTabClick(tabId: string) {
		onTabChange?.({ tab: tabId as 'details' | 'quotations' });
	}
</script>

<div class="mb-6">
	<div class="flex gap-2">
		{#each tabs as tab (tab.id)}
			<button
				onclick={() => handleTabClick(tab.id)}
				class="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all {activeTab ===
				tab.id
					? `${tab.color} shadow-lg`
					: 'border-slate-600/50 bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
				</svg>
				<span>{tab.label}</span>
				{#if tab.id === 'quotations' && quotesCount > 0}
					<span
						class="rounded-full px-2 py-0.5 text-xs font-bold {activeTab === tab.id
							? 'bg-white/20'
							: 'bg-slate-600'}"
					>
						{quotesCount}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
