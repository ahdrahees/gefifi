<!-- gefifi-2/src/frontend/src/routes/(app)/active-projects/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser, Project } from '$lib/types';
	import apiClient from '$lib/api';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let activeTab: 'ongoing' | 'completed' = 'ongoing';
	let allProjects: Project[] = [];
	let displayedProjects: Project[] = [];
	let isLoading = true;
	let errorMessage = '';

	const ONGOING_STATUSES = [
		'Not Started',
		'In Progress',
		'Awaiting Review',
		'Disputed',
		'Awaiting Dispatch',
		'Dispatched',
		'Delivered',
		'Issue Reported'
	];
	const COMPLETED_STATUSES = ['Completed', 'Cancelled', 'Terminated'];

	onMount(async () => {
		try {
			const projects = await apiClient.getProjects();
			allProjects = projects as Project[];
		} catch (error: any) {
			console.error('Failed to fetch projects:', error);
			errorMessage = error.data?.message || 'Could not load your projects.';
		} finally {
			isLoading = false;
		}
	});

	// Reactive block to filter projects based on the active tab
	$: {
		const tabFromUrl = $page.url.searchParams.get('tab') as 'ongoing' | 'completed' | null;
		activeTab = tabFromUrl === 'completed' ? 'completed' : 'ongoing';

		if (allProjects.length > 0) {
			const ongoing = allProjects.filter((p) => {
				const workStatus = p.workComponent?.status;
				const materialStatus = p.materialComponent?.status;
				// A project is ongoing if at least one of its components is ongoing
				return (
					(workStatus && ONGOING_STATUSES.includes(workStatus)) ||
					(materialStatus && ONGOING_STATUSES.includes(materialStatus))
				);
			});

			const completed = allProjects.filter((p) => {
				const workStatus = p.workComponent?.status;
				const materialStatus = p.materialComponent?.status;
				// A project is completed if ALL of its existing components are completed
				const isWorkCompleted = !workStatus || COMPLETED_STATUSES.includes(workStatus);
				const isMaterialCompleted = !materialStatus || COMPLETED_STATUSES.includes(materialStatus);
				return isWorkCompleted && isMaterialCompleted;
			});

			displayedProjects = activeTab === 'ongoing' ? ongoing : completed;
		} else {
			displayedProjects = [];
		}
	}
</script>

<div class="flex h-full flex-col space-y-8">
	<header>
		<h1 class="text-3xl font-bold text-emerald-400">My Projects</h1>
		<div class="mt-4 border-b border-slate-600">
			<nav class="-mb-px flex space-x-6" aria-label="Tabs">
				<button
					class="{activeTab === 'ongoing'
						? 'border-emerald-400 text-emerald-400'
						: 'border-transparent text-slate-400 hover:border-slate-400 hover:text-slate-200'} border-b-2 px-1 py-3 text-sm font-medium transition-colors"
					on:click={() => goto('/my-projects?tab=ongoing', { keepFocus: true, noScroll: true })}
				>
					Ongoing
				</button>
				<button
					class="{activeTab === 'completed'
						? 'border-emerald-400 text-emerald-400'
						: 'border-transparent text-slate-400 hover:border-slate-400 hover:text-slate-200'} border-b-2 px-1 py-3 text-sm font-medium transition-colors"
					on:click={() => goto('/my-projects?tab=completed', { keepFocus: true, noScroll: true })}
				>
					Completed
				</button>
			</nav>
		</div>
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
	{:else if displayedProjects.length === 0}
		<div
			class="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-700/50 text-center"
		>
			<h3 class="text-xl font-semibold text-sky-300">
				{activeTab === 'ongoing' ? 'No Ongoing Projects' : 'No Completed Projects'}
			</h3>
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
					Projects you are actively working on will appear here.
				</p>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each displayedProjects as project (project.id)}
				<div
					on:click={() => goto(`/my-projects/${project.id}?from=${activeTab}`)}
					class="cursor-pointer"
					role="link"
					tabindex="0"
					on:keypress
				>
					<ProjectCard {project} />
				</div>
			{/each}
		</div>
	{/if}
</div>
