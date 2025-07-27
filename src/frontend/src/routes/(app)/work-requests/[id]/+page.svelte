<!-- gefifi-2/src/frontend/src/routes/(app)/work-requests/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import UserProfile from '$lib/components/UserProfile.svelte';

	// --- Component Assets ---
	const contractIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>`;
	const chatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`;

	// --- Component State ---
	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let workRequest: any = null;
	let isLoading = true;
	let errorMessage = '';
	let workRequestId: string | null = null;
	let contractedProfessionalId: string | null = null;
	let chatMap = new Map<string, string>();

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
		contractedProfessionalId = null;
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

			// If the current user is the customer, fetch their chats and check for contracts.
			if (currentUser && workRequest && currentUser.id === workRequest.customerId) {
				// Fetch chats to create a map from professionalId -> chatId
				const chatsRes = await fetch(`${API_BASE_URL}/api/chat`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (chatsRes.ok) {
					const chats = await chatsRes.json();
					const newChatMap = new Map<string, string>();
					for (const chat of chats) {
						const otherParticipant = chat.participants.find(
							(pId: string) => pId !== currentUser?.id
						);
						if (otherParticipant) {
							newChatMap.set(otherParticipant, chat.id);
						}
					}
					chatMap = newChatMap;
				}

				// If status is 'contracted', find the professional it's contracted with.
				if (workRequest.status === 'contracted' && token) {
					const contractsRes = await fetch(`${API_BASE_URL}/api/contracts`, {
						headers: { Authorization: `Bearer ${token}` }
					});
					if (contractsRes.ok) {
						const contracts = await contractsRes.json();
						const currentContract = contracts.find((c: any) => c.workRequestId === workRequest.id);
						if (currentContract) {
							contractedProfessionalId = currentContract.expertSupplierId;
						}
					}
				}
			}
		} catch (err: any) {
			console.error('Fetch work request detail error:', err);
			errorMessage = err.message;
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
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					targetUserId: workRequest.customerId,
					workRequestId: workRequest.id,
					predefinedMessageKey: 'PROVIDER_INTEREST_IN_WORK_REQUEST'
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Failed to express interest.');

			interestMessage = result.message || 'Interest expressed successfully! Chat initiated.';
			if (result.chatId) setTimeout(() => goto(`/chat/${result.chatId}`), 2000);

			fetchWorkRequestDetails(workRequest.id);
		} catch (error: any) {
			console.error('Error expressing interest:', error);
			interestMessage = `Error: ${error.message}`;
		} finally {
			isExpressingInterest = false;
		}
	}

	onMount(() => {
		workRequestId = $page.params.id;
		if (workRequestId) {
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && !auth.isLoading) {
					token = auth.token;
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

	$: interestedProfessionals = workRequest
		? [
				...new Set([
					...(workRequest.interestedExperts || []),
					...(workRequest.interestedSuppliers || [])
				])
			]
		: [];
</script>

<div class="mx-auto max-w-4xl space-y-6">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<svg
				class="mr-3 -ml-1 h-10 w-10 animate-spin text-emerald-500"
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
			<p class="text-xl text-slate-300">Loading Work Request Details...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-600 bg-red-700/30 p-6 text-center shadow-xl">
			<h2 class="mb-3 text-2xl font-semibold text-red-300">Error Loading Details</h2>
			<p class="mb-4 text-red-400">{errorMessage}</p>
			<a
				href="/work-requests"
				class="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition-colors hover:bg-sky-600"
			>
				Back to Work Requests
			</a>
		</div>
	{:else if workRequest}
		<article class="overflow-hidden rounded-xl bg-slate-700/50 shadow-2xl">
			<header class="bg-slate-800/60 p-6 sm:p-8">
				<h1 class="mb-2 text-3xl leading-tight font-bold text-emerald-400 sm:text-4xl">
					{workRequest.title}
				</h1>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
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
						Status: {workRequest.status.replace(/_/g, ' ') || 'N/A'}
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
									href={imagePath}
									target="_blank"
									rel="noopener noreferrer"
									class="block aspect-video overflow-hidden rounded-lg shadow-md transition-shadow duration-200 hover:shadow-xl"
								>
									<img
										src={imagePath}
										alt="Work request for {workRequest.title}"
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

				{#if workRequest.customerId !== currentUser?.id}
					<section class="border-t border-slate-600/70 pt-4">
						<h2 class="mb-3 text-xl font-semibold text-sky-300">Posted By</h2>
						<UserProfile userId={workRequest.customerId} />
					</section>
				{/if}

				<!-- Actions for Expert/Supplier viewing the request -->
				{#if currentUser && (currentUser.userType === 'expert' || currentUser.userType === 'supplier') && workRequest.customerId !== currentUser?.id}
					{#if workRequest.status === 'open' || workRequest.status === 'awaiting_quotes'}
						<section class="border-t border-slate-600/70 pt-6 text-center">
							{#if alreadyInterested}
								<p class="font-semibold text-emerald-400">
									You have already expressed interest in this request.
								</p>
							{:else}
								<button
									on:click={handleExpressInterest}
									disabled={isExpressingInterest}
									class="rounded-lg bg-emerald-500 px-6 py-2.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-600 disabled:bg-slate-500"
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

				<!-- Actions for Customer who owns the request -->
				{#if currentUser && currentUser.id === workRequest.customerId}
					<div class="space-y-8 border-t border-slate-600/70 pt-6">
						{#if contractedProfessionalId}
							<section>
								<h2 class="mb-4 text-center text-xl font-semibold text-sky-300">
									Contracted Professional
								</h2>
								<div class="mx-auto max-w-lg rounded-lg bg-slate-800/50 p-4 shadow-md">
									<UserProfile userId={contractedProfessionalId} />
								</div>
							</section>
						{:else}
							<section class="space-y-6">
								<h2 class="mb-4 text-center text-xl font-semibold text-sky-300">
									Interested Professionals
								</h2>
								{#if interestedProfessionals.length > 0}
									<div class="mx-auto max-w-2xl space-y-4">
										{#each interestedProfessionals as profId (profId)}
											<div
												class="flex flex-col items-center justify-between gap-4 rounded-lg bg-slate-800/50 p-4 shadow-md sm:flex-row"
											>
												<div class="w-full flex-grow self-start">
													<UserProfile userId={profId} />
												</div>
												<div class="flex flex-shrink-0 items-center gap-2 self-center sm:self-auto">
													{#if chatMap.has(profId)}
														<a
															href={`/chat/${chatMap.get(profId)}`}
															class="group flex flex-col items-center"
														>
															<div
																class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 transition-colors group-hover:bg-sky-700"
															>
																<span class="h-6 w-6 text-white">{@html chatIcon}</span>
															</div>
															<span class="mt-1 text-xs text-slate-400 group-hover:text-sky-300"
																>Chat</span
															>
														</a>
													{/if}
													<a
														href={`/contracts/create?workRequestId=${workRequest.id}&professionalId=${profId}`}
														class="group flex flex-col items-center"
													>
														<div
															class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 transition-colors group-hover:bg-emerald-700"
														>
															<span class="h-6 w-6 text-white">{@html contractIcon}</span>
														</div>
														<span class="mt-1 text-xs text-slate-400 group-hover:text-emerald-300"
															>Contract</span
														>
													</a>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center">
										<p class="text-slate-400">
											No professionals have expressed interest yet. When they do, they will appear
											here.
										</p>
									</div>
								{/if}

								<!-- "Invite More" button for open requests -->
								{#if workRequest.status === 'open'}
									<div class="text-center">
										<a
											href="/find-professionals?type=expert&request-id={workRequest.id}"
											class="inline-block rounded-lg bg-sky-500 px-6 py-2 text-base font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-sky-600"
										>
											{`Invite ${interestedProfessionals.length > 0 ? 'More' : ''} Experts to Your Request`}
										</a>
									</div>
								{/if}
							</section>
						{/if}
					</div>
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
			<a
				href="/work-requests"
				class="mt-4 rounded-lg bg-emerald-500 px-5 py-2 font-medium text-white hover:bg-emerald-600"
			>
				Back to List
			</a>
		</div>
	{/if}
</div>
