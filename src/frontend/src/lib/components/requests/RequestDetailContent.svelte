<!-- src/frontend/src/lib/components/requests/RequestDetailContent.svelte -->
<script lang="ts">
	import type { WorkRequest, MaterialRequest, AuthUser } from '$lib/types';
	import AttachmentList from '$lib/components/AttachmentList.svelte';
	import UserProfile from '$lib/components/UserProfile.svelte';

	interface Props {
		request: WorkRequest | MaterialRequest;
		requestType: 'work' | 'material';
		currentUser: AuthUser | null;
		chatMap?: Map<string, string>;
	}

	let { request, requestType, currentUser, chatMap = new Map() }: Props = $props();

	let isWorkRequest = $derived(requestType === 'work');
	let isMaterialRequest = $derived(requestType === 'material');
	let isCustomer = $derived(currentUser && currentUser.id === request.customerId);

	// Get interested and invited user IDs directly from request
	let interestedUserIds = $derived(
		isWorkRequest
			? [...((request as WorkRequest).interestedExperts || [])]
			: (request as MaterialRequest).interestedSuppliers || []
	);

	let invitedUserIds = $derived(
		isWorkRequest
			? [...((request as WorkRequest).invitedExperts || [])]
			: (request as MaterialRequest).invitedSuppliers || []
	);

	function formatDate(dateString: string | undefined) {
		if (!dateString) return 'Not specified';
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatCurrency(amount?: number) {
		if (!amount && amount !== 0) return null;
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
	}
</script>

<div class="space-y-6">
	<!-- Description Section -->
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
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-sky-300">Description</h2>
		</div>
		<div class="prose prose-slate max-w-none">
			<p class="leading-relaxed whitespace-pre-wrap text-slate-300">{request.description}</p>
		</div>
	</section>

	<!-- Work Request Specific Content -->
	{#if isWorkRequest}
		{@const workRequest = request as WorkRequest}

		<!-- Project Details -->
		<section
			class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
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
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-emerald-300">Project Details</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-3">
					<div>
						<p class="text-sm font-medium text-slate-400">Location</p>
						<p class="text-slate-200">{workRequest.location}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-slate-400">Category</p>
						<p class="text-slate-200">{workRequest.category || 'General'}</p>
					</div>
					{#if workRequest.expectedCost}
						<div>
							<p class="text-sm font-medium text-slate-400">Expected Cost</p>
							<p class="text-lg font-semibold text-emerald-400">
								{formatCurrency(workRequest.expectedCost)}
							</p>
						</div>
					{/if}
				</div>
				<div class="space-y-3">
					{#if workRequest.timeline}
						<div>
							<p class="text-sm font-medium text-slate-400">Timeline</p>
							<p class="text-slate-200">{workRequest.timeline}</p>
						</div>
					{/if}
					{#if workRequest.materialsSuggested}
						<div>
							<p class="text-sm font-medium text-slate-400">Materials Suggested</p>
							<p class="text-slate-200">{workRequest.materialsSuggested}</p>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Images Section -->
		{#if workRequest.images && workRequest.images.length > 0}
			<section
				class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
			>
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-purple-500/20 p-2">
						<svg
							class="h-5 w-5 text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h2 class="text-lg font-bold text-purple-300">Project Images</h2>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each workRequest.images as imageUrl, index (index)}
						<div class="group relative overflow-hidden rounded-lg bg-slate-700/50">
							<img
								src={imageUrl}
								alt="Project image {index + 1}"
								class="h-48 w-full object-cover transition-transform group-hover:scale-105"
								loading="lazy"
							/>
							<div
								class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20"
							></div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}

	<!-- Material Request Specific Content -->
	{#if isMaterialRequest}
		{@const materialRequest = request as MaterialRequest}

		<!-- Delivery Information -->
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
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-amber-300">Delivery Information</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<p class="text-sm font-medium text-slate-400">Delivery Location</p>
					<p class="text-slate-200">{materialRequest.deliveryLocation}</p>
				</div>
				<div>
					<p class="text-sm font-medium text-slate-400">Preferred Delivery Date</p>
					<p class="text-slate-200">{formatDate(materialRequest.deliveryDate)}</p>
				</div>
				{#if materialRequest.linkedWorkRequestId}
					<div class="sm:col-span-2">
						<p class="text-sm font-medium text-slate-400">Linked Work Request</p>
						<a
							href="/my-requests/{materialRequest.linkedWorkRequestId}"
							class="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 hover:underline"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
								/>
							</svg>
							View Linked Work Request
						</a>
					</div>
				{/if}
			</div>
		</section>

		<!-- Requested Items -->
		<section
			class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-lg bg-purple-500/20 p-2">
					<svg
						class="h-5 w-5 text-purple-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-purple-300">
					Requested Items ({materialRequest.items.length})
				</h2>
			</div>

			<div class="space-y-3">
				{#each materialRequest.items as item, index (index)}
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="font-semibold text-slate-200">{item.itemName}</h3>
								{#if item.notes}
									<p class="mt-1 text-sm text-slate-400">{item.notes}</p>
								{/if}
							</div>
							<div class="ml-4 text-right">
								<p class="text-lg font-bold text-emerald-400">Qty: {item.quantity}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Attachments -->
		{#if materialRequest.attachments && materialRequest.attachments.length > 0}
			<section
				class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
			>
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-orange-500/20 p-2">
						<svg
							class="h-5 w-5 text-orange-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
							/>
						</svg>
					</div>
					<h2 class="text-lg font-bold text-orange-300">
						Attachments ({materialRequest.attachments.length})
					</h2>
				</div>
				<AttachmentList attachments={materialRequest.attachments} />
			</section>
		{/if}
	{/if}

	<!-- Interested Users Section (for customers) -->
	{#if isCustomer && interestedUserIds.length > 0}
		<section
			class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-lg bg-green-500/20 p-2">
					<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-green-300">
					Interested {isWorkRequest ? 'Experts' : 'Suppliers'} ({interestedUserIds.length})
				</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				{#each interestedUserIds as userId (userId)}
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4">
						<UserProfile {userId} />
						<div class="mt-3 flex gap-2">
							{#if chatMap.has(userId)}
								<a
									href="/chat/{chatMap.get(userId)}"
									class="flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									Chat
								</a>
							{/if}
							<a
								href="/contracts/create?{isWorkRequest
									? 'workRequestId'
									: 'materialRequestId'}={request.id}&{isWorkRequest
									? 'expertId'
									: 'supplierId'}={userId}&customerId={request.customerId}"
								class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Contract
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Invited Users Section (for customers) -->
	{#if isCustomer && invitedUserIds.length > 0}
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
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-amber-300">
					Invited {isWorkRequest ? 'Experts' : 'Suppliers'} ({invitedUserIds.length})
				</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				{#each invitedUserIds as userId (userId)}
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4">
						<UserProfile {userId} />
						<div class="mt-3 flex gap-2">
							{#if chatMap.has(userId)}
								<a
									href="/chat/{chatMap.get(userId)}"
									class="flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									Chat
								</a>
							{/if}
							<a
								href="/contracts/create?{isWorkRequest
									? 'workRequestId'
									: 'materialRequestId'}={request.id}&{isWorkRequest
									? 'expertId'
									: 'supplierId'}={userId}&customerId={request.customerId}"
								class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Contract
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Find & Invite More Section (for customers when request is open) -->
	{#if isCustomer && request.status === 'open'}
		<section
			class="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-600/20 p-6 shadow-xl backdrop-blur-sm"
		>
			<div class="text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20"
				>
					<svg class="h-6 w-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-sky-300">Need More Options?</h3>
				<p class="mb-4 text-sm text-slate-300">
					Invite more {isWorkRequest ? 'experts' : 'suppliers'} to get additional quotes and options
					for your project.
				</p>
				<a
					href="/find-professionals?type={isWorkRequest
						? 'expert'
						: 'supplier'}&request-id={request.id}"
					class="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-sky-600 hover:shadow-xl"
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
			</div>
		</section>
	{/if}
</div>
