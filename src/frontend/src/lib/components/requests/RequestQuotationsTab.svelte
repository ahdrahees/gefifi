<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import apiClient from '$lib/api';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import QuoteSubmissionForm from '$lib/components/quotes/QuoteSubmissionForm.svelte';
	import type { WorkRequest, MaterialRequest, AuthUser, Quote, Chat } from '$lib/types';

	interface Props {
		// Props
		request: WorkRequest | MaterialRequest;
		requestType: 'work' | 'material';
		currentUser: AuthUser | null;
	}

	let { request, requestType, currentUser }: Props = $props();

	// State
	let quotes: Quote[] = $state([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let chatMap = $state(new Map<string, string>());
	let showQuoteSubmissionModal = $state(false);

	function checkCanSubmitQuote(): boolean {
		if (!currentUser || currentUser.userType === 'customer') return false;

		if (requestType === 'work') {
			if (currentUser.userType !== 'expert') return false;
			const workRequest = request as WorkRequest;
			return (
				workRequest.interestedExperts?.includes(currentUser.id) ||
				workRequest.invitedExperts?.includes(currentUser.id) ||
				false
			);
		} else {
			if (currentUser.userType !== 'supplier') return false;
			const materialRequest = request as MaterialRequest;
			return (
				materialRequest.interestedSuppliers?.includes(currentUser.id) ||
				materialRequest.invitedSuppliers?.includes(currentUser.id) ||
				false
			);
		}
	}

	function getDisplayQuotes(
		quotesArray: Quote[],
		customerStatus: boolean | null,
		contractedStatus: boolean
	): Quote[] {
		if (customerStatus && contractedStatus) {
			// For now, show all quotes when contracted (until we have contracted user IDs)
			// TODO: Filter by contracted expert/supplier when those fields are available
			return quotesArray;
		}

		if (!customerStatus) {
			// Expert/Supplier sees only their own quotes
			return quotesArray.filter((q) => q.expertSupplierId === currentUser?.id);
		}

		// Customer sees all quotes (when not contracted)
		return quotesArray;
	}

	onMount(async () => {
		await Promise.all([fetchQuotes(), fetchChatMappings()]);
	});

	async function fetchQuotes() {
		if (!request || !request.id) {
			console.log('Request not available yet, skipping quote fetch');
			isLoading = false;
			return;
		}

		try {
			isLoading = true;
			errorMessage = '';
			console.log('Fetching quotes for request:', request.id, 'type:', requestType);
			const response = await apiClient.getQuotesForRequest(request.id, requestType);
			quotes = response.quotes || [];
			console.log('Fetched quotes:', quotes);
			console.log('Current user:', currentUser);
			console.log('Is customer:', isCustomer);
			console.log('Display quotes:', getDisplayQuotes(quotes, isCustomer, isContracted));
		} catch (error) {
			console.error('Error fetching quotes:', error);
			errorMessage = 'Failed to load quotes';
		} finally {
			isLoading = false;
		}
	}

	async function fetchChatMappings() {
		if (!currentUser) return;

		try {
			const chats = await apiClient.getUserChats();
			const newChatMap = new Map<string, string>();
			chats.forEach((chat: Chat) => {
				const otherParticipant = chat.participants.find((p: string) => p !== currentUser?.id);
				if (otherParticipant) {
					newChatMap.set(otherParticipant, chat.id);
				}
			});
			chatMap = newChatMap;
		} catch (error) {
			console.error('Failed to fetch chat mappings:', error);
		}
	}

	function handleViewQuotes() {
		goto(`/my-requests/${request.id}/quote`);
	}

	function handleSubmitQuote() {
		showQuoteSubmissionModal = true;
	}

	function handleQuoteSubmitted() {
		showQuoteSubmissionModal = false;
		// Refresh quotes after successful submission
		fetchQuotes();
	}

	function goToChat(expertSupplierId: string) {
		const chatId = chatMap.get(expertSupplierId);
		if (chatId) {
			goto(`/chat/${chatId}`);
		} else {
			goto(`/chat`);
		}
	}

	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusColor(status: Quote['status']): string {
		switch (status) {
			case 'submitted':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
			case 'under_review':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
			case 'accepted':
				return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
			case 'rejected':
				return 'bg-red-500/20 text-red-300 border-red-500/30';
			case 'revised':
				return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
			default:
				return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
		}
	}

	function isContractedQuote(quote: Quote): boolean {
		// For now, return false until we have contracted user ID fields
		// TODO: Implement when contractedExpertId/contractedSupplierId fields are available
		return false;
	}
	// Computed
	let canSubmitQuote = $derived(checkCanSubmitQuote());
	let isCustomer = $derived(currentUser && currentUser.id === request.customerId);
	let isContracted = $derived(request.status === 'contracted');
	let displayQuotes = $derived(getDisplayQuotes(quotes, isCustomer, isContracted));
	// Reactive fetch when request changes
	$effect(() => {
		if (request && request.id) {
			fetchQuotes();
		}
	});
</script>

<!-- Quotations Tab - Simplified to redirect to dedicated quote page -->
<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-xl font-bold text-slate-100">Quotations</h2>
			<p class="text-slate-400">
				{#if isLoading}
					Loading quotes...
				{:else if displayQuotes.length === 0}
					{isCustomer ? 'No quotes received yet' : 'No quotes submitted yet'}
				{:else if isCustomer && isContracted}
					Showing contracted {requestType === 'work' ? 'expert' : 'supplier'}'s quote
				{:else}
					{displayQuotes.length} quote{displayQuotes.length !== 1 ? 's' : ''}
					{isCustomer ? 'received' : 'submitted'}
				{/if}
			</p>
		</div>

		{#if canSubmitQuote}
			<button
				onclick={handleSubmitQuote}
				class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
				Submit Quote
			</button>
		{/if}
	</div>

	<!-- Content -->
	{#if isLoading}
		<div
			class="flex h-32 items-center justify-center rounded-2xl border border-slate-600/30 bg-slate-800/40"
		>
			<div class="flex items-center space-x-3">
				<svg
					class="h-6 w-6 animate-spin text-emerald-500"
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
				<p class="text-slate-300">Loading quotes...</p>
			</div>
		</div>
	{:else if errorMessage}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
			<p class="text-red-300">{errorMessage}</p>
		</div>
	{:else if displayQuotes.length === 0}
		<!-- Empty State -->
		<div
			class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-8 text-center shadow-xl backdrop-blur-sm"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-500/20"
			>
				<svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>

			<h3 class="mb-3 text-xl font-bold text-slate-100">
				{isCustomer ? 'No Quotes Yet' : 'No Quotes Submitted'}
			</h3>
			<p class="mb-6 text-slate-400">
				{isCustomer
					? 'No quotes have been submitted for this request yet.'
					: canSubmitQuote
						? 'Be the first to submit a quote for this request.'
						: 'You are not eligible to submit quotes for this request.'}
			</p>

			{#if canSubmitQuote}
				<button
					onclick={handleSubmitQuote}
					class="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
				>
					Submit First Quote
				</button>
			{/if}
		</div>
	{:else}
		<!-- Quote Preview Cards -->
		<div class="space-y-4">
			{#each displayQuotes as quote (quote.id)}
				<div
					class="relative rounded-2xl border p-4 shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl
					{isContractedQuote(quote)
						? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5'
						: 'border-slate-600/30 bg-slate-800/40'}"
				>
					<!-- Contracted Badge -->
					{#if isContractedQuote(quote)}
						<div class="absolute -top-2 -right-2">
							<div
								class="flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Contracted
							</div>
						</div>
					{/if}

					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<!-- Quote Title and Status -->
							<div class="mb-2 flex items-center gap-2">
								<h4 class="truncate text-lg font-semibold text-slate-100">{quote.title}</h4>
								<span
									class="rounded-full border px-2 py-1 text-xs font-medium {getStatusColor(
										quote.status
									)}"
								>
									{quote.status.replace('_', ' ').toUpperCase()}
								</span>
								{#if quote.version > 1}
									<span class="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
										v{quote.version}
									</span>
								{/if}
							</div>

							<!-- Expert/Supplier Info (for customers) -->
							{#if isCustomer && quote.expertSupplier}
								<div class="mb-3 flex items-center gap-2">
									<div class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600">
										{#if quote.expertSupplier.profile?.avatarUrl}
											<img
												src={quote.expertSupplier.profile.avatarUrl}
												alt="{requestType === 'work' ? 'Expert' : 'Supplier'} avatar"
												class="h-6 w-6 rounded-full object-cover"
											/>
										{:else}
											<span class="text-xs font-medium text-slate-300">
												{quote.expertSupplier.profile?.fullName?.charAt(0) ||
													quote.expertSupplier.email?.charAt(0) ||
													(requestType === 'work' ? 'E' : 'S')}
											</span>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-slate-200">
											{quote.expertSupplier.profile?.fullName || quote.expertSupplier.email}
										</p>
										{#if requestType === 'material' && quote.expertSupplier.profile?.companyName}
											<p class="truncate text-xs text-slate-400">
												{quote.expertSupplier.profile.companyName}
											</p>
										{:else if requestType === 'work' && quote.expertSupplier.profile?.expertise}
											<p class="truncate text-xs text-slate-400">
												{quote.expertSupplier.profile.expertise}
											</p>
										{/if}
									</div>
									{#if chatMap.has(quote.expertSupplierId)}
										<button
											onclick={() => goToChat(quote.expertSupplierId)}
											class="rounded-lg bg-blue-500/20 p-1.5 text-blue-400 transition-colors hover:bg-blue-500/30"
											aria-label="Chat with {requestType === 'work' ? 'Expert' : 'Supplier'}"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
												/>
											</svg>
										</button>
									{/if}
								</div>
							{/if}

							<!-- Quote Details -->
							<div class="flex flex-wrap items-center gap-4 text-sm text-slate-300">
								{#if quote.amount}
									<div class="flex items-center gap-1">
										<svg
											class="h-4 w-4 text-emerald-400"
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
										<span class="font-semibold text-emerald-400">
											{formatCurrency(quote.amount, quote.currency || 'INR')}
										</span>
									</div>
								{/if}
								<div class="flex items-center gap-1">
									<svg
										class="h-4 w-4 text-slate-400"
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
									<span>Valid until {formatDate(quote.validityDate || '')}</span>
								</div>
								{#if quote.files.length > 0}
									<div class="flex items-center gap-1">
										<svg
											class="h-4 w-4 text-slate-400"
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
										<span>{quote.files.length} file{quote.files.length > 1 ? 's' : ''}</span>
									</div>
								{/if}
							</div>

							<!-- Description Preview -->
							{#if quote.description}
								<p class="mt-2 line-clamp-2 text-sm text-slate-400">
									{quote.description}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}

			<!-- View More Button -->
			<div class="flex justify-center pt-2">
				<button
					onclick={handleViewQuotes}
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					{isCustomer ? 'View All Quotes' : 'Manage My Quotes'}
				</button>
			</div>
		</div>
	{/if}
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
			availableRequests={[request]}
			onQuoteSubmitted={handleQuoteSubmitted}
			onClose={() => (showQuoteSubmissionModal = false)}
		/>
	</GeneralModal>
{/if}
