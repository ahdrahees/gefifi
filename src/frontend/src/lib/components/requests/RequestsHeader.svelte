<!-- src/frontend/src/lib/components/requests/RequestsHeader.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AuthUser } from '$lib/stores/auth';

	export let currentUser: AuthUser | null;
	export let totalRequests: number;

	const dispatch = createEventDispatcher();

	function handleCreateRequest() {
		dispatch('createRequest');
	}
</script>

<header
	class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div class="space-y-3">
			<div class="flex items-center gap-3">
				<span class="rounded-xl bg-emerald-500/20 p-2">
					<svg
						class="h-6 w-6 text-emerald-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</span>
				<div>
					<h1 class="text-2xl font-bold text-emerald-400 lg:text-3xl">My Requests</h1>
					<p class="text-slate-400">
						{#if currentUser?.userType === 'customer'}
							Manage your work and material requests
						{:else if currentUser?.userType === 'expert'}
							Track your work opportunities and contracts
						{:else if currentUser?.userType === 'supplier'}
							Monitor your material supply contracts
						{/if}
					</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<span
					class="rounded-full border border-slate-500/40 bg-slate-700/40 px-3 py-1 text-sm font-medium text-slate-200 capitalize"
				>
					{currentUser?.userType}
				</span>
				<span
					class="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300"
				>
					{totalRequests} Total Requests
				</span>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			{#if currentUser?.userType === 'customer'}
				<button
					on:click={handleCreateRequest}
					class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16M4 12h16"
						/>
					</svg>
					<span class="hidden sm:inline">Create Request</span>
					<span class="sm:hidden">Create</span>
				</button>
			{/if}

			<a
				href="/chat"
				class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-3 py-2 text-slate-200 transition-all hover:bg-slate-600/40 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
				<span class="hidden sm:inline">Messages</span>
			</a>
		</div>
	</div>
</header>
