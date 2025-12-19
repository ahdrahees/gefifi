<script lang="ts">
	import { goto } from '$app/navigation';

	
	interface Props {
		// This will be a complex object aggregated by the backend
		project: any;
	}

	let { project }: Props = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case 'in_progress':
				return 'bg-blue-500 text-blue-100';
			case 'signed':
				return 'bg-yellow-500 text-yellow-100';
			case 'completed':
				return 'bg-green-500 text-green-100';
			case 'cancelled':
			case 'disputed':
			case 'terminated':
				return 'bg-red-500 text-red-100';
			default:
				return 'bg-slate-500 text-slate-100';
		}
	}
</script>

<div
	class="flex h-full flex-col justify-between rounded-xl bg-slate-700/70 p-5 shadow-xl ring-1 ring-slate-600/50"
>
	<div>
		<!-- Project Header -->
		<div class="mb-4 border-b border-slate-600 pb-4">
			<h3 class="truncate text-xl font-semibold text-emerald-300" title={project.title}>
				{project.title}
			</h3>
			<p class="text-xs text-slate-400">
				Project ID: {project.id.substring(0, 8)}...
			</p>
		</div>

		<div class="space-y-4">
			<!-- Work Contract Section -->
			{#if project.workContract}
				<div class="rounded-lg bg-slate-800/50 p-4">
					<h4 class="mb-2 font-semibold text-sky-300">Work Contract</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-400">Expert:</span>
							<span class="font-medium text-white"
								>{project.expert?.profile?.fullName || 'N/A'}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Status:</span>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-bold {getStatusColor(
									project.workContract.status
								)}"
							>
								{project.workContract.status.replace('_', ' ')}
							</span>
						</div>
					</div>
					<button
						onclick={() => goto(`/contracts/${project.workContract.id}`)}
						class="mt-4 w-full rounded-md bg-sky-600 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
						>View Work Details</button
					>
				</div>
			{/if}

			<!-- Material Contract Section -->
			{#if project.materialContract}
				<div class="rounded-lg bg-slate-800/50 p-4">
					<h4 class="mb-2 font-semibold text-amber-300">Material Contract</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-400">Supplier:</span>
							<span class="font-medium text-white"
								>{project.supplier?.profile?.companyName || 'N/A'}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Status:</span>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-bold {getStatusColor(
									project.materialContract.status
								)}"
							>
								{project.materialContract.status.replace('_', ' ')}
							</span>
						</div>
					</div>
					<button
						onclick={() => goto(`/contracts/${project.materialContract.id}`)}
						class="mt-4 w-full rounded-md bg-amber-600 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
						>View Material Details</button
					>
				</div>
			{/if}
		</div>
	</div>

	<div class="mt-5 border-t border-slate-600/70 pt-4">
		<div class="flex items-center justify-between text-xs text-slate-400">
			<!-- Overall Project Status Logic can go here -->
			<span class="font-bold">Overall Status:</span>
			{#if project.workContract?.status === 'completed' && project.materialContract?.status === 'completed'}
				<span class="font-semibold text-green-400">Completed</span>
			{:else if !project.workContract && project.materialContract?.status === 'completed'}
				<span class="font-semibold text-green-400">Completed</span>
			{:else if !project.materialContract && project.workContract?.status === 'completed'}
				<span class="font-semibold text-green-400">Completed</span>
			{:else}
				<span class="font-semibold text-yellow-400">In Progress</span>
			{/if}
		</div>
	</div>
</div>
