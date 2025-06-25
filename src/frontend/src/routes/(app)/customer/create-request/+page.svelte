<script lang="ts">
	import { goto } from '$app/navigation';

	// Simple icons for visual representation
	const icons = {
		work: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4 h-12 w-12 text-sky-400"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`,
		material: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4 h-12 w-12 text-amber-400"><path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V3.75m0 0L10.5 5.25M12 3.75l1.5 1.5" /></svg>`
	};
</script>

<div class="flex h-full flex-col space-y-8">
	<header>
		<h1 class="text-3xl font-bold text-emerald-400">Create a New Request</h1>
		<p class="mt-2 text-slate-400">
			What kind of request would you like to create? Choose an option below to get started.
		</p>
	</header>

	<div class="grid flex-grow grid-cols-1 gap-8 md:grid-cols-2">
		<!-- Work Request Card -->
		<button
			on:click={() => goto('/customer/create-work-request')}
			class="flex h-full flex-col items-center justify-center rounded-xl bg-slate-700/60 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:bg-slate-700 hover:ring-2 hover:ring-sky-500"
		>
			{@html icons.work}
			<h2 class="text-2xl font-semibold text-sky-300">Work Request</h2>
			<p class="mt-2 max-w-xs text-sm text-slate-400">
				Post a job to find skilled experts like plumbers, electricians, and masons for your project.
			</p>
		</button>

		<!-- Material Request Card -->
		<button
			on:click={() => goto('/customer/create-material-request')}
			class="flex h-full flex-col items-center justify-center rounded-xl bg-slate-700/60 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:bg-slate-700 hover:ring-2 hover:ring-amber-500"
		>
			{@html icons.material}
			<h2 class="text-2xl font-semibold text-amber-300">Material Request</h2>
			<p class="mt-2 max-w-xs text-sm text-slate-400">
				List the construction materials you need and get quotes from reliable suppliers.
			</p>
		</button>
	</div>
</div>
