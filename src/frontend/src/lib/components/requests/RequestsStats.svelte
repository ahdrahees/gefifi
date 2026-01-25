<!-- src/frontend/src/lib/components/requests/RequestsStats.svelte -->
<script lang="ts">
	interface Props {
		tabStats: {
		active: number;
		contracted: number;
		completed: number;
		on_hold: number;
		cancelled: number;
	};
	}

	let { tabStats }: Props = $props();

	let totalActive = $derived(tabStats.active + tabStats.contracted);
	let completionRate =
		$derived(tabStats.completed > 0
			? Math.round((tabStats.completed / (tabStats.completed + tabStats.cancelled)) * 100)
			: 0);
</script>

<section
	class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
>
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
		<!-- Active Requests -->
		<div class="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
			<div class="mb-1 flex items-center justify-center">
				<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<p class="text-2xl font-bold text-green-400">{tabStats.active}</p>
			<p class="text-xs text-slate-400">Active</p>
		</div>

		<!-- Contracted -->
		<div class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
			<div class="mb-1 flex items-center justify-center">
				<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<p class="text-2xl font-bold text-blue-400">{tabStats.contracted}</p>
			<p class="text-xs text-slate-400">Contracted</p>
		</div>

		<!-- Completed -->
		<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
			<div class="mb-1 flex items-center justify-center">
				<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<p class="text-2xl font-bold text-emerald-400">{tabStats.completed}</p>
			<p class="text-xs text-slate-400">Completed</p>
		</div>

		<!-- On Hold -->
		<div class="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
			<div class="mb-1 flex items-center justify-center">
				<svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<p class="text-2xl font-bold text-yellow-400">{tabStats.on_hold}</p>
			<p class="text-xs text-slate-400">On Hold</p>
		</div>

		<!-- Cancelled -->
		<div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
			<div class="mb-1 flex items-center justify-center">
				<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<p class="text-2xl font-bold text-red-400">{tabStats.cancelled}</p>
			<p class="text-xs text-slate-400">Cancelled</p>
		</div>
	</div>

	<!-- Summary Stats -->
	<div
		class="mt-4 flex items-center justify-center gap-6 border-t border-slate-600/30 pt-4 text-sm"
	>
		<div class="text-center">
			<span class="text-slate-400">Total Active:</span>
			<span class="ml-1 font-semibold text-slate-200">{totalActive}</span>
		</div>
		{#if tabStats.completed > 0 || tabStats.cancelled > 0}
			<div class="text-center">
				<span class="text-slate-400">Success Rate:</span>
				<span class="ml-1 font-semibold text-emerald-400">{completionRate}%</span>
			</div>
		{/if}
	</div>
</section>
