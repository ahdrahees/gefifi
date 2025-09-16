<!-- gefifi-2/src/frontend/src/routes/(app)/work-requests/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import { page } from '$app/stores'; // For query params or path if needed later

	let currentUser: AuthUser | null = null;
	let workRequests: any[] = [];
	let isLoading = true;
	let errorMessage = '';
	let token: string | null = null;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchWorkRequests() {
		isLoading = true;
		errorMessage = '';
		if (!currentUser || !token) {
			errorMessage = 'User not authenticated. Cannot load data.';
			isLoading = false;
			return;
		}

		try {
			const headers = {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			};

			let url = `${API_BASE_URL}/api/work-requests`;
			// For customers, backend might filter by customerId based on token, or we can pass it as a query param
			// The current backend GET /api/work-requests fetches all.
			// The homepage fetch for customer was: /api/work-requests?customerId=${currentUser.id}
			// Let's assume for now, if customer, we fetch all and then filter, or adjust if a specific endpoint exists.
			// For simplicity and consistency with homepage, let's try to fetch all if expert/supplier,
			// and for customer, we can filter client-side or assume backend handles it if no query param is used.
			// The backend route GET /work-requests currently returns ALL requests.
			// The POST /work-requests is authenticated.
			// Let's refine the fetch logic:

			const response = await fetch(url, { headers });
			if (!response.ok) {
				throw new Error(`Failed to fetch work requests: ${response.statusText}`);
			}
			let allRequests = await response.json();

			if (currentUser.userType === 'customer') {
				workRequests = allRequests.filter((req: any) => req.customerId === currentUser?.id);
			} else if (currentUser.userType === 'expert' || currentUser.userType === 'supplier') {
				// Experts/Suppliers see requests that are open, awaiting_quotes, or in_discussion
				workRequests = allRequests.filter(
					(req: any) =>
						['open', 'awaiting_quotes', 'in_discussion', 'contracted'].includes(req.status) // Include 'contracted' so they can see requests they might be working on
				);
			} else {
				workRequests = allRequests; // Should not happen for known user types
			}
			// Sort by most recent
			workRequests.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} catch (err: any) {
			console.error('Work requests fetch error:', err);
			errorMessage = err.message || 'An error occurred while loading work requests.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		// Wait for user and token to be available
		const unsubscribe = authStore.subscribe((auth) => {
			if (auth.user && auth.token && !auth.isLoading) {
				currentUser = auth.user;
				token = auth.token;
				fetchWorkRequests();
				unsubscribe();
			} else if (!auth.isLoading && !auth.user) {
				// If auth has loaded and there's no user, stop loading and show error or redirect
				errorMessage = 'User not authenticated.';
				isLoading = false;
				unsubscribe();
			}
		});
	});

	function truncateText(text: string, maxLength: number): string {
		if (!text) return '';
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'open':
				return 'text-green-400';
			case 'in_discussion':
				return 'text-yellow-400';
			case 'awaiting_quotes':
				return 'text-blue-400';
			case 'contracted':
				return 'text-purple-400';
			case 'completed':
				return 'text-gray-400';
			case 'cancelled':
				return 'text-red-400';
			default:
				return 'text-slate-400';
		}
	}
</script>

<div class="space-y-6">
	<header class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<h1 class="text-3xl font-bold text-emerald-400">Work Requests</h1>
		{#if currentUser?.userType === 'customer'}
			<button
				on:click={() => goto('/customer/create-request')}
				class="flex items-center space-x-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-5 w-5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				<span>Create New Request</span>
			</button>
		{/if}
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-8 w-8 animate-spin text-emerald-500"
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
			<p class="text-slate-300">Loading work requests...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-700 bg-red-800/50 p-4 text-red-300 shadow">
			<h3 class="text-lg font-bold">Error Loading Requests</h3>
			<p>{errorMessage}</p>
			<button
				class="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
				on:click={fetchWorkRequests}>Try Again</button
			>
		</div>
	{:else if workRequests.length === 0}
		<div class="rounded-xl bg-slate-700/50 p-6 text-center shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-4 h-16 w-16 text-slate-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h2 class="mb-2 text-xl font-semibold text-sky-400">No Work Requests Found</h2>
			{#if currentUser?.userType === 'customer'}
				<p class="text-slate-300">
					You haven't created any work requests yet. Click the button above to get started!
				</p>
			{:else}
				<p class="text-slate-300">
					There are currently no work requests matching your view criteria.
				</p>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
			{#each workRequests as wr (wr.id)}
				<div
					class="flex cursor-pointer flex-col justify-between rounded-lg bg-slate-700/60 p-5 shadow-lg transition-all duration-200 ease-in-out hover:bg-slate-600/80"
					on:click={() => goto(`/work-requests/${wr.id}`)}
					role="link"
					tabindex="0"
					on:keypress={(e) => {
						if (e.key === 'Enter') goto(`/work-requests/${wr.id}`);
					}}
				>
					<div>
						<h3 class="mb-1.5 truncate text-xl font-semibold text-emerald-400" title={wr.title}>
							{wr.title}
						</h3>
						<p class="mb-1 text-xs text-slate-400">
							Category: <span class="font-medium text-slate-300">{wr.category}</span>
						</p>
						<p class="mb-2.5 text-xs text-slate-400">
							Status: <span class="font-semibold capitalize {getStatusColor(wr.status)}"
								>{wr.status.replace('_', ' ')}</span
							>
						</p>
						<p
							class="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-300"
							title={wr.description}
						>
							{truncateText(wr.description, 120)}
						</p>
					</div>
					<div class="mt-auto border-t border-slate-600/50 pt-3">
						{#if currentUser?.userType !== 'customer' && wr.customerProfile}
							<p class="text-xs text-slate-400">
								Customer: <span class="font-medium text-slate-300"
									>{wr.customerProfile.fullName || 'N/A'}</span
								>
							</p>
						{:else if currentUser?.userType !== 'customer'}
							<p class="text-xs text-slate-400">
								Customer ID: <span class="font-medium text-slate-300"
									>{truncateText(wr.customerId, 12)}</span
								>
							</p>
						{/if}
						<p class="text-xs text-slate-400">
							Location: <span class="font-medium text-slate-300"
								>{truncateText(wr.location, 30)}</span
							>
						</p>
						<p class="mt-1.5 text-xs text-slate-500">Posted: {formatDate(wr.createdAt)}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="postcss">
	.line-clamp-3 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
	}
</style>
