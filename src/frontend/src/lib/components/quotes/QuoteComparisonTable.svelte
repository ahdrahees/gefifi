<script lang="ts">
	import { goto } from '$app/navigation';
	import type { AuthUser, Quote } from '$lib/types';
	import { fade } from 'svelte/transition';
	import apiClient from '$lib/api';
	import { assertNonNullish } from '$lib/utils/assert';

	interface Props {
		// Props
		quotes?: Quote[];
		requestType?: 'work' | 'material';
		currentUser: AuthUser | null;
		onQuoteView?: (detail: { quoteId: string }) => void;
		onQuoteAccept?: (detail: { quoteId: string }) => void;
		onQuoteReject?: (detail: { quoteId: string }) => void;
	}

	let {
		quotes = [],
		requestType = 'work',
		currentUser,
		onQuoteView,
		onQuoteAccept,
		onQuoteReject
	}: Props = $props();

	// State for expanded history
	let expandedHistory: { [key: string]: boolean } = $state({});

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

	function handleViewQuote(quoteId: string) {
		onQuoteView?.({ quoteId });
	}

	function handleAcceptQuote(quoteId: string) {
		onQuoteAccept?.({ quoteId });
	}

	function handleRejectQuote(quoteId: string) {
		onQuoteReject?.({ quoteId });
	}

	async function goToChat(quote: Quote) {
		try {
			// Find chat between current user (customer) and expert/supplier
			const expertSupplierId = quote.expertSupplierId;

			console.log('Finding chat between users:', currentUser?.id, 'and', expertSupplierId);
			assertNonNullish(currentUser, 'Current user is null or undefined');
			const { chat } = await apiClient.findChatBetweenUsers(currentUser?.id, expertSupplierId);

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

		// Sort by version number
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

<div class="scrollable-content overflow-x-auto">
	<table class="w-full border-collapse">
		<thead>
			<tr class="border-b border-slate-600">
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Quote</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">
					{requestType === 'work' ? 'Expert' : 'Supplier'}
				</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Amount</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Validity</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Status</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Submitted</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Files</th>
				<th class="px-4 py-3 text-left text-sm font-medium text-slate-200">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each quotes as quote (quote.id)}
				<tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
					<td class="px-4 py-3">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h4 class="truncate font-medium text-slate-100">{quote.title}</h4>
								{#if quote.version > 1}
									<span class="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
										v{quote.version}
									</span>
								{/if}
							</div>
							{#if quote.description}
								<p class="mt-1 line-clamp-1 text-sm text-slate-400">
									{quote.description}
								</p>
							{/if}
						</div>
					</td>
					<td class="px-4 py-3">
						<div class="flex items-center gap-2">
							<!-- Expert/Supplier Avatar -->
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600">
								{#if quote.expertSupplier?.profile?.avatarUrl}
									<img
										src={quote.expertSupplier.profile.avatarUrl}
										alt="{requestType === 'work' ? 'Expert' : 'Supplier'} avatar"
										class="h-8 w-8 rounded-full object-cover"
									/>
								{:else}
									<span class="text-xs font-medium text-slate-300">
										{quote.expertSupplier?.profile?.fullName?.charAt(0) ||
											quote.expertSupplier?.email?.charAt(0) ||
											(requestType === 'work' ? 'E' : 'S')}
									</span>
								{/if}
							</div>

							<div class="min-w-0 flex-1">
								{#if quote.expertSupplier}
									<p class="truncate font-medium text-slate-200">
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
								{:else}
									<p class="text-slate-400">
										Unknown {requestType === 'work' ? 'Expert' : 'Supplier'}
									</p>
								{/if}
							</div>

							<button
								onclick={() => goToChat(quote)}
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
						</div>
					</td>
					<td class="px-4 py-3">
						{#if quote.amount}
							<span class="font-medium text-emerald-400">
								{formatCurrency(quote.amount, quote.currency || 'INR')}
							</span>
						{:else}
							<span class="text-slate-400">Not specified</span>
						{/if}
					</td>
					<td class="px-4 py-3 text-sm text-slate-300">
						{formatDate(quote.validityDate || '')}
					</td>
					<td class="px-4 py-3">
						<span
							class="rounded-full border px-2 py-1 text-xs font-medium {getStatusColor(
								quote.status
							)}"
						>
							{getStatusLabel(quote.status)}
						</span>
					</td>
					<td class="px-4 py-3 text-sm text-slate-300">
						{formatDate(quote.submittedAt)}
					</td>
					<td class="px-4 py-3 text-sm text-slate-300">
						{quote.files.length} file{quote.files.length > 1 ? 's' : ''}
					</td>
					<td class="px-4 py-3">
						<div class="flex gap-2">
							{#if hasHistory(quote)}
								<button
									onclick={() => toggleHistory(quote.id)}
									class="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs text-slate-300 transition-all ease-out hover:bg-slate-700"
									aria-label="{expandedHistory[quote.id] ? 'Hide' : 'Show'} history"
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
							<button
								onclick={() => handleViewQuote(quote.id)}
								class="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
							>
								View
							</button>
							{#if quote.status === 'submitted' || quote.status === 'under_review'}
								<button
									onclick={() => handleAcceptQuote(quote.id)}
									class="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white transition-colors hover:bg-emerald-700"
								>
									Accept
								</button>
								<button
									onclick={() => handleRejectQuote(quote.id)}
									class="rounded-lg bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
								>
									Reject
								</button>
							{/if}
						</div>
					</td>
				</tr>

				<!-- Expandable History Row -->
				{#if expandedHistory[quote.id] && hasHistory(quote)}
					<tr>
						<td
							colspan="8"
							class="border-t border-slate-700/50 bg-slate-800/40 p-0"
							transition:fade={{ duration: 200 }}
						>
							<div class="p-4">
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
														<span class="text-sm font-medium text-slate-200"
															>{historyQuote.title}</span
														>
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
														onclick={() => handleViewQuote(historyQuote.id)}
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
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 4px;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.6),
			rgba(5, 150, 105, 0.8)
		); /* emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		transition: all 0.2s ease;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 1));
		border-color: rgba(16, 185, 129, 0.4);
		transform: scale(1.1);
	}
	.scrollable-content::-webkit-scrollbar-corner {
		background: transparent;
	}
	/* Firefox */
	.scrollable-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
		color-scheme: dark;
	}
</style>
