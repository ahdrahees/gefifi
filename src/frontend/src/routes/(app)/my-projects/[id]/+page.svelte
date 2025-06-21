<!-- gefifi-2/src/frontend/src/routes/(app)/active-projects/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';

	// TODO: Move these types to a central types.ts file
	type ContractStatus =
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled'
		| 'terminated';

	type FullProjectDetails = {
		contract: any;
		workRequest?: any;
		customer: any;
		provider: any;
	};

	let project: FullProjectDetails | null = null;
	let relevantChatId: string | null = null;
	let currentUser: AuthUser | null = null;
	authStore.subscribe((auth) => (currentUser = auth.user));

	let isLoading = true;
	let errorMessage = '';

	// For Status Update UI
	let selectedStatus: ContractStatus;
	let isUpdatingStatus = false;
	let statusUpdateMessage: { type: 'success' | 'error'; text: string } | null = null;
	let fromTab: 'ongoing' | 'completed' = 'ongoing';

	async function fetchProjectDetails(id: string) {
		isLoading = true;
		errorMessage = '';
		try {
			// Fetch the core contract using apiClient
			const contractData = await apiClient.getContractById(id);
			selectedStatus = contractData.status as ContractStatus;

			// Fetch related data in parallel
			const [workRequestRes, customerRes, providerRes] = await Promise.allSettled([
				contractData.workRequestId
					? apiClient.getWorkRequestById(contractData.workRequestId)
					: Promise.resolve(null),
				apiClient.getUserById(contractData.customerId),
				apiClient.getUserById(contractData.expertSupplierId)
			]);

			project = {
				contract: contractData,
				workRequest: workRequestRes.status === 'fulfilled' ? workRequestRes.value : null,
				customer: customerRes.status === 'fulfilled' ? customerRes.value : null,
				provider: providerRes.status === 'fulfilled' ? providerRes.value : null
			};

			// After project is loaded, find the relevant chat
			if (project) {
				try {
					const allChats = await apiClient.getUserChats();
					const chat = allChats.find(
						(c) =>
							c.participants.length === 2 &&
							c.participants.includes(project.contract.customerId) &&
							c.participants.includes(project.contract.expertSupplierId)
					);
					if (chat) {
						relevantChatId = chat.id;
					}
				} catch (chatError) {
					console.warn('Could not determine chat room for this project.', chatError);
				}
			}
		} catch (err: any) {
			console.error('Failed to fetch project details:', err);
			errorMessage = err.data?.message || err.message || 'An unknown error occurred.';
		} finally {
			isLoading = false;
		}
	}

	async function handleUpdateStatus() {
		if (!project || !selectedStatus || project.contract.status === selectedStatus) {
			statusUpdateMessage = { type: 'error', text: 'No new status selected.' };
			return;
		}

		isUpdatingStatus = true;
		statusUpdateMessage = null;
		try {
			const result = await apiClient.updateContractStatus(project.contract.id, {
				status: selectedStatus
			});

			// Update local state to reflect the change immediately
			project.contract = { ...project.contract, ...result };
			statusUpdateMessage = { type: 'success', text: 'Project status updated successfully!' };
		} catch (error: any) {
			console.error('Status update error:', error);
			statusUpdateMessage = { type: 'error', text: error.data?.message || error.message };
		} finally {
			isUpdatingStatus = false;
		}
	}

	onMount(() => {
		const id = $page.params.id;
		const from = $page.url.searchParams.get('from');
		if (from === 'completed') {
			fromTab = 'completed';
		}

		if (id) {
			fetchProjectDetails(id);
		} else {
			errorMessage = 'Project ID not found in URL.';
			isLoading = false;
		}
	});

	// --- Computed properties and helpers ---
	$: projectTitle =
		project?.workRequest?.title || `Contract: ${project?.contract.id.substring(0, 8)}...`;
	$: otherParty =
		currentUser?.id === project?.contract.customerId ? project?.provider : project?.customer;

	$: statusOptions = ((currentStatus: ContractStatus | undefined) => {
		if (!currentStatus) return [];
		const options: { value: ContractStatus; label: string }[] = [];
		switch (currentStatus) {
			case 'signed':
				options.push({ value: 'in_progress', label: 'Start Work (In Progress)' });
				options.push({ value: 'cancelled', label: 'Cancel Project' });
				break;
			case 'in_progress':
				options.push({ value: 'completed', label: 'Mark as Completed' });
				options.push({ value: 'disputed', label: 'Raise a Dispute' });
				options.push({ value: 'cancelled', label: 'Cancel Project' });
				break;
			case 'disputed':
				// From a dispute, can maybe go back to in_progress or get cancelled
				options.push({ value: 'in_progress', label: 'Resolve Dispute (In Progress)' });
				options.push({ value: 'cancelled', label: 'Cancel Project' });
				break;
		}
		return options;
	})(project?.contract.status);

	function getStatusClass(status: string | undefined, type: 'badge' | 'text' = 'badge') {
		if (!status) return '';
		const classes = {
			signed: { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/50', text: 'text-sky-300' },
			in_progress: {
				badge: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
				text: 'text-blue-300'
			},
			completed: {
				badge: 'bg-green-600/30 text-green-300 border-green-600/60',
				text: 'text-green-300'
			},
			disputed: {
				badge: 'bg-red-500/20 text-red-300 border-red-500/50',
				text: 'text-red-300'
			},
			cancelled: {
				badge: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
				text: 'text-slate-400'
			},
			default: { badge: 'bg-gray-500/20 text-gray-300', text: 'text-gray-300' }
		};
		return (classes[status] || classes.default)[type];
	}
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<p class="text-xl text-slate-300">Loading Project Details...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg bg-red-600/30 p-6 text-center text-red-200">
			<h2 class="text-xl font-bold">Error</h2>
			<p>{errorMessage}</p>
			<button
				on:click={() => goto(`/my-projects?tab=${fromTab}`)}
				class="mt-4 rounded-md bg-sky-500 px-4 py-2">Back to Projects</button
			>
		</div>
	{:else if project}
		<header class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
			<div>
				<button
					on:click={() => goto(`/my-projects?tab=${fromTab}`)}
					class="mb-2 text-sm text-sky-400 hover:underline"
				>
					&larr; Back to {fromTab === 'completed' ? 'Completed' : 'Ongoing'} Projects
				</button>
				<h1 class="text-3xl font-bold text-emerald-400" title={projectTitle}>
					{projectTitle}
				</h1>
			</div>
			<a
				href={relevantChatId ? `/chat/${relevantChatId}` : '#'}
				class="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-600 {relevantChatId
					? ''
					: 'cursor-not-allowed opacity-50'}"
				aria-disabled={!relevantChatId}
				on:click={(e) => {
					if (!relevantChatId) e.preventDefault();
				}}
			>
				Go to Chat Room
			</a>
		</header>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left/Main Column -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Project Overview -->
				<div class="rounded-xl bg-slate-700/50 p-6">
					<h2 class="mb-4 text-2xl font-semibold text-sky-300">Project Overview</h2>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<p class="text-sm text-slate-400">Project With</p>
							<p class="text-lg font-medium text-slate-100">
								{otherParty?.profile?.fullName || otherParty?.profile?.companyName || 'N/A'}
							</p>
						</div>
						<div>
							<p class="text-sm text-slate-400">Current Status</p>
							<p class={`text-lg font-bold ${getStatusClass(project.contract.status, 'text')}`}>
								{project.contract.status.replace(/_/g, ' ')}
							</p>
						</div>
						<div>
							<p class="text-sm text-slate-400">Contract Date</p>
							<p class="text-lg font-medium text-slate-100">
								{new Date(project.contract.contractDate).toLocaleDateString()}
							</p>
						</div>
					</div>
				</div>

				<!-- Status Update Section (Customer Only) -->
				{#if currentUser?.userType === 'customer' && statusOptions.length > 0}
					<div class="rounded-xl bg-slate-700/50 p-6">
						<h3 class="mb-3 text-xl font-semibold text-sky-300">Update Project Status</h3>
						{#if statusUpdateMessage}
							<p
								class="mb-3 rounded p-2 text-sm {statusUpdateMessage.type === 'success'
									? 'bg-emerald-500/20 text-emerald-300'
									: 'bg-red-500/20 text-red-300'}"
							>
								{statusUpdateMessage.text}
							</p>
						{/if}
						<div class="flex items-center gap-4">
							<select
								bind:value={selectedStatus}
								class="flex-grow rounded-lg border border-slate-600 bg-slate-700/80 p-2.5 text-slate-100"
							>
								{#each statusOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							<button
								on:click={handleUpdateStatus}
								disabled={isUpdatingStatus || selectedStatus === project.contract.status}
								class="rounded-lg bg-sky-500 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isUpdatingStatus ? 'Updating...' : 'Update'}
							</button>
						</div>
					</div>
				{/if}

				<!-- Work Request Details -->
				{#if project.workRequest}
					<div class="rounded-xl bg-slate-700/50 p-6">
						<h3 class="mb-4 text-2xl font-semibold text-sky-300">Original Work Request</h3>
						<p class="whitespace-pre-wrap text-slate-300">{project.workRequest.description}</p>
						<!-- Add more work request details here if needed -->
					</div>
				{/if}
			</div>

			<!-- Right/Side Column -->
			<div class="space-y-6">
				<div class="rounded-xl bg-slate-700/50 p-6">
					<h3 class="mb-4 text-xl font-semibold text-sky-300">Contract Summary</h3>
					<div>
						<h4 class="font-semibold text-slate-200">Work Details</h4>
						<p class="mb-3 text-sm whitespace-pre-wrap text-slate-300">
							{project.contract.workDetails}
						</p>
						<h4 class="font-semibold text-slate-200">Agreement</h4>
						<p class="text-sm whitespace-pre-wrap text-slate-300">
							{project.contract.agreementSummary}
						</p>
					</div>
					<a
						href={`/contracts/${project.contract.id}`}
						class="mt-4 inline-block text-sm font-medium text-emerald-400 hover:underline"
					>
						View Full Contract &rarr;
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
