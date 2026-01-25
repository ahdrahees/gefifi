<!-- src/frontend/src/lib/components/requests/RequestsList.svelte -->
<script lang="ts">
	import type { AuthUser } from '$lib/stores/auth';
	import type { RequestWithType } from '$lib/types';
	import RequestCard from './RequestCard.svelte';

	interface Props {
		requests: RequestWithType[];
		currentUser: AuthUser | null;
		isLoading: boolean;
		errorMessage: string;
		onStatusUpdate?: (detail: any) => void;
		onRefresh?: () => void;
	}

	let { requests, currentUser, isLoading, errorMessage, onStatusUpdate, onRefresh }: Props =
		$props();

	function handleRefresh() {
		onRefresh?.();
	}
</script>

<section class="rounded-2xl border border-slate-600/30 bg-slate-800/40 shadow-xl backdrop-blur-sm">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center p-8">
			<div class="flex items-center space-x-3">
				<svg
					class="h-8 w-8 animate-spin text-emerald-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<p class="text-xl text-slate-300">Loading requests...</p>
			</div>
		</div>
	{:else if errorMessage}
		<div class="p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20"
			>
				<svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold text-red-300">Error Loading Requests</h3>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				onclick={handleRefresh}
				class="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
			>
				Try Again
			</button>
		</div>
	{:else if requests.length === 0}
		<div class="p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-600/50"
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
					class="lucide lucide-clipboard-icon lucide-clipboard h-8 w-8 text-slate-400"
					><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path
						d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
					/></svg
				>
			</div>
			<h2 class="mb-3 text-xl font-bold text-sky-400">No Requests Found</h2>
			<p class="text-slate-300">
				{#if currentUser?.userType === 'customer'}
					You haven't created any requests in this category yet.
				{:else}
					No requests match your current filters.
				{/if}
			</p>
		</div>
	{:else}
		<div class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-slate-200">
					{requests.length} Request{requests.length !== 1 ? 's' : ''}
				</h3>
				<button
					onclick={handleRefresh}
					class="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-600/50"
					aria-label="Refresh requests"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					<span class="hidden sm:inline">Refresh</span>
				</button>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each requests as request (request.id)}
					<RequestCard {request} {currentUser} {onStatusUpdate} />
				{/each}
			</div>
		</div>
	{/if}
</section>
