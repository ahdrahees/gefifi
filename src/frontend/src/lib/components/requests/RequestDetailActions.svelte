<!-- src/frontend/src/lib/components/requests/RequestDetailActions.svelte -->
<script lang="ts">
	import type { WorkRequest, MaterialRequest, AuthUser, Contract } from '$lib/types';

	interface Props {
		request: WorkRequest | MaterialRequest;
		requestType: 'work' | 'material';
		currentUser: AuthUser | null;
		contractInfo?: Contract;
		chatId?: string | null;
		canEdit?: boolean;
		onStatusUpdate?: (status: string) => void;
		onEdit?: () => void;
	}

	let {
		request,
		requestType,
		currentUser,
		contractInfo,
		chatId = null,
		canEdit = false,
		onStatusUpdate,
		onEdit
	}: Props = $props();

	// Status update state
	let isUpdatingStatus = $state(false);
	let selectedStatus = $state(request.status);
	let statusUpdateMessage: { type: 'success' | 'error'; text: string } | null = $state(null);

	function getStatusOptions(currentStatus: string, userType?: string) {
		const options: { value: string; label: string }[] = [];

		if (!userType) return options;

		if (isWorkRequest) {
			switch (currentStatus) {
				case 'open':
					if (userType === 'customer') {
						options.push({ value: 'in_discussion', label: 'Mark as In Discussion' });
						options.push({ value: 'cancelled', label: 'Cancel Request' });
					}
					break;
				case 'in_discussion':
					if (userType === 'customer') {
						options.push({ value: 'awaiting_quotes', label: 'Request Quotes' });
						options.push({ value: 'cancelled', label: 'Cancel Request' });
					}
					break;
				case 'awaiting_quotes':
					if (userType === 'customer') {
						options.push({ value: 'contracted', label: 'Accept Quote & Contract' });
						options.push({ value: 'cancelled', label: 'Cancel Request' });
					}
					break;
				case 'contracted':
					if (userType === 'expert') {
						options.push({ value: 'in_progress', label: 'Start Work' });
					}
					break;
				case 'in_progress':
					if (userType === 'expert') {
						options.push({ value: 'completed', label: 'Mark as Completed' });
						options.push({ value: 'disputed', label: 'Report Issue' });
					}
					if (userType === 'customer') {
						options.push({ value: 'completed', label: 'Accept Completion' });
						options.push({ value: 'disputed', label: 'Report Issue' });
					}
					break;
			}
		} else if (isMaterialRequest) {
			switch (currentStatus) {
				case 'open':
					if (userType === 'customer') {
						options.push({ value: 'quoting', label: 'Request Quotes' });
						options.push({ value: 'cancelled', label: 'Cancel Request' });
					}
					break;
				case 'quoting':
					if (userType === 'customer') {
						options.push({ value: 'ordered', label: 'Place Order' });
						options.push({ value: 'cancelled', label: 'Cancel Request' });
					}
					break;
				case 'ordered':
					if (userType === 'customer') {
						options.push({ value: 'contracted', label: 'Confirm Contract' });
					}
					if (userType === 'supplier') {
						options.push({ value: 'contracted', label: 'Accept Order' });
					}
					break;
				case 'contracted':
					if (userType === 'supplier') {
						options.push({ value: 'completed', label: 'Mark as Completed' });
						options.push({ value: 'cancelled', label: 'Cancel Order' });
					}
					if (userType === 'customer') {
						options.push({ value: 'completed', label: 'Mark as Received' });
						options.push({ value: 'cancelled', label: 'Cancel Order' });
					}
					break;
			}
		}

		return options;
	}

	async function handleStatusUpdate() {
		if (selectedStatus === request.status) {
			statusUpdateMessage = { type: 'error', text: 'No new status selected.' };
			return;
		}

		isUpdatingStatus = true;
		statusUpdateMessage = null;

		try {
			onStatusUpdate?.(selectedStatus);
			statusUpdateMessage = { type: 'success', text: 'Status updated successfully!' };
		} catch (error: unknown) {
			statusUpdateMessage = {
				type: 'error',
				text: error instanceof Error ? error.message : 'Update failed.'
			};
		} finally {
			isUpdatingStatus = false;
		}
	}

	function handleEdit() {
		onEdit?.();
	}

	function formatDate(dateString: string | undefined) {
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
			terminated: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
			closed: 'bg-slate-600/30 text-slate-400 border-slate-500/50'
		};
		return classes[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';
	}
	let isWorkRequest = $derived(requestType === 'work');
	let isMaterialRequest = $derived(requestType === 'material');
	let isCustomer = $derived(currentUser?.userType === 'customer');
	let isExpert = $derived(currentUser?.userType === 'expert');
	let isSupplier = $derived(currentUser?.userType === 'supplier');
	// Status update options based on current status and user role
	let statusOptions = $derived(getStatusOptions(request.status, currentUser?.userType));
</script>

<div class="space-y-6">
	<!-- Request Details Card -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-4 flex items-center gap-3">
			<div class="rounded-lg bg-amber-500/20 p-2">
				<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-amber-300">Request Details</h2>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<span class="text-slate-400">Status</span>
				<span
					class="rounded-full border px-3 py-1 text-xs font-semibold {getStatusClasses(
						request.status
					)}"
				>
					{request.status.replace(/_/g, ' ').toUpperCase()}
				</span>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-slate-400">Type</span>
				<span class="text-right text-sm font-medium text-slate-200">
					{isWorkRequest ? 'Work Request' : 'Material Request'}
				</span>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-slate-400">Location</span>
				<span class="text-right text-sm font-medium text-slate-200">
					{isWorkRequest
						? (request as WorkRequest).location
						: (request as MaterialRequest).deliveryLocation}
				</span>
			</div>

			{#if isMaterialRequest && (request as MaterialRequest).deliveryDate}
				<div class="flex items-center justify-between">
					<span class="text-slate-400">Delivery Date</span>
					<span class="text-right text-sm font-medium text-slate-200">
						{formatDate((request as MaterialRequest).deliveryDate)}
					</span>
				</div>
			{/if}

			<div class="flex items-center justify-between">
				<span class="text-slate-400">Created</span>
				<span class="text-right text-sm font-medium text-slate-200">
					{formatDate(request.createdAt)}
				</span>
			</div>

			{#if request.updatedAt !== request.createdAt}
				<div class="flex items-center justify-between">
					<span class="text-slate-400">Last Updated</span>
					<span class="text-right text-sm font-medium text-slate-200">
						{formatDate(request.updatedAt)}
					</span>
				</div>
			{/if}

			{#if isCustomer}
				<div class="border-t border-slate-600 pt-3">
					<div class="flex items-center justify-between">
						<span class="text-slate-400">Interested {isWorkRequest ? 'Experts' : 'Suppliers'}</span>
						<span class="text-right text-sm font-medium text-emerald-300">
							{isWorkRequest
								? (request as WorkRequest).interestedExperts?.length || 0
								: (request as MaterialRequest).interestedSuppliers?.length || 0}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-slate-400">Invited {isWorkRequest ? 'Experts' : 'Suppliers'}</span>
						<span class="text-right text-sm font-medium text-amber-300">
							{isWorkRequest
								? (request as WorkRequest).invitedExperts?.length || 0
								: (request as MaterialRequest).invitedSuppliers?.length || 0}
						</span>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Status Update Section -->
	{#if statusOptions.length > 0}
		<section
			class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xl backdrop-blur-sm"
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-lg bg-emerald-500/20 p-2">
					<svg
						class="h-5 w-5 text-emerald-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-emerald-300">Update Status</h2>
			</div>

			<div class="space-y-4">
				<div>
					<label for="status-select" class="mb-2 block text-sm font-medium text-slate-300">
						New Status
					</label>
					<select
						id="status-select"
						bind:value={selectedStatus}
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2.5 text-slate-200 transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
					>
						<option value={request.status}>Current: {request.status.replace(/_/g, ' ')}</option>
						{#each statusOptions as option, i (i)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<button
					onclick={handleStatusUpdate}
					disabled={isUpdatingStatus || selectedStatus === request.status}
					class="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-50"
				>
					{isUpdatingStatus ? 'Updating...' : 'Update Status'}
				</button>

				{#if statusUpdateMessage}
					<div
						class="rounded-lg border p-3 text-sm {statusUpdateMessage.type === 'success'
							? 'border-green-500/30 bg-green-500/10 text-green-300'
							: 'border-red-500/30 bg-red-500/10 text-red-300'}"
					>
						{statusUpdateMessage.text}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Quick Actions -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-4 flex items-center gap-3">
			<div class="rounded-lg bg-sky-500/20 p-2">
				<svg class="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-sky-300">Quick Actions</h2>
		</div>

		<div class="space-y-3">
			<!-- Contract Link -->
			{#if contractInfo}
				<a
					href="/contracts/{contractInfo.id}"
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

			<!-- Chat Link -->
			{#if chatId}
				<a
					href="/chat/{chatId}"
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/20 px-4 py-3 font-semibold text-sky-300 transition-colors hover:bg-sky-500/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
					Open Chat
				</a>
			{/if}

			<!-- Edit Button -->
			{#if canEdit}
				<button
					onclick={handleEdit}
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-3 font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
					Edit Request
				</button>
			{/if}

			<!-- Find More Professionals (for customers with open requests) -->
			{#if isCustomer && request.status === 'open'}
				<a
					href="/find-professionals?type={isWorkRequest
						? 'expert'
						: 'supplier'}&request-id={request.id}"
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-3 font-semibold text-purple-300 transition-colors hover:bg-purple-500/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					Find & Invite {isWorkRequest ? 'Experts' : 'Suppliers'}
				</a>
			{/if}
		</div>
	</section>

	<!-- Help Section -->
	<section
		class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-4 flex items-center gap-3">
			<div class="rounded-lg bg-indigo-500/20 p-2">
				<svg class="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-indigo-300">Need Help?</h2>
		</div>

		<div class="space-y-3 text-sm text-slate-300">
			<p>
				{#if isCustomer}
					As a customer, you can update your request status, invite professionals, and manage
					contracts.
				{:else if isExpert}
					As an expert, you can update work progress and communicate with customers through chat.
				{:else if isSupplier}
					As a supplier, you can update delivery status and manage material orders.
				{/if}
			</p>

			<a
				href="/help"
				class="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 hover:underline"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
				View Help Documentation
			</a>
		</div>
	</section>
</div>
