<!-- src/frontend/src/lib/components/requests/RequestsTabNavigation.svelte -->
<script lang="ts">
	import type { StatusTab } from '$lib/types';
	import type { AuthUser } from '$lib/stores/auth';

	interface Props {
		activeTab: StatusTab;
		tabStats: Record<string, number>;
		currentUser: AuthUser | null;
		requestTypeFilter: 'all' | 'work' | 'material';
		searchQuery: string;
		onTabChange?: (tabId: StatusTab) => void;
		onTypeFilterChange?: (type: string) => void;
		onSearch?: (query: string) => void;
	}

	let {
		activeTab,
		tabStats,
		currentUser,
		requestTypeFilter,
		searchQuery,
		onTabChange,
		onTypeFilterChange,
		onSearch
	}: Props = $props();

	const tabs: {
		id: StatusTab;
		label: string;
		icon: string;
		color: string;
	}[] = [
		{
			id: 'active',
			label: 'Active',
			icon: 'M13 10V3L4 14h7v7l9-11h-7z',
			color: 'text-green-400 border-green-500/50 bg-green-500/10'
		},
		{
			id: 'contracted',
			label: 'Contracted',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			color: 'text-blue-400 border-blue-500/50 bg-blue-500/10'
		},
		{
			id: 'completed',
			label: 'Completed',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10'
		},
		{
			id: 'on_hold',
			label: 'On Hold',
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z',
			color: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'
		},
		{
			id: 'cancelled',
			label: 'Cancelled',
			icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'text-red-400 border-red-500/50 bg-red-500/10'
		},
		{
			id: 'expired',
			label: 'Expired',
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'text-orange-400 border-orange-500/50 bg-orange-500/10'
		}
	];

	function handleTabClick(tabId: StatusTab) {
		onTabChange?.(tabId);
	}

	function handleTypeFilterChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onTypeFilterChange?.(target.value);
	}

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onSearch?.(target.value);
	}

	function clearSearch() {
		onSearch?.('');
	}
</script>

<section
	class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
>
	<!-- Tab Navigation -->
	<div class="mb-6">
		<div class="flex flex-wrap gap-2">
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
					<span
						class="rounded-full px-2 py-0.5 text-xs font-bold {activeTab === tab.id
							? 'bg-white/20'
							: 'bg-slate-600'}"
					>
						{tabStats[tab.id] || 0}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<!-- Search -->
		<div class="relative flex-1 sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<input
				type="text"
				value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Search requests..."
				class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 py-2.5 pr-10 pl-10 text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
			/>
			{#if searchQuery}
				<button
					onclick={clearSearch}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
					aria-label="Clear search"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Request Type Filter (Only for customers) -->
		{#if currentUser?.userType === 'customer'}
			<div class="flex items-center gap-2">
				<label for="type-filter" class="text-sm font-medium text-slate-300">Type:</label>
				<select
					id="type-filter"
					value={requestTypeFilter}
					onchange={handleTypeFilterChange}
					class="rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
				>
					<option value="all">All Types</option>
					<option value="work">Work Requests</option>
					<option value="material">Material Requests</option>
				</select>
			</div>
		{/if}
	</div>
</section>
