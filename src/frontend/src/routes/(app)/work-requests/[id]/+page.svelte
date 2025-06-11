<!-- gefifi-2/src/frontend/src/routes/(app)/work-requests/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let workRequest: any = null; // Store for the fetched work request
	let isLoading = true;
	let errorMessage = '';
	let workRequestId: string | null = null;

	// For experts/suppliers to express interest
	let isExpressingInterest = false;
	let interestMessage = '';

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchWorkRequestDetails(id: string) {
		isLoading = true;
		errorMessage = '';
		if (!token) {
			errorMessage = 'Authentication token not available.';
			isLoading = false;
			return;
		}
		try {
			const response = await fetch(`${API_BASE_URL}/api/work-requests/${id}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(
					errorData?.message || `Failed to fetch work request: ${response.statusText}`
				);
			}
			workRequest = await response.json();
			// TODO: Fetch customer details if not the current user, or expert/supplier details for interested parties
		} catch (err: any) {
			console.error('Fetch work request detail error:', err);
			errorMessage = err.message;
			if (err.message.toLowerCase().includes('not found')) {
				// Optionally, redirect to a 404 page or the list page
				// setTimeout(() => goto('/work-requests'), 3000);
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleExpressInterest() {
		if (
			!workRequest ||
			!currentUser ||
			!token ||
			(currentUser.userType !== 'expert' && currentUser.userType !== 'supplier')
		)
			return;

		isExpressingInterest = true;
		interestMessage = '';
		try {
			const response = await fetch(`${API_BASE_URL}/api/users/interest`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					targetUserId: workRequest.customerId, // The customer who created the work request
					workRequestId: workRequest.id,
					predefinedMessageKey: 'PROVIDER_INTEREST_IN_WORK_REQUEST'
				})
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to express interest.');
			}
			interestMessage = result.message || 'Interest expressed successfully! Chat initiated.';
			// Optionally, refresh work request data to show updated interested list or redirect to chat
			if (result.chatId) {
				// Give a moment for user to read message, then go to chat
				setTimeout(() => goto(`/chat/${result.chatId}`), 2000);
			}
			// Refresh data to reflect interest (e.g. disable button)
			fetchWorkRequestDetails(workRequest.id);
		} catch (error: any) {
			console.error('Error expressing interest:', error);
			interestMessage = `Error: ${error.message}`;
		} finally {
			isExpressingInterest = false;
		}
	}

	// TODO: Functions for customer: editWorkRequest, cancelWorkRequest
	// TODO: Function for navigating to user profiles

	onMount(() => {
		workRequestId = $page.params.id;
		if (workRequestId) {
			// Ensure token is available before fetching
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && !auth.isLoading) {
					token = auth.token; // Ensure token is up-to-date from store
					currentUser = auth.user;
					fetchWorkRequestDetails(workRequestId!);
					unsubscribe();
				} else if (!auth.isLoading && !auth.token) {
					errorMessage = 'User not authenticated. Cannot load details.';
					isLoading = false;
					unsubscribe();
				}
			});
		} else {
			errorMessage = 'Work Request ID not found in URL.';
			isLoading = false;
		}
	});

	function getStatusClass(status: string) {
		switch (status) {
			case 'open':
				return 'bg-green-500/20 text-green-300 border-green-500/50';
			case 'in_discussion':
			case 'awaiting_quotes':
				return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
			case 'contracted':
				return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
			case 'completed':
				return 'bg-slate-600 text-slate-300 border-slate-500/50';
			case 'cancelled':
				return 'bg-red-500/20 text-red-300 border-red-500/50';
			default:
				return 'bg-slate-700 text-slate-400';
		}
	}

	$: alreadyInterested =
		workRequest &&
		currentUser &&
		((currentUser.userType === 'expert' &&
			workRequest.interestedExperts?.includes(currentUser.id)) ||
			(currentUser.userType === 'supplier' &&
				workRequest.interestedSuppliers?.includes(currentUser.id)));
</script>

<div class="mx-auto max-w-4xl space-y-6">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-10 w-10 animate-spin text-emerald-500"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle><path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path></svg
			>
			<p class="text-xl text-slate-300">Loading Work Request Details...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-600 bg-red-700/30 p-6 text-center shadow-xl">
			<h2 class="mb-3 text-2xl font-semibold text-red-300">Error Loading Details</h2>
			<p class="mb-4 text-red-400">{errorMessage}</p>
			<button
				on:click={() => goto('/work-requests')}
				class="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition-colors hover:bg-sky-600"
			>
				Back to Work Requests
			</button>
		</div>
	{:else if workRequest}
		<article class="overflow-hidden rounded-xl bg-slate-700/50 shadow-2xl">
			<header class="bg-slate-800/60 p-6 sm:p-8">
				<h1 class="mb-2 text-3xl leading-tight font-bold text-emerald-400 sm:text-4xl">
					{workRequest.title}
				</h1>
				<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
					<span
						>Category: <span class="font-semibold text-sky-300"
							>{workRequest.category || 'N/A'}</span
						></span
					>
					<span
						class="rounded-full px-3 py-1 text-xs font-semibold {getStatusClass(
							workRequest.status
						)}"
					>
						Status: {workRequest.status.replace('_', ' ') || 'N/A'}
					</span>
				</div>
			</header>

			<div class="space-y-6 p-6 sm:p-8">
				{#if workRequest.images && workRequest.images.length > 0}
					<section>
						<h2 class="mb-3 text-xl font-semibold text-sky-300">Images</h2>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
							{#each workRequest.images as imagePath (imagePath)}
								<a
									href={API_BASE_URL + imagePath}
									target="_blank"
									rel="noopener noreferrer"
									class="block aspect-video overflow-hidden rounded-lg shadow-md transition-shadow duration-200 hover:shadow-xl"
								>
									<img
										src={API_BASE_URL + imagePath}
										alt="Work request image for {workRequest.title}"
										class="h-full w-full bg-slate-600 object-cover"
										loading="lazy"
									/>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<section>
					<h2 class="mb-2 text-xl font-semibold text-sky-300">Description</h2>
					<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
						{workRequest.description || 'No description provided.'}
					</p>
				</section>

				<div
					class="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-slate-600/70 pt-4 md:grid-cols-2"
				>
					<div>
						<h3 class="text-md font-semibold text-sky-300">Location</h3>
						<p class="text-slate-300">{workRequest.location || 'N/A'}</p>
					</div>
					<div>
						<h3 class="text-md font-semibold text-sky-300">Expected Budget</h3>
						<p class="text-slate-300">
							{workRequest.expectedCost
								? `₹${workRequest.expectedCost.toLocaleString()}`
								: 'Not specified'}
						</p>
					</div>
					<div>
						<h3 class="text-md font-semibold text-sky-300">Expected Timeline</h3>
						<p class="text-slate-300">{workRequest.timeline || 'Not specified'}</p>
					</div>
					<div>
						<h3 class="text-md font-semibold text-sky-300">Preferred Materials</h3>
						<p class="text-slate-300">{workRequest.materialsSuggested || 'Not specified'}</p>
					</div>
				</div>

				<!-- Customer Information (Placeholder - requires fetching customer details) -->
				{#if workRequest.customerId !== currentUser?.id}
					<section class="border-t border-slate-600/70 pt-4">
						<h2 class="mb-2 text-xl font-semibold text-sky-300">Posted By</h2>
						<!-- TODO: Fetch and display customer name, avatar, link to profile -->
						<p class="text-slate-300">Customer ID: {workRequest.customerId}</p>
						<!-- <button class="text-emerald-400 hover:underline">View Customer Profile</button> -->
					</section>
				{/if}

				<!-- Actions for Expert/Supplier -->
				{#if currentUser && (currentUser.userType === 'expert' || currentUser.userType === 'supplier') && workRequest.customerId !== currentUser?.id}
					{#if workRequest.status === 'open' || workRequest.status === 'awaiting_quotes'}
						<section class="border-t border-slate-600/70 pt-6 text-center">
							{#if alreadyInterested}
								<p class="font-semibold text-emerald-400">
									You have already expressed interest in this request.
								</p>
								<!-- TODO: Check if a chat already exists and link to it -->
								<!-- <button on:click={() => goto('/chat/...')} class="mt-2 bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-5 rounded-lg">Go to Chat</button> -->
							{:else}
								<button
									on:click={handleExpressInterest}
									disabled={isExpressingInterest}
									class="rounded-lg bg-emerald-500 px-6 py-2.5 text-base font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg disabled:bg-slate-500"
								>
									{isExpressingInterest ? 'Processing...' : 'Express Interest & Start Chat'}
								</button>
							{/if}
							{#if interestMessage}
								<p
									class="mt-3 text-sm {interestMessage.startsWith('Error:')
										? 'text-red-400'
										: 'text-green-400'}"
								>
									{interestMessage}
								</p>
							{/if}
						</section>
					{/if}
				{/if}

				<!-- Actions for Customer -->
				{#if currentUser && currentUser.id === workRequest.customerId}
					<section class="flex flex-wrap justify-center gap-4 border-t border-slate-600/70 pt-6">
						{#if workRequest.status === 'open'}
							<!-- <button class="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-5 rounded-lg">Edit Request</button> -->
							<!-- <button class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-5 rounded-lg">Cancel Request</button> -->
							<p class="text-sm text-slate-400">
								TODO: Add Edit/Cancel options for 'open' requests.
							</p>
						{/if}
						<!-- TODO: Display interested experts/suppliers -->
						<p class="text-sm text-slate-400">
							TODO: List interested experts/suppliers for this request.
						</p>
					</section>
				{/if}
			</div>
			<footer class="bg-slate-800/60 p-4 text-center sm:p-6">
				<p class="text-xs text-slate-500">
					Work Request ID: {workRequest.id} | Posted: {new Date(
						workRequest.createdAt
					).toLocaleString()}
				</p>
			</footer>
		</article>
	{:else}
		<div class="rounded-xl bg-slate-700/50 p-6 text-center shadow-lg">
			<h2 class="text-xl font-semibold text-sky-400">Work Request Not Found</h2>
			<p class="mt-2 text-slate-300">
				The requested work order could not be loaded or does not exist.
			</p>
			<button
				on:click={() => goto('/work-requests')}
				class="mt-4 rounded-lg bg-emerald-500 px-5 py-2 font-medium text-white hover:bg-emerald-600"
				>Back to List</button
			>
		</div>
	{/if}
</div>

<style lang="postcss">
	/* Add any page-specific styles here if needed */
</style>
