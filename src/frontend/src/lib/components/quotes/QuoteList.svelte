<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Quote } from '$lib/types';
	import { fade, slide } from 'svelte/transition';
	import apiClient from '$lib/api';

	// Props
	export let quotes: Quote[] = [];
	export let currentUser: any;
	export let showActions = true;

	// State for expanded history
	let expandedHistory: { [key: string]: boolean } = {};

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		quoteSelected: Quote;
		quoteRevised: Quote;
	}>();

	// Methods
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

	function getStatusLabel(status: Quote['status']): string {
		switch (status) {
			case 'submitted':
				return 'Submitted';
			case 'under_review':
				return 'Under Review';
			case 'accepted':
				return 'Accepted';
			case 'rejected':
				return 'Rejected';
			case 'revised':
				return 'Revised';
			default:
				return 'Unknown';
		}
	}

	function handleQuoteClick(quote: Quote) {
		dispatch('quoteSelected', quote);
		// TODO: Open quote detail modal
		console.log('Quote clicked:', quote);
	}

	async function goToChat(quote: Quote) {
		try {
			// Find chat between current user (expert/supplier) and customer
			const customerId = quote.customerId;

			console.log('Finding chat between users:', currentUser?.id, 'and', customerId);

			const { chat } = await apiClient.findChatBetweenUsers(currentUser?.id, customerId);

			console.log('Found chat:', chat);

			if (chat) {
				// Navigate directly to the chat
				goto(`/chat/${chat.id}`);
			} else {
				// No existing chat, navigate to chat list
				goto(`/chat`);
			}
		} catch (error) {
			console.error('Error finding chat:', error);
			// Fallback to chat list
			goto(`/chat`);
		}
	}

	function handleRevise(quote: Quote, event: Event) {
		event.stopPropagation();
		dispatch('quoteRevised', quote);
	}

	function toggleHistory(quoteId: string) {
		expandedHistory = {
			...expandedHistory,
			[quoteId]: !expandedHistory[quoteId]
		};
	}

	// Get all quotes related to a quote (parent and children)
	function getQuoteHistory(quote: Quote): Quote[] {
		const history: Quote[] = [];

		// If this quote has a parent, find the parent and all its children
		if (quote.parentQuoteId) {
			const parent = quotes.find((q) => q.id === quote.parentQuoteId);
			if (parent) {
				history.push(parent);
			}
			// Find all siblings (other quotes with same parent)
			const siblings = quotes.filter(
				(q) => q.parentQuoteId === quote.parentQuoteId && q.id !== quote.id
			);
			history.push(...siblings);
		}

		// Find all children of this quote
		const children = quotes.filter((q) => q.parentQuoteId === quote.id);
		history.push(...children);

		// Add current quote
		history.push(quote);

		// Sort by version number (descending - newest first)
		return history.sort((a, b) => (b.version || 0) - (a.version || 0));
	}

	// Check if quote has history (revisions)
	function hasHistory(quote: Quote): boolean {
		return (
			quote.parentQuoteId !== undefined ||
			quotes.some((q) => q.parentQuoteId === quote.id) ||
			quote.version > 1
		);
	}
</script>

<div class="space-y-4">
	{#if quotes.length === 0}
		<div class="rounded-lg border border-slate-600 bg-slate-700/50 p-8 text-center">
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
			<p class="mt-2 text-sm text-slate-400">No quotes submitted yet</p>
		</div>
	{:else}
		{#each quotes as quote (quote.id)}
			<div>
				<div
					class="border border-slate-600 bg-slate-700/50 p-4 transition-all hover:bg-slate-700"
					class:border-b-0={expandedHistory[quote.id] && hasHistory(quote)}
					class:rounded-lg={!(expandedHistory[quote.id] && hasHistory(quote))}
					class:rounded-t-lg={expandedHistory[quote.id] && hasHistory(quote)}
					class:delay-290={!expandedHistory[quote.id] && hasHistory(quote)}
				>
					<div class="flex items-start justify-between">
						<div
							class="min-w-0 flex-1 cursor-pointer"
							on:click={() => handleQuoteClick(quote)}
							on:keydown={(e) => e.key === 'Enter' && handleQuoteClick(quote)}
							role="button"
							tabindex="0"
						>
							<div class="flex items-center gap-2">
								<h3 class="truncate text-lg font-medium text-slate-100">
									{quote.title}
								</h3>
								<span
									class="rounded-full border px-2 py-1 text-xs font-medium {getStatusColor(
										quote.status
									)}"
								>
									{getStatusLabel(quote.status)}
								</span>
								{#if quote.version > 1}
									<span class="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
										v{quote.version}
									</span>
								{/if}
							</div>

							{#if quote.description}
								<p class="mt-1 line-clamp-2 text-sm text-slate-300">
									{quote.description}
								</p>
							{/if}

							<div class="mt-2 flex items-center gap-4 text-sm text-slate-400">
								{#if quote.amount}
									<span class="font-medium text-emerald-400">
										{formatCurrency(quote.amount, quote.currency || 'INR')}
									</span>
								{/if}
								<span>Valid until {formatDate(quote.validityDate || '')}</span>
								<span>Submitted {formatDate(quote.submittedAt || '')}</span>
							</div>
						</div>

						{#if showActions && currentUser?.id === quote.expertSupplierId}
							<!-- Expert/Supplier actions only -->
							<div class="ml-4 flex gap-2">
								{#if hasHistory(quote)}
									<button
										aria-label="{expandedHistory[quote.id] ? 'Hide' : 'Show'} history"
										on:click={(e) => {
											e.stopPropagation();
											toggleHistory(quote.id);
										}}
										class="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="lucide lucide-history-icon lucide-history h-3 w-3"
											><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path
												d="M3 3v5h5"
											/><path d="M12 7v5l4 2" /></svg
										>
										{expandedHistory[quote.id] ? 'Hide' : 'History'}
									</button>
								{/if}
								{#if quote.status === 'submitted' || quote.status === 'under_review' || quote.status === 'rejected'}
									<button
										on:click={(e) => handleRevise(quote, e)}
										class="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
									>
										Revise
									</button>
								{/if}
							</div>
						{/if}
					</div>

					<div class="mt-2 flex items-center justify-between">
						<div class="flex items-center gap-4">
							{#if quote.files.length > 0}
								<div class="flex items-center gap-1 text-xs text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
										/>
									</svg>
									{quote.files.length} file{quote.files.length > 1 ? 's' : ''}
								</div>
							{/if}
						</div>

						<!-- Chat button for experts/suppliers -->
						{#if currentUser?.id === quote.expertSupplierId}
							<button
								on:click={(e) => {
									e.stopPropagation();
									goToChat(quote);
								}}
								class="cursor-pointer rounded-lg bg-blue-500/20 p-1.5 text-blue-400 transition-colors hover:bg-blue-500/30"
								aria-label="Chat with Customer"
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
				</div>

				<!-- Expandable History Section -->
				{#if expandedHistory[quote.id] && hasHistory(quote)}
					<div
						transition:slide
						class="rounded-b-lg border-x border-b border-slate-600 bg-slate-800/40 p-4"
					>
						<div class="mb-3 text-sm font-medium text-slate-300">Revision History</div>
						<div class="space-y-3">
							{#each getQuoteHistory(quote) as historyQuote, index (historyQuote.id)}
								<div class="flex items-start gap-3">
									<div class="flex flex-col items-center">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white {historyQuote.id ===
											quote.id
												? 'bg-blue-500'
												: 'bg-slate-600'}"
										>
											v{historyQuote.version}
										</div>
										{#if index < getQuoteHistory(quote).length - 1}
											<div class="my-1 h-8 w-0.5 bg-slate-600"></div>
										{/if}
									</div>
									<div
										class="flex-1 rounded-lg border p-3 {historyQuote.id === quote.id
											? 'border-blue-500/30 bg-blue-500/10'
											: 'border-slate-600 bg-slate-700/30'}"
									>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium text-slate-200">{historyQuote.title}</span>
												<span
													class="rounded-full border px-2 py-0.5 text-xs font-medium {getStatusColor(
														historyQuote.status
													)}"
												>
													{getStatusLabel(historyQuote.status)}
												</span>
												{#if historyQuote.id === quote.id}
													<span class="text-xs font-medium text-blue-400">Current</span>
												{/if}
											</div>
											<button
												on:click={() => handleQuoteClick(historyQuote)}
												class="text-xs text-blue-400 hover:text-blue-300"
											>
												View
											</button>
										</div>
										<div class="mt-1 text-xs text-slate-400">
											{new Date(historyQuote.submittedAt).toLocaleDateString('en-IN', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
