<!-- gefifi-2/src/frontend/src/routes/(app)/active-projects/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';

	// TODO: Move these types to a central types.ts file
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier';
		profile?: {
			fullName?: string;
			companyName?: string;
		};
	};

	type ContractStatus =
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled'
		| 'terminated';

	type EnrichedProject = {
		id: string;
		workRequestId?: string;
		customerId: string;
		expertSupplierId: string;
		status: ContractStatus;
		contractDate: string;
		workRequestTitle?: string;
		otherPartyName?: string;
	};

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let activeTab: 'ongoing' | 'completed' = 'ongoing';

	let ongoingProjects: EnrichedProject[] = [];
	let completedProjects: EnrichedProject[] = [];
	let displayedProjects: EnrichedProject[] = [];

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
						const userData = otherPartyRes.value;
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

					return {
						id: contract.id,
						workRequestId: contract.workRequestId,
						customerId: contract.customerId,
						expertSupplierId: contract.expertSupplierId,
						status: contract.status as ContractStatus,
						contractDate: contract.contractDate,
						workRequestTitle,
						otherPartyName
					};
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

	onMount(() => {
		fetchProjects();
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

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold text-emerald-400">My Projects</h1>
		<div class="mt-4 border-b border-slate-600">
			<nav class="-mb-px flex space-x-6" aria-label="Tabs">
				<button
					class="{activeTab === 'ongoing'
						? 'border-emerald-400 text-emerald-400'
						: 'border-transparent text-slate-400 hover:border-slate-400 hover:text-slate-200'} border-b-2
						px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors"
					on:click={() => goto('/my-projects?tab=ongoing', { keepFocus: true, noScroll: true })}
				>
					Ongoing ({ongoingProjects.length})
				</button>
				<button
					class="{activeTab === 'completed'
						? 'border-emerald-400 text-emerald-400'
						: 'border-transparent text-slate-400 hover:border-slate-400 hover:text-slate-200'} border-b-2
						px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors"
					on:click={() => goto('/my-projects?tab=completed', { keepFocus: true, noScroll: true })}
				>
					Completed ({completedProjects.length})
				</button>
			</nav>
		</div>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-8 w-8 animate-spin text-emerald-500"
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
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300 shadow">
			<h3 class="text-lg font-bold">Error Loading Projects</h3>
			<p>{errorMessage}</p>
			<button
				class="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
				on:click={fetchProjects}>Try Again</button
			>
		</div>
	{:else if displayedProjects.length === 0}
		<div class="rounded-xl bg-slate-700/50 p-8 text-center shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-4 h-16 w-16 text-slate-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M20.25 14.15v4.05a2.25 2.25 0 01-2.25 2.25H5.625a2.25 2.25 0 01-2.25-2.25v-13.5a2.25 2.25 0 012.25-2.25h4.05m-4.05 0a2.25 2.25 0 012.25-2.25h3.75a2.25 2.25 0 012.25 2.25m4.5 0v4.05a2.25 2.25 0 002.25 2.25h4.05a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25h-4.05a2.25 2.25 0 00-2.25 2.25v4.05m0 0a2.25 2.25 0 00-2.25 2.25h-4.05a2.25 2.25 0 00-2.25-2.25V6.75a2.25 2.25 0 002.25-2.25h3.75a2.25 2.25 0 002.25 2.25z"
				/>
			</svg>
			<h2 class="mb-2 text-xl font-semibold text-sky-400">
				{#if activeTab === 'ongoing'}
					No Active Projects
				{:else}
					No Completed Projects
				{/if}
			</h2>
			<p class="text-slate-300">
				{#if activeTab === 'ongoing'}
					You currently have no projects with a 'signed' or 'in progress' status.
				{:else}
					You have no projects that have been completed or cancelled.
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			{#each displayedProjects as project (project.id)}
				<a
					href={`/my-projects/${project.id}?from=${activeTab}`}
					class="focus-within:ring-opacity-75 block rounded-lg bg-slate-700/60 p-5 shadow-lg transition-all duration-200 ease-in-out focus-within:ring-2 focus-within:ring-emerald-500 hover:bg-slate-600/80 hover:shadow-emerald-500/20 focus:outline-none"
					aria-label="View project details for {project.workRequestTitle}"
				>
					<div class="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
						<h3 class="pr-2 text-lg font-semibold text-sky-300" title={project.workRequestTitle}>
							{project.workRequestTitle}
						</h3>
						<span
							class="rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap {getStatusClass(
								project.status
							)}"
						>
							{project.status.replace(/_/g, ' ').toUpperCase()}
						</span>
					</div>
					<div class="space-y-1 text-sm text-slate-400">
						<p>
							With: <span class="font-medium text-slate-200">{project.otherPartyName}</span>
						</p>
						<p>
							Contract Date: <span class="font-medium text-slate-300"
								>{new Date(project.contractDate).toLocaleDateString('en-GB', {
									day: '2-digit',
									month: 'short',
									year: 'numeric'
								})}</span
							>
						</p>
					</div>
					<div class="mt-4 text-right">
						<span class="text-sm font-medium text-emerald-400 group-hover:underline">
							View Project &rarr;
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
