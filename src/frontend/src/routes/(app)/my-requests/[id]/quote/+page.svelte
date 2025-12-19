<!-- src/frontend/src/routes/(app)/my-requests/[id]/quote/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { WorkRequest, MaterialRequest, AuthUser, Quote } from '$lib/types';
	import QuoteComparisonTable from '$lib/components/quotes/QuoteComparisonTable.svelte';
	import QuoteList from '$lib/components/quotes/QuoteList.svelte';
	import QuoteSubmissionForm from '$lib/components/quotes/QuoteSubmissionForm.svelte';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import { goto } from '$app/navigation';
	import { assertNonNullish } from '$lib/utils/assert';

	// Get request ID from URL
	let requestId = $derived(page.params.id);

	// State
	let request: WorkRequest | MaterialRequest | null = $state(null);
	let requestType: 'work' | 'material' = $state('work');
	let quotes: Quote[] = $state([]);
	let currentUser: AuthUser | null = $derived($authStore.user);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let showQuoteSubmissionModal = $state(false);
	let showQuoteDetailModal = $state(false);
	let selectedQuote: Quote | null = $state(null);
	let revisionQuoteId: string | undefined = $state(undefined);
	let revisionQuote: Quote | undefined = $state(undefined);
	let availableRequests: (WorkRequest | MaterialRequest)[] = $state([]);

	// Computed
	let isExpertOrSupplier = $derived(
		currentUser?.userType === 'expert' || currentUser?.userType === 'supplier'
	);
	let canSubmitQuote = $derived(
		isExpertOrSupplier &&
			request &&
			(requestType === 'work'
				? (request as WorkRequest).interestedExperts?.includes(currentUser?.id || '') ||
					(request as WorkRequest).invitedExperts?.includes(currentUser?.id || '')
				: (request as MaterialRequest).interestedSuppliers?.includes(currentUser?.id || '') ||
					(request as MaterialRequest).invitedSuppliers?.includes(currentUser?.id || ''))
	);

	onMount(() => {
		fetchRequestDetails();
		if (isExpertOrSupplier) {
			fetchAvailableRequests();
		}
	});

	async function fetchRequestDetails() {
		isLoading = true;
		errorMessage = '';

		try {
			assertNonNullish(requestId, 'Request ID is required');
			// Try to fetch as work request first
			try {
				const workRequest = (await apiClient.getWorkRequestById(requestId)) as WorkRequest;
				request = workRequest;
				requestType = 'work';
			} catch (workError) {
				// If not found, try as material request
				console.error('Error fetching work request:', workError);
				try {
					const materialRequest = (await apiClient.getMaterialRequestById(
						requestId
					)) as MaterialRequest;
					request = materialRequest;
					requestType = 'material';
				} catch (materialError) {
					console.error('Error fetching material request:', materialError);
					throw new Error('Request not found');
				}
			}

			// Fetch quotes for this request
			await fetchQuotes();
		} catch (error: unknown) {
			console.error('Error fetching request details:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to load request details';
		} finally {
			isLoading = false;
		}
	}

	async function fetchQuotes() {
		if (!request) return;

		try {
			const response = await apiClient.getQuotesForRequest(request.id, requestType);
			quotes = response.quotes as Quote[];
		} catch (error: unknown) {
			console.error('Error fetching quotes:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to load quotes';
		}
	}

	async function fetchAvailableRequests() {
		if (!currentUser) return;

		try {
			const [workRequests, materialRequests] = (await Promise.all([
				apiClient.getWorkRequestsByCustomerId(currentUser.id),
				apiClient.getMaterialRequestsByCustomerId(currentUser.id)
			])) as [WorkRequest[], MaterialRequest[]];

			availableRequests = [...workRequests, ...materialRequests];
		} catch (error) {
			console.error('Error fetching available requests:', error);
		}
	}

	function handleQuoteSubmitted() {
		showQuoteSubmissionModal = false;
		// Reset revision state
		revisionQuoteId = undefined;
		revisionQuote = undefined;
		fetchQuotes(); // Refresh quotes after submission
	}

	function handleQuoteStatusUpdate(quoteId: string, status: string) {
		apiClient
			.updateQuoteStatus(quoteId, status)
			.then(() => {
				fetchQuotes(); // Refresh quotes list
			})
			.catch((error) => {
				console.error('Error updating quote status:', error);
			});
	}

	// function handleQuoteAccepted(quote: Quote) {
	// 	handleQuoteStatusUpdate(quote.id, 'accepted');
	// }

	// function handleQuoteRejected(quote: Quote) {
	// 	handleQuoteStatusUpdate(quote.id, 'rejected');
	// }

	function handleQuoteRevised(quote: Quote) {
		// Open the quote submission modal for revision
		revisionQuoteId = quote.id;
		revisionQuote = quote;
		showQuoteSubmissionModal = true;
		console.log('Revising quote:', quote.id);
	}

	function handleViewQuote(quoteId: string) {
		const quote = quotes.find((q) => q.id === quoteId);
		if (quote) {
			selectedQuote = quote;
			showQuoteDetailModal = true;
		}
	}

	function handleBackToRequest() {
		goto(`/my-requests/${requestId}`);
	}
</script>

<svelte:head>
	<title>Quote Management - {request?.title || 'Request'}</title>
</svelte:head>

<div class="min-h-screen bg-slate-900">
	<!-- Header -->
	<div class="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						onclick={handleBackToRequest}
						class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
						aria-label="Back to request details"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
					<div>
						<h1 class="text-2xl font-bold text-slate-100">Quote Management</h1>
						<p class="text-slate-400">{request?.title || 'Loading...'}</p>
					</div>
				</div>

				{#if canSubmitQuote}
					<button
						onclick={() => (showQuoteSubmissionModal = true)}
						class="rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
					>
						Submit New Quote
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-center">
					<div
						class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500"
					></div>
					<p class="text-slate-400">Loading quotes...</p>
				</div>
			</div>
		{:else if errorMessage}
			<div
				class="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center shadow-xl backdrop-blur-sm"
			>
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20"
				>
					<svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 class="mb-3 text-2xl font-bold text-red-300">Error Loading Quotes</h2>
				<p class="text-slate-400">{errorMessage}</p>
			</div>
		{:else if quotes.length === 0}
			<div
				class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-8 text-center shadow-xl backdrop-blur-sm"
			>
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-500/20"
				>
					<svg
						class="mx-auto h-12 w-12 text-slate-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<h2 class="mb-3 text-2xl font-bold text-slate-300">No Quotations Yet</h2>
				<p class="mb-6 text-slate-400">
					{canSubmitQuote
						? 'Be the first to submit a quote for this request.'
						: 'No quotes have been submitted for this request yet.'}
				</p>

				{#if canSubmitQuote}
					<button
						onclick={() => (showQuoteSubmissionModal = true)}
						class="rounded-lg bg-emerald-600 px-6 py-3 text-white transition-colors hover:bg-emerald-700"
					>
						Submit New Quote
					</button>
				{/if}
			</div>
		{:else}
			<!-- Quote Management Content -->
			<div class="space-y-6">
				<!-- Quote Statistics (only for customers) -->
				{#if currentUser?.userType === 'customer'}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div class="rounded-lg border border-slate-600/30 bg-slate-800/40 p-4">
							<div class="flex items-center">
								<div class="rounded-full bg-blue-500/20 p-2">
									<svg
										class="h-5 w-5 text-blue-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-slate-400">Total Quotes</p>
									<p class="text-2xl font-bold text-slate-100">{quotes.length}</p>
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-slate-600/30 bg-slate-800/40 p-4">
							<div class="flex items-center">
								<div class="rounded-full bg-emerald-500/20 p-2">
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
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-slate-400">Accepted</p>
									<p class="text-2xl font-bold text-slate-100">
										{quotes.filter((q) => q.status === 'accepted').length}
									</p>
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-slate-600/30 bg-slate-800/40 p-4">
							<div class="flex items-center">
								<div class="rounded-full bg-yellow-500/20 p-2">
									<svg
										class="h-5 w-5 text-yellow-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-slate-400">Under Review</p>
									<p class="text-2xl font-bold text-slate-100">
										{quotes.filter((q) => q.status === 'under_review').length}
									</p>
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-slate-600/30 bg-slate-800/40 p-4">
							<div class="flex items-center">
								<div class="rounded-full bg-red-500/20 p-2">
									<svg
										class="h-5 w-5 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-slate-400">Rejected</p>
									<p class="text-2xl font-bold text-slate-100">
										{quotes.filter((q) => q.status === 'rejected').length}
									</p>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Quote display based on user type -->
				{#if currentUser?.userType === 'customer'}
					<!-- Quote Comparison Table (for customers) -->
					<QuoteComparisonTable
						{quotes}
						{requestType}
						{currentUser}
						onQuoteView={({ quoteId }) => handleViewQuote(quoteId)}
						onQuoteAccept={({ quoteId }) => handleQuoteStatusUpdate(quoteId, 'accepted')}
						onQuoteReject={({ quoteId }) => handleQuoteStatusUpdate(quoteId, 'rejected')}
					/>
				{:else}
					<!-- Quote List (for experts/suppliers) -->
					<QuoteList
						{quotes}
						{currentUser}
						onQuoteRevised={(quote) => handleQuoteRevised(quote)}
						onQuoteSelected={(quote) => handleViewQuote(quote.id)}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Quote Submission Modal -->
{#if showQuoteSubmissionModal && request}
	<GeneralModal
		bind:show={showQuoteSubmissionModal}
		onClose={() => (showQuoteSubmissionModal = false)}
	>
		<QuoteSubmissionForm
			requestId={request.id}
			{requestType}
			{request}
			{availableRequests}
			{revisionQuoteId}
			existingQuote={revisionQuote}
			onQuoteSubmitted={handleQuoteSubmitted}
			onClose={() => {
				showQuoteSubmissionModal = false;
				revisionQuoteId = undefined;
				revisionQuote = undefined;
			}}
		/>
	</GeneralModal>
{/if}

<!-- Quote Detail Modal -->
{#if showQuoteDetailModal && selectedQuote}
	<GeneralModal
		bind:show={showQuoteDetailModal}
		maxWidthClass="max-w-6xl"
		closeButton={true}
		onClose={() => {
			showQuoteDetailModal = false;
			selectedQuote = null;
		}}
	>
		<div
			class="w-full rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-4 shadow-2xl backdrop-blur-sm sm:p-6 lg:p-8"
		>
			<!-- Header with gradient background -->
			<div
				class="mb-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-3 sm:mb-8 sm:gap-3 sm:p-4"
			>
				<div class="shrink-0 rounded-lg bg-emerald-500/20 p-1.5 sm:p-2">
					<svg
						class="h-5 w-5 text-emerald-400 sm:h-6 sm:w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<h2 class="truncate text-xl font-bold text-slate-100 sm:text-2xl">Quote Details</h2>
					<p class="hidden text-xs text-slate-400 sm:block sm:text-sm">
						Complete quote information and attachments
					</p>
				</div>
			</div>

			<div class="space-y-6 sm:space-y-8">
				<!-- Quote Title and Status -->
				<div class="rounded-xl border border-slate-600/30 bg-slate-700/30 p-4 sm:p-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0 flex-1">
							<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
								<h3 class="text-xl font-bold break-words text-slate-100 sm:text-2xl">
									{selectedQuote.title}
								</h3>
								{#if selectedQuote.version > 1}
									<span
										class="self-start rounded-full bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-300"
									>
										v{selectedQuote.version}
									</span>
								{/if}
							</div>
							{#if selectedQuote.description}
								<p class="text-sm leading-relaxed text-slate-300 sm:text-base">
									{selectedQuote.description}
								</p>
							{/if}
						</div>
						<div class="shrink-0">
							<span
								class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm
								{selectedQuote.status === 'accepted'
									? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
									: selectedQuote.status === 'rejected'
										? 'border-red-500/50 bg-red-500/20 text-red-300'
										: selectedQuote.status === 'under_review'
											? 'border-yellow-500/50 bg-yellow-500/20 text-yellow-300'
											: 'border-blue-500/50 bg-blue-500/20 text-blue-300'}"
							>
								<div
									class="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2
									{selectedQuote.status === 'accepted'
										? 'bg-emerald-400'
										: selectedQuote.status === 'rejected'
											? 'bg-red-400'
											: selectedQuote.status === 'under_review'
												? 'bg-yellow-400'
												: 'bg-blue-400'}"
								></div>
								<span class="whitespace-nowrap"
									>{selectedQuote.status.replace('_', ' ').toUpperCase()}</span
								>
							</span>
						</div>
					</div>
				</div>

				<!-- Quote Details Grid -->
				<div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
					{#if selectedQuote.amount}
						<div
							class="group rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4 transition-all hover:border-emerald-500/30 hover:shadow-lg sm:p-6 md:col-span-2 xl:col-span-1"
						>
							<div class="mb-2 flex items-center gap-2 sm:gap-3">
								<div class="rounded-lg bg-emerald-500/20 p-1.5 sm:p-2">
									<svg
										class="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
										/>
									</svg>
								</div>
								<span class="text-xs font-medium text-emerald-300 sm:text-sm">Quote Amount</span>
							</div>
							<p class="text-2xl font-bold break-all text-emerald-400 sm:text-3xl">
								{new Intl.NumberFormat('en-IN', {
									style: 'currency',
									currency: selectedQuote.currency || 'INR'
								}).format(selectedQuote.amount)}
							</p>
						</div>
					{/if}

					<div
						class="group rounded-xl border border-slate-600/30 bg-slate-700/20 p-4 transition-all hover:bg-slate-700/30 sm:p-6"
					>
						<div class="mb-2 flex items-center gap-2 sm:gap-3">
							<div class="rounded-lg bg-blue-500/20 p-1.5 sm:p-2">
								<svg
									class="h-4 w-4 text-blue-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<span class="text-xs font-medium text-slate-400 sm:text-sm">Valid Until</span>
						</div>
						<p class="text-lg font-semibold break-words text-slate-200 sm:text-xl">
							{new Date(selectedQuote.validityDate || '').toLocaleDateString('en-IN', {
								weekday: 'short',
								year: 'numeric',
								month: 'short',
								day: 'numeric'
							})}
						</p>
					</div>

					<div
						class="group rounded-xl border border-slate-600/30 bg-slate-700/20 p-4 transition-all hover:bg-slate-700/30 sm:p-6"
					>
						<div class="mb-2 flex items-center gap-2 sm:gap-3">
							<div class="rounded-lg bg-purple-500/20 p-1.5 sm:p-2">
								<svg
									class="h-4 w-4 text-purple-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<span class="text-xs font-medium text-slate-400 sm:text-sm">Submitted On</span>
						</div>
						<p class="text-lg font-semibold break-words text-slate-200 sm:text-xl">
							{new Date(selectedQuote.submittedAt).toLocaleDateString('en-IN', {
								weekday: 'short',
								year: 'numeric',
								month: 'short',
								day: 'numeric'
							})}
						</p>
					</div>
				</div>

				<!-- Files -->
				{#if selectedQuote.files && selectedQuote.files.length > 0}
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/20 p-4 sm:p-6">
						<div class="mb-4 flex items-center gap-2 sm:gap-3">
							<div class="shrink-0 rounded-lg bg-orange-500/20 p-1.5 sm:p-2">
								<svg
									class="h-4 w-4 text-orange-400 sm:h-5 sm:w-5"
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
							<div class="min-w-0">
								<h4 class="text-base font-semibold text-slate-200 sm:text-lg">Attachments</h4>
								<p class="text-xs text-slate-400 sm:text-sm">
									{selectedQuote.files.length} file{selectedQuote.files.length > 1 ? 's' : ''} attached
								</p>
							</div>
						</div>
						<div class="grid gap-3">
							{#each selectedQuote.files as file (file.fileName)}
								<div
									class="group flex flex-col gap-3 rounded-lg border border-slate-600/50 bg-slate-800/50 p-3 transition-all hover:border-slate-500 hover:bg-slate-800/70 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
								>
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 sm:h-10 sm:w-10"
										>
											<svg
												class="h-4 w-4 text-blue-400 sm:h-5 sm:w-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium text-slate-200 sm:text-base">
												{file.fileName}
											</p>
											<p class="text-xs text-slate-400 sm:text-sm">Document attachment</p>
										</div>
									</div>
									<a
										href={file.filePath}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-all hover:scale-105 hover:bg-blue-700 sm:self-auto sm:px-4 sm:text-sm"
									>
										<svg
											class="h-3 w-3 sm:h-4 sm:w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										<span>View</span>
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Additional Terms -->
				{#if selectedQuote.additionalTerms}
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/20 p-4 sm:p-6">
						<div class="mb-4 flex items-center gap-2 sm:gap-3">
							<div class="shrink-0 rounded-lg bg-amber-500/20 p-1.5 sm:p-2">
								<svg
									class="h-4 w-4 text-amber-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<h4 class="text-base font-semibold text-slate-200 sm:text-lg">Additional Terms</h4>
								<p class="text-xs text-slate-400 sm:text-sm">Special conditions and requirements</p>
							</div>
						</div>
						<div class="rounded-lg border border-slate-600/50 bg-slate-800/50 p-3 sm:p-4">
							{#if typeof selectedQuote.additionalTerms === 'string'}
								{#if selectedQuote.additionalTerms.startsWith('{') || selectedQuote.additionalTerms.startsWith('[')}
									<!-- Handle JSON string -->
									{@const parsedTerms = (() => {
										try {
											return JSON.parse(selectedQuote.additionalTerms);
										} catch {
											return selectedQuote.additionalTerms;
										}
									})()}
									{#if typeof parsedTerms === 'object' && parsedTerms !== null}
										<div class="space-y-2">
											{#each Object.entries(parsedTerms) as [key, value] (key)}
												<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
													<span
														class="min-w-0 text-sm font-medium text-emerald-300 capitalize sm:min-w-[120px] sm:text-base"
													>
														{key
															.replace(/([A-Z])/g, ' $1')
															.replace(/^./, (str) => str.toUpperCase())}:
													</span>
													<span class="flex-1 text-sm text-slate-200 sm:text-base">
														{typeof value === 'object' ? JSON.stringify(value) : value}
													</span>
												</div>
											{/each}
										</div>
									{:else}
										<p
											class="text-sm leading-relaxed whitespace-pre-wrap text-slate-200 sm:text-base"
										>
											{parsedTerms}
										</p>
									{/if}
								{:else}
									<!-- Handle regular text -->
									<p
										class="text-sm leading-relaxed whitespace-pre-wrap text-slate-200 sm:text-base"
									>
										{selectedQuote.additionalTerms}
									</p>
								{/if}
							{:else}
								<!-- Handle object directly -->
								<div class="space-y-2">
									{#each Object.entries(selectedQuote.additionalTerms) as [key, value] (key)}
										<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
											<span
												class="min-w-0 text-sm font-medium text-emerald-300 capitalize sm:min-w-[120px] sm:text-base"
											>
												{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:
											</span>
											<span class="flex-1 text-sm text-slate-200 sm:text-base">
												{typeof value === 'object' ? JSON.stringify(value) : value}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</GeneralModal>
{/if}
