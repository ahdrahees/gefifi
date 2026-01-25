<!-- src/frontend/src/lib/components/requests/RequestCard.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { AuthUser } from '$lib/stores/auth';
	import type { RequestWithType } from '$lib/types';

	interface Props {
		request: RequestWithType;
		currentUser: AuthUser | null;
		onStatusUpdate?: (detail: { requestId: string; newStatus: string }) => void;
	}

	let { request, currentUser, onStatusUpdate }: Props = $props();

	let isWorkRequest = $derived(request.requestType === 'work');
	let isMaterialRequest = $derived(request.requestType === 'material');
	let isCustomer = $derived(currentUser?.userType === 'customer');

	function handleCardClick() {
		goto(`/my-requests/${request.id}`);
	}

	function handleStatusUpdate(newStatus: string) {
		onStatusUpdate?.({
			requestId: request.id,
			newStatus
		});
	}

	function formatDate(dateString: string) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
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

	function truncateText(text: string, maxLength: number) {
		if (!text) return '';
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}
</script>

<div
	class="group relative cursor-pointer rounded-xl border border-slate-600/30 bg-slate-700/50 p-5 shadow-lg transition-all duration-200 hover:bg-slate-600/50 hover:shadow-xl"
	onclick={handleCardClick}
	onkeypress={(e) => e.key === 'Enter' && handleCardClick()}
	role="button"
	tabindex="0"
>
	<!-- Type and Status Badges -->
	<div class="mb-4 flex items-start justify-between">
		<div class="flex flex-wrap gap-2">
			<!-- Request Type Badge -->
			<span
				class="rounded-full px-3 py-1 text-xs font-bold text-white {isWorkRequest
					? 'bg-sky-500/80'
					: 'bg-amber-500/80'}"
			>
				{isWorkRequest ? 'Work' : 'Material'}
			</span>

			<!-- Status Badge -->
			<span
				class="rounded-full border px-3 py-1 text-xs font-semibold {getStatusClasses(
					request.status
				)}"
			>
				{request.status.replace(/_/g, ' ').toUpperCase()}
			</span>
		</div>

		<!-- Quick Actions Menu -->
		<div class="opacity-0 transition-opacity group-hover:opacity-100">
			<button
				class="rounded-lg border border-slate-600/50 bg-slate-700/80 p-1.5 text-slate-400 hover:text-slate-200"
				onclick={(e) => e.stopPropagation()}
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
			</button>
		</div>
	</div>

	<!-- Request Title and Location -->
	<div class="mb-3">
		<h3
			class="mb-1 text-lg font-semibold text-slate-200 group-hover:text-emerald-300"
			title={request.title}
		>
			{truncateText(request.title, 50)}
		</h3>
		<p class="text-sm text-slate-400">
			<svg class="mr-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
			{'location' in request ? request.location : request.deliveryLocation}
		</p>
	</div>

	<!-- Description -->
	<div class="mb-4">
		<p class="text-sm leading-relaxed text-slate-300">
			{truncateText(request.description, 120)}
		</p>
	</div>

	<!-- Material Items Preview (for material requests) -->
	{#if isMaterialRequest && 'items' in request && request.items.length > 0}
		<div class="mb-4">
			<p class="mb-2 text-xs font-semibold text-amber-300">Items:</p>
			<div class="space-y-1">
				{#each request.items.slice(0, 2) as item (item.itemName)}
					<div class="flex justify-between text-xs">
						<span class="text-slate-300">{truncateText(item.itemName, 20)}</span>
						<span class="font-medium text-emerald-400">{item.quantity}</span>
					</div>
				{/each}
				{#if request.items.length > 2}
					<p class="text-xs text-slate-400">+{request.items.length - 2} more items</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Footer with dates and actions -->
	<div class="flex items-center justify-between border-t border-slate-600/30 pt-3 text-xs">
		<div class="text-slate-400">
			<span>Posted: {formatDate(request.createdAt)}</span>
			{#if request.updatedAt !== request.createdAt}
				<span class="ml-2">Updated: {formatDate(request.updatedAt)}</span>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<!-- Contract Link -->
			{#if request.contractInfo}
				<a
					href="/contracts/{request.contractInfo.id}"
					onclick={(e) => e.stopPropagation()}
					class="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
					title="View contract"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span class="hidden sm:inline">Contract</span>
				</a>
			{/if}

			<!-- Chat Link -->
			{#if request.chatId}
				<a
					href="/chat/{request.chatId}"
					onclick={(e) => e.stopPropagation()}
					class="flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
					title="Open chat"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
					<span class="hidden sm:inline">Chat</span>
				</a>
			{/if}

			<!-- Edit Link (for customers with open requests) -->
			{#if isCustomer && request.status === 'open'}
				<a
					href="/customer/edit-request/{request.id}"
					onclick={(e) => e.stopPropagation()}
					class="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
					title="Edit request"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
					<span class="hidden sm:inline">Edit</span>
				</a>
			{/if}
		</div>
	</div>
</div>
