<!-- gefifi-2/src/frontend/src/routes/(app)/active-projects/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser, ContractStatus, ProjectSummary } from '$lib/types';
	import apiClient from '$lib/api';
	import { page } from '$app/stores';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let activeTab: 'ongoing' | 'completed' = 'ongoing';

	let ongoingProjects: ProjectSummary[] = [];
	let completedProjects: ProjectSummary[] = [];
	let displayedProjects: ProjectSummary[] = [];

	let projects: any[] = [];
	let isLoading = true;
	let errorMessage = '';

	const ONGOING_STATUSES: ContractStatus[] = ['signed', 'in_progress', 'disputed'];
	const COMPLETED_STATUSES: ContractStatus[] = ['completed', 'cancelled', 'terminated'];

	async function fetchProjects() {
		isLoading = true;
		errorMessage = '';
		if (!currentUser) {
			errorMessage = 'User not authenticated.';
			isLoading = false;
			return;
		}

		try {
			const allContracts = await apiClient.getUserContracts();

			const enrichedProjects = await Promise.all(
				allContracts.map(async (contract) => {
					let otherPartyName = 'Unknown Party';
					let workRequestTitle = 'Contract-' + contract.id.substring(0, 8); // Default title

					const otherPartyId =
						contract.customerId === currentUser?.id
							? contract.expertSupplierId
							: contract.customerId;

					const [otherPartyRes, workRequestRes] = await Promise.allSettled([
						apiClient.getUserById(otherPartyId),
						contract.workRequestId
							? apiClient.getWorkRequestById(contract.workRequestId)
							: Promise.resolve(null)
					]);

					if (otherPartyRes.status === 'fulfilled' && otherPartyRes.value) {
						const userData: AuthUser = otherPartyRes.value;
						otherPartyName =
							userData.profile?.companyName ||
							userData.profile?.fullName ||
							userData.email.split('@')[0];
					} else {
						console.warn(`Failed to fetch profile for user ${otherPartyId}`);
					}

					if (workRequestRes.status === 'fulfilled' && workRequestRes.value) {
						workRequestTitle = workRequestRes.value.title;
					} else if (contract.workRequestId) {
						console.warn(`Failed to fetch work request ${contract.workRequestId}`);
					}

					const summary: ProjectSummary = {
						id: contract.id,
						workRequestId: contract.workRequestId,
						status: contract.status as ContractStatus,
						contractDate: contract.contractDate,
						workRequestTitle,
						otherPartyName
					};
					return summary;
				})
			);

			ongoingProjects = enrichedProjects
				.filter((p) => ONGOING_STATUSES.includes(p.status))
				.sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());

			completedProjects = enrichedProjects
				.filter((p) => COMPLETED_STATUSES.includes(p.status))
				.sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());
		} catch (err: any) {
			console.error('Projects fetch error:', err);
			errorMessage =
				err.data?.message || err.message || 'An error occurred while loading projects.';
		} finally {
			isLoading = false;
		}
	}

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

	$: {
		const tabFromUrl = $page.url.searchParams.get('tab') as 'ongoing' | 'completed' | null;
		activeTab = tabFromUrl === 'completed' ? 'completed' : 'ongoing';

		if (activeTab === 'ongoing') {
			displayedProjects = ongoingProjects;
		} else {
			displayedProjects = completedProjects;
		}
	}

	function getStatusClass(status: ContractStatus): string {
		switch (status) {
			case 'signed':
				return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
			case 'in_progress':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
			case 'disputed':
				return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
			case 'completed':
				return 'bg-emerald-600/30 text-emerald-300 border-emerald-600/60';
			case 'cancelled':
			case 'terminated':
				return 'bg-slate-600/30 text-slate-400 border-slate-500/50';
			default:
				return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
		}
	}
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
			<p class="mt-2 max-w-sm text-slate-400">
				When you create a contract with an expert or supplier, it will appear here.
			</p>
			<a
				href="/customer/create-request"
				class="mt-4 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600"
			>
				Create a New Request
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<ProjectCard {project} />
			{/each}
		</div>
	{/if}
</div>
