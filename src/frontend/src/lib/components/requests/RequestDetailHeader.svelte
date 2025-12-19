<!-- src/frontend/src/lib/components/requests/RequestDetailHeader.svelte -->
<script lang="ts">
	import type { WorkRequest, MaterialRequest, Contract } from '$lib/types';

	interface Props {
		request: WorkRequest | MaterialRequest;
		requestType: 'work' | 'material';
		contractInfo?: Contract;
		canEdit?: boolean;
		onEdit?: () => void;
	}

	let { request, requestType, contractInfo, canEdit = false, onEdit }: Props = $props();

	function handleEdit() {
		onEdit?.();
	}

	function formatDate(dateString: string) {
		if (!dateString) return 'Not specified';
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function getStatusClasses(status: string) {
		const classes: Record<string, string> = {
			open: 'bg-green-500/20 text-green-300 border-green-500/50',
			in_discussion: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			awaiting_quotes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
			quoting: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			ordered: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
			contracted: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
			signed: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
			in_progress: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
			completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
			disputed: 'bg-red-500/20 text-red-300 border-red-500/50',
			awaiting_signatures: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
			revision_requested: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
			cancelled: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
			terminated: 'bg-slate-600/30 text-slate-400 border-slate-500/50'
		};
		return classes[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';
	}

	let isWorkRequest = $derived(requestType === 'work');
	let isMaterialRequest = $derived(requestType === 'material');
	let linkedWorkRequest = $derived(
		isMaterialRequest && (request as MaterialRequest).linkedWorkRequestId
	);
</script>

<header
	class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-4">
			<!-- Title and Icon -->
			<div class="flex items-center gap-4">
				<span class="rounded-xl bg-{isWorkRequest ? 'sky' : 'amber'}-500/20 p-3">
					{#if isWorkRequest}
						<svg class="h-6 w-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
							/>
						</svg>
					{:else}
						<svg
							class="h-6 w-6 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							/>
						</svg>
					{/if}
				</span>
				<div>
					<h1 class="text-2xl font-bold text-{isWorkRequest ? 'sky' : 'amber'}-400 lg:text-3xl">
						{request.title}
					</h1>
					<p class="text-slate-400">
						{isWorkRequest ? 'Work Request' : 'Material Request'} • ID: {request.id.substring(
							0,
							12
						)}...
					</p>
				</div>
			</div>

			<!-- Status Badges and Links -->
			<div class="flex flex-wrap items-center gap-3">
				<!-- Status Badge -->
				<span
					class="rounded-full border px-4 py-2 text-sm font-semibold {getStatusClasses(
						request.status
					)}"
				>
					{request.status.replace(/_/g, ' ').toUpperCase()}
				</span>

				<!-- Request Type Badge -->
				<span
					class="rounded-full border border-slate-500/50 bg-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300"
				>
					{isWorkRequest ? 'Work Request' : 'Material Request'}
				</span>

				<!-- Linked Work Request Badge -->
				{#if linkedWorkRequest}
					<a
						href="/work-requests/{linkedWorkRequest}"
						class="rounded-full border border-sky-500/30 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
					>
						<svg class="mr-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
							/>
						</svg>
						Linked to Work Request
					</a>
				{/if}

				<!-- Contract Badge -->
				{#if contractInfo}
					<a
						href="/contracts/{contractInfo.id}"
						class="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						View Contract
					</a>
				{/if}
			</div>
		</div>

		<!-- Right Side: Actions and Date -->
		<div class="flex flex-col items-end gap-4">
			<!-- Created Date -->
			<div class="text-right">
				<p class="text-sm text-slate-400">Created</p>
				<p class="text-lg font-semibold text-slate-200">
					{formatDate(request.createdAt)}
				</p>
				{#if request.updatedAt !== request.createdAt}
					<p class="text-xs text-slate-400">
						Updated: {formatDate(request.updatedAt)}
					</p>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex items-center gap-3">
				{#if canEdit}
					<button
						onclick={handleEdit}
						class="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						<span class="hidden sm:inline">Edit Request</span>
						<span class="sm:hidden">Edit</span>
					</button>
				{/if}

				<!-- More Actions Dropdown (Future Enhancement) -->
				<div class="relative">
					<button
						class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600/40"
						aria-label="More actions"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
							/>
						</svg>
						<span class="hidden sm:inline">More</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</header>
