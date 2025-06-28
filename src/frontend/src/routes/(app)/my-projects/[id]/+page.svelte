<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { Project } from '$lib/types';
	import WorkRequestCard from '$lib/components/ui/WorkRequestCard.svelte';
	import MaterialRequestCard from '$lib/components/ui/MaterialRequestCard.svelte';

	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let project: Project | null = null;
	let isLoading = true;
	let errorMessage = '';

	let fromTab: 'ongoing' | 'completed' = 'ongoing';

	// For Status Update UI
	let isUpdatingStatus: 'work' | 'material' | false = false;
	let statusUpdateMessage: { type: 'success' | 'error'; text: string } | null = null;
	let selectedWorkStatus: string;
	let selectedMaterialStatus: string;

	async function fetchProjectDetails() {
		const id = $page.params.id;
		if (!id) {
			errorMessage = 'Project ID not found in URL.';
			isLoading = false;
			return;
		}
		isLoading = true;
		try {
			project = await apiClient.getProjectById(id);
			if (project?.workComponent) selectedWorkStatus = project.workComponent.status;
			if (project?.materialComponent) selectedMaterialStatus = project.materialComponent.status;
		} catch (err: any) {
			errorMessage = err.data?.message || 'Failed to load project details.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		const from = $page.url.searchParams.get('from');
		if (from === 'completed') fromTab = 'completed';
		fetchProjectDetails();
	});

	async function handleUpdateStatus(component: 'work' | 'material') {
		if (!project) return;

		const newStatus = component === 'work' ? selectedWorkStatus : selectedMaterialStatus;
		const currentStatus =
			component === 'work' ? project.workComponent?.status : project.materialComponent?.status;

		if (newStatus === currentStatus) {
			statusUpdateMessage = { type: 'error', text: 'No new status selected.' };
			return;
		}

		isUpdatingStatus = component;
		statusUpdateMessage = null;
		try {
			const updatedProject = await apiClient.updateProjectStatus(project.id, {
				component,
				newStatus
			});
			project = { ...project, ...updatedProject };
			statusUpdateMessage = { type: 'success', text: 'Status updated successfully!' };
		} catch (error: any) {
			statusUpdateMessage = { type: 'error', text: error.data?.message || 'Update failed.' };
		} finally {
			isUpdatingStatus = false;
		}
	}

	function getStatusClass(status: string | undefined, type: 'badge' | 'text' = 'badge') {
		const classes: Record<string, { badge: string; text: string }> = {
			'Not Started': {
				badge: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
				text: 'text-gray-300'
			},
			'Awaiting Dispatch': {
				badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
				text: 'text-yellow-300'
			},
			'In Progress': {
				badge: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
				text: 'text-blue-300'
			},
			Dispatched: {
				badge: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
				text: 'text-blue-300'
			},
			'Awaiting Review': {
				badge: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
				text: 'text-sky-300'
			},
			Delivered: {
				badge: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
				text: 'text-sky-300'
			},
			Completed: {
				badge: 'bg-green-600/30 text-green-300 border-green-600/60',
				text: 'text-green-300'
			},
			Disputed: { badge: 'bg-red-500/20 text-red-300 border-red-500/50', text: 'text-red-300' },
			'Issue Reported': {
				badge: 'bg-red-500/20 text-red-300 border-red-500/50',
				text: 'text-red-300'
			},
			Cancelled: {
				badge: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
				text: 'text-slate-400'
			},
			Terminated: {
				badge: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
				text: 'text-slate-400'
			},
			default: { badge: 'bg-gray-700 text-gray-400', text: 'text-gray-400' }
		};
		return status && classes[status] ? classes[status][type] : classes.default[type];
	}

	$: workStatusOptions = ((currentStatus: string | undefined) => {
		if (!currentStatus) return [];
		const options: { value: string; label: string }[] = [];
		switch (currentStatus) {
			case 'Not Started':
				options.push({ value: 'In Progress', label: 'Start Work (In Progress)' });
				options.push({ value: 'Cancelled', label: 'Cancel Project' });
				break;
			case 'In Progress':
				if (currentUser?.userType !== 'customer') {
					options.push({ value: 'Awaiting Review', label: 'Mark as Ready for Review' });
				}
				options.push({ value: 'Disputed', label: 'Raise a Dispute' });
				break;
			case 'Awaiting Review':
				if (currentUser?.userType === 'customer') {
					options.push({ value: 'Completed', label: 'Mark as Completed' });
					options.push({ value: 'Disputed', label: 'Report Issue / Dispute' });
				}
				break;
		}
		return options;
	})(project?.workComponent?.status);

	$: materialStatusOptions = ((currentStatus: string | undefined) => {
		if (!currentStatus) return [];
		const options: { value: string; label: string }[] = [];
		switch (currentStatus) {
			case 'Awaiting Dispatch':
				if (currentUser?.userType !== 'customer') {
					options.push({ value: 'Dispatched', label: 'Mark as Dispatched' });
				}
				options.push({ value: 'Cancelled', label: 'Cancel Order' });
				break;
			case 'Dispatched':
				if (currentUser?.userType === 'customer') {
					options.push({ value: 'Delivered', label: 'Mark as Delivered' });
				}
				break;
			case 'Delivered':
				if (currentUser?.userType === 'customer') {
					options.push({ value: 'Completed', label: 'Mark as Completed' });
					options.push({ value: 'Issue Reported', label: 'Report Issue' });
				}
				break;
		}
		return options;
	})(project?.materialComponent?.status);
</script>

<div class="space-y-6 pb-12">
	<header>
		<button
			on:click={() => goto(`/my-projects?tab=${fromTab}`)}
			class="mb-2 text-sm text-sky-400 hover:underline"
		>
			&larr; Back to {fromTab === 'completed' ? 'Completed' : 'Ongoing'} Projects
		</button>
		{#if isLoading}
			<div class="mt-1 h-10 w-3/4 animate-pulse rounded bg-slate-700"></div>
		{:else if project}
			<h1 class="text-3xl font-bold text-emerald-400" title={project.title}>
				{project.title}
			</h1>
		{/if}
	</header>

	{#if isLoading}
		<div class="text-center text-slate-300">Loading project details...</div>
	{:else if errorMessage}
		<div class="rounded-lg bg-red-600/30 p-6 text-center text-red-200">
			<h2 class="text-xl font-bold">Error</h2>
			<p>{errorMessage}</p>
		</div>
	{:else if project}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<div class="flex flex-col gap-8 lg:col-span-2">
				{#if project.workComponent && (currentUser?.userType === 'customer' || currentUser?.userType === 'expert')}
					<section class="rounded-xl bg-slate-700/50 p-6 shadow-lg">
						<div
							class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
						>
							<h2 class="text-2xl font-semibold text-sky-300">Work Progress</h2>
							{#if project.workComponent}
								<a
									href={`/contracts/${project.workComponent.contractId}`}
									class="text-sm text-emerald-400 hover:underline">View Work Contract &rarr;</a
								>
							{/if}
						</div>
						{#if project.workComponent}
							<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<p class="text-sm text-slate-400">
										{currentUser?.userType === 'customer' ? 'Expert' : 'Customer'}
									</p>
									<p class="text-lg font-medium text-slate-100">
										{currentUser?.userType === 'customer'
											? project.expert?.profile?.fullName
											: project.customer?.profile?.fullName || 'N/A'}
									</p>
									{#if currentUser?.userType === 'customer' && project.expert}
										<p class="text-xs text-slate-400">
											{project.expert.profile?.expertise || ''}
											{#if project.expert.profile?.location}
												&middot; {project.expert.profile.location}
											{/if}
										</p>
									{/if}
								</div>
								<div>
									<p class="text-sm text-slate-400">Status</p>
									<p
										class={`text-lg font-bold ${getStatusClass(project.workComponent.status, 'text')}`}
									>
										{project.workComponent.status}
									</p>
								</div>
							</div>
							{#if project.workComponent.chatId}
								<div class="mt-4">
									<button
										on:click={() => goto(`/chat/${project.workComponent.chatId}`)}
										class="w-full rounded-lg bg-sky-600 py-2 font-semibold text-white hover:bg-sky-500"
										>Go to Chat with Expert</button
									>
								</div>
							{/if}
							{#if workStatusOptions.length > 0}
								<div class="mt-4 border-t border-slate-600 pt-4">
									<h4 class="text-md mb-2 font-semibold text-slate-200">Update Status</h4>
									<div class="flex items-center gap-4">
										<select
											bind:value={selectedWorkStatus}
											class="flex-grow rounded-lg border border-slate-600 bg-slate-700/80 p-2 text-slate-100"
										>
											{#each workStatusOptions as option}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
										<button
											on:click={() => handleUpdateStatus('work')}
											disabled={isUpdatingStatus === 'work'}
											class="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
										>
											{isUpdatingStatus === 'work' ? 'Updating...' : 'Update'}
										</button>
									</div>
								</div>
							{/if}
							{#if project.workComponent.statusHistory}
								<div class="mt-4 border-t border-slate-600 pt-4">
									<h4 class="text-md mb-2 font-semibold text-slate-200">History</h4>
									<ul class="space-y-2 text-sm">
										{#each project.workComponent.statusHistory.slice().reverse() as entry}
											<li class="flex justify-between text-slate-400">
												<span>{entry.status}</span>
												<span>{new Date(entry.updatedAt).toLocaleString()}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/if}
					</section>
				{/if}

				{#if project.materialComponent && (currentUser?.userType === 'customer' || currentUser?.userType === 'supplier')}
					<section class="rounded-xl bg-slate-700/50 p-6 shadow-lg">
						<div
							class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
						>
							<h2 class="text-2xl font-semibold text-amber-300">Material Delivery</h2>
							{#if project.materialComponent}
								<a
									href={`/contracts/${project.materialComponent.contractId}`}
									class="text-sm text-emerald-400 hover:underline">View Material Contract &rarr;</a
								>
							{/if}
						</div>
						{#if project.materialComponent}
							<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<p class="text-sm text-slate-400">
										{currentUser?.userType === 'customer' ? 'Supplier' : 'Customer'}
									</p>
									<p class="text-lg font-medium text-slate-100">
										{currentUser?.userType === 'customer'
											? project.supplier?.profile?.companyName
											: project.customer?.profile?.fullName || 'N/A'}
									</p>
									{#if currentUser?.userType === 'customer' && project.supplier}
										<p class="text-xs text-slate-400">
											{project.supplier.profile?.category || ''}
											{#if project.supplier.profile?.location}
												&middot; {project.supplier.profile.location}
											{/if}
										</p>
									{/if}
								</div>
								<div>
									<p class="text-sm text-slate-400">Status</p>
									<p
										class={`text-lg font-bold ${getStatusClass(
											project.materialComponent.status,
											'text'
										)}`}
									>
										{project.materialComponent.status}
									</p>
								</div>
							</div>
							{#if project.materialComponent.chatId}
								<div class="mt-4">
									<button
										on:click={() => goto(`/chat/${project.materialComponent.chatId}`)}
										class="w-full rounded-lg bg-amber-600 py-2 font-semibold text-white hover:bg-amber-500"
										>Go to Chat with Supplier</button
									>
								</div>
							{/if}
							{#if materialStatusOptions.length > 0}
								<div class="mt-4 border-t border-slate-600 pt-4">
									<h4 class="text-md mb-2 font-semibold text-slate-200">Update Status</h4>
									<div class="flex items-center gap-4">
										<select
											bind:value={selectedMaterialStatus}
											class="flex-grow rounded-lg border border-slate-600 bg-slate-700/80 p-2 text-slate-100"
										>
											{#each materialStatusOptions as option}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
										<button
											on:click={() => handleUpdateStatus('material')}
											disabled={isUpdatingStatus === 'material'}
											class="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
										>
											{isUpdatingStatus === 'material' ? 'Updating...' : 'Update'}
										</button>
									</div>
								</div>
							{/if}
							{#if project.materialComponent.statusHistory}
								<div class="mt-4 border-t border-slate-600 pt-4">
									<h4 class="text-md font-semibold text-slate-200">History</h4>
									<ul class="space-y-2 text-sm">
										{#each project.materialComponent.statusHistory.slice().reverse() as entry}
											<li class="flex justify-between text-slate-400">
												<span>{entry.status}</span>
												<span>{new Date(entry.updatedAt).toLocaleString()}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/if}
					</section>
				{/if}
			</div>

			<div class="space-y-8 lg:col-span-1">
				{#if project.workRequest}
					<div>
						<h3 class="mb-3 text-xl font-semibold text-sky-300">Original Work Request</h3>
						<WorkRequestCard request={project.workRequest} />
					</div>
				{/if}
				{#if project.materialRequest}
					<div>
						<h3 class="mb-3 text-xl font-semibold text-amber-300">Original Material Request</h3>
						<MaterialRequestCard request={project.materialRequest} />
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
