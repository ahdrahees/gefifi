<!-- gefifi-2/src/frontend/src/routes/(app)/active-projects/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/types';
	import apiClient from '$lib/api';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let projects: any[] = [];
	let isLoading = true;
	let errorMessage = '';

	onMount(async () => {
		try {
			projects = await apiClient.getProjects();
		} catch (error: any) {
			console.error('Failed to fetch projects:', error);
			errorMessage = error.data?.message || 'Could not load your projects.';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="flex h-full flex-col space-y-8">
	<header>
		<h1 class="text-3xl font-bold text-emerald-400">My Projects</h1>
		<p class="mt-2 text-slate-400">
			Here are all your active and past projects, including both work and material contracts.
		</p>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="mr-3 h-8 w-8 animate-spin text-emerald-500"
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
			<p class="text-slate-300">Loading your projects...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300">
			<h3 class="font-bold">Error</h3>
			<p>{errorMessage}</p>
		</div>
	{:else if projects.length === 0}
		<div
			class="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-700/50 text-center"
		>
			<h3 class="text-xl font-semibold text-sky-300">No Projects Yet</h3>

			{#if currentUser?.userType === 'customer'}
				<p class="mt-2 max-w-sm text-slate-400">
					When you create a contract with an expert or supplier, it will appear here.
				</p>
				<a
					href="/customer/create-request"
					class="mt-4 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600"
				>
					Create a New Request
				</a>
			{:else}
				<p class="mt-2 max-w-sm text-slate-400">
					When a customer creates a contract with you, it will appear here.
				</p>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<ProjectCard {project} />
			{/each}
		</div>
	{/if}
</div>
