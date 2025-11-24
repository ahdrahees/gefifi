<!-- gefifi-2/src/frontend/src/routes/(app)/work-requests/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import UserProfile from '$lib/components/UserProfile.svelte';
	import type { WorkRequest, Contract } from '$lib/types';

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let workRequest: WorkRequest | null = null;
	let isLoading = true;
	let errorMessage = '';
	let workRequestId: string | null = null;
	let existingContract: Contract | null = null;
	let chatMap = new Map<string, string>();

	// For experts/suppliers to express interest
	let isExpressingInterest = false;
	let interestMessage = '';

	// User profiles for invited users
	let invitedExpertProfiles: any[] = [];
	let invitedSupplierProfiles: any[] = [];

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchWorkRequestDetails(id: string) {
		isLoading = true;
		errorMessage = '';
		existingContract = null;
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

			// If the current user is the customer, fetch additional data
			if (currentUser && workRequest && currentUser.id === workRequest.customerId) {
				await Promise.all([fetchChats(), fetchExistingContract(), fetchInvitedUserProfiles()]);
			}
		} catch (err: any) {
			console.error('Fetch work request detail error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function fetchChats() {
		if (!token) return;
		try {
			const chatsRes = await fetch(`${API_BASE_URL}/api/chat`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (chatsRes.ok) {
				const chats = await chatsRes.json();
				const newChatMap = new Map<string, string>();
				for (const chat of chats) {
					const otherParticipant = chat.participants.find((pId: string) => pId !== currentUser?.id);
					if (otherParticipant) {
						newChatMap.set(otherParticipant, chat.id);
					}
				}
				chatMap = newChatMap;
			}
		} catch (error) {
			console.error('Error fetching chats:', error);
		}
	}

	async function fetchExistingContract() {
		if (!token || !workRequest) return;
		try {
			const contractsRes = await fetch(`${API_BASE_URL}/api/contracts`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (contractsRes.ok) {
				const contracts = await contractsRes.json();
				existingContract =
					contracts.find((c: Contract) => c.workRequestId === workRequest?.id) || null;
			}
		} catch (error) {
			console.error('Error fetching contracts:', error);
		}
	}

	async function fetchInvitedUserProfiles() {
		if (!token || !workRequest) return;
		try {
			// Fetch invited experts
			if (workRequest.invitedExperts && workRequest.invitedExperts.length > 0) {
				const expertPromises = workRequest.invitedExperts.map(async (userId: string) => {
					try {
						const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
							headers: { Authorization: `Bearer ${token}` }
						});
						if (response.ok) {
							return await response.json();
						}
					} catch (error) {
						console.error(`Error fetching expert profile ${userId}:`, error);
					}
					return null;
				});
				const experts = await Promise.all(expertPromises);
				invitedExpertProfiles = experts.filter(Boolean);
			}

			// Fetch invited suppliers
			if (workRequest.invitedSuppliers && workRequest.invitedSuppliers.length > 0) {
				const supplierPromises = workRequest.invitedSuppliers.map(async (userId: string) => {
					try {
						const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
							headers: { Authorization: `Bearer ${token}` }
						});
						if (response.ok) {
							return await response.json();
						}
					} catch (error) {
						console.error(`Error fetching supplier profile ${userId}:`, error);
					}
					return null;
				});
				const suppliers = await Promise.all(supplierPromises);
				invitedSupplierProfiles = suppliers.filter(Boolean);
			}
		} catch (error) {
			console.error('Error fetching invited user profiles:', error);
		}
	}

	async function handleExpressInterest() {
		if (!workRequest || !currentUser || !token || currentUser.id === workRequest.customerId) {
			return;
		}

		isExpressingInterest = true;
		interestMessage = '';

		try {
			const response = await fetch(`${API_BASE_URL}/api/users/interest`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					targetUserId: workRequest.customerId,
					workRequestId: workRequest.id,
					initialMessageContent: 'I am interested in your work request.'
				})
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to express interest.');
			}
			interestMessage = result.message || 'Interest expressed successfully!';
			if (result.chatId) setTimeout(() => goto(`/chat/${result.chatId}`), 2000);
		} catch (error: any) {
			console.error('Express interest error:', error);
			interestMessage = `Error: ${error.message}`;
		} finally {
			isExpressingInterest = false;
		}
	}

	onMount(() => {
		workRequestId = $page.params.id;
		let unsubscribe: any;
		if (workRequestId) {
			unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					fetchWorkRequestDetails(workRequestId!);
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated. Cannot load details.';
					isLoading = false;
				}
			});
		} else {
			errorMessage = 'Work Request ID not found in URL.';
			isLoading = false;
		}

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	});

	function formatCurrency(amount?: number) {
		if (!amount && amount !== 0) return 'Budget not specified';
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
	}

	function getStatusClasses(status: string) {
		const classes: Record<string, string> = {
			open: 'bg-green-500/20 text-green-300 border-green-500/50',
			in_discussion: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			awaiting_quotes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
			contracted: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
			in_progress: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
			completed: 'bg-emerald-600/30 text-emerald-300 border-emerald-600/60',
			cancelled: 'bg-red-500/20 text-red-300 border-red-500/50',
			closed: 'bg-slate-600/30 text-slate-400 border-slate-500/50',
			disputed: 'bg-orange-500/20 text-orange-300 border-orange-500/50'
		};
		return classes[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/50';
	}

	// Reactive computed values
	$: isCustomer = currentUser && workRequest && currentUser.id === workRequest.customerId;
	$: isProfessional = currentUser && workRequest && currentUser.id !== workRequest.customerId;
	$: canExpressInterest =
		isProfessional &&
		workRequest &&
		!workRequest.interestedExperts?.includes(currentUser?.id || '') &&
		!workRequest.interestedSuppliers?.includes(currentUser?.id || '') &&
		workRequest.status === 'open';
	$: alreadyInterested =
		isProfessional &&
		workRequest &&
		(workRequest.interestedExperts?.includes(currentUser?.id || '') ||
			workRequest.interestedSuppliers?.includes(currentUser?.id || ''));
	$: interestedProfessionals = workRequest
		? [...(workRequest.interestedExperts || []), ...(workRequest.interestedSuppliers || [])]
		: [];
	$: canCreateContract =
		isCustomer &&
		workRequest &&
		!existingContract &&
		['open', 'in_discussion', 'awaiting_quotes'].includes(workRequest.status);
</script>

<svelte:head>
	<title>{workRequest ? `Work Request: ${workRequest.title}` : 'Work Request'} - GEFIFI</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 pb-12">
	{#if isLoading}
		<div class="flex h-96 items-center justify-center">
			<div class="flex items-center space-x-3">
				<svg
					class="h-8 w-8 animate-spin text-emerald-500"
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
				<p class="text-xl text-slate-300">Loading Work Request...</p>
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
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h2 class="mb-3 text-2xl font-bold text-red-300">Unable to Load Work Request</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={() => goto('/work-requests')}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to Work Requests
			</button>
		</div>
	{:else if workRequest}
		<!-- Header Section -->
		<header
			class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-blue-500/20 p-2">
							<svg
								class="h-6 w-6 text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
						</span>
						<div>
							<h1 class="text-2xl font-bold text-blue-400 lg:text-3xl">{workRequest.title}</h1>
							<p class="text-slate-400">Work Request ID: {workRequest.id.substring(0, 12)}...</p>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class="rounded-full border px-4 py-2 text-sm font-semibold {getStatusClasses(
								workRequest.status
							)}"
						>
							{workRequest.status.replace(/_/g, ' ').toUpperCase()}
						</span>
						{#if workRequest.category}
							<span
								class="rounded-full border border-slate-500/50 bg-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300"
							>
								{workRequest.category}
							</span>
						{/if}
						{#if existingContract}
							<a
								href="/contracts/{existingContract.id}"
								class="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
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
					</div>
				</div>
				<div class="text-right">
					<p class="text-sm text-slate-400">Expected Budget</p>
					<p class="text-lg font-semibold text-emerald-400">
						{formatCurrency(workRequest.expectedCost)}
					</p>
				</div>
			</div>
		</header>

		<!-- Main Content Grid -->
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left Column: Details -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Description -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-sky-500/20 p-2">
							<svg
								class="h-5 w-5 text-sky-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 10h16M4 14h16M4 18h16"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-bold text-sky-300">Project Description</h2>
					</div>
					<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
						{workRequest.description}
					</p>
				</section>

				<!-- Project Details -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-amber-500/20 p-2">
							<svg
								class="h-5 w-5 text-amber-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-bold text-amber-300">Project Details</h2>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Location
							</h3>
							<p class="text-slate-300">{workRequest.location}</p>
						</div>
						{#if workRequest.timeline}
							<div>
								<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
									Timeline
								</h3>
								<p class="text-slate-300">{workRequest.timeline}</p>
							</div>
						{/if}
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Expected Budget
							</h3>
							<p class="text-slate-300">{formatCurrency(workRequest.expectedCost)}</p>
						</div>
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Status
							</h3>
							<span
								class="inline-block rounded-full border px-3 py-1 text-sm font-semibold {getStatusClasses(
									workRequest.status
								)}"
							>
								{workRequest.status.replace(/_/g, ' ').toUpperCase()}
							</span>
						</div>
						{#if workRequest.materialsSuggested}
							<div class="md:col-span-2">
								<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
									Suggested Materials
								</h3>
								<p class="whitespace-pre-wrap text-slate-300">{workRequest.materialsSuggested}</p>
							</div>
						{/if}
						{#if workRequest.category}
							<div>
								<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
									Category
								</h3>
								<span
									class="inline-block rounded-full border border-slate-500/50 bg-slate-600/50 px-3 py-1 text-sm font-medium text-slate-300"
								>
									{workRequest.category}
								</span>
							</div>
						{/if}
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Posted
							</h3>
							<p class="text-slate-300">
								{new Date(workRequest.createdAt).toLocaleDateString('en-GB', {
									dateStyle: 'medium'
								})}
							</p>
						</div>
					</div>
				</section>

				<!-- Project Images -->
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
							<h2 class="text-xl font-bold text-purple-300">Project Images</h2>
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{#each workRequest.images as image, index}
								<div class="group relative overflow-hidden rounded-xl border border-slate-600/30">
									<img
										src={image}
										alt="Work request image {index + 1}"
										class="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
										loading="lazy"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
									>
										<div class="absolute bottom-4 left-4">
											<button
												on:click={() => window.open(image, '_blank')}
												class="rounded-lg bg-white/20 px-3 py-1 text-sm text-white backdrop-blur-sm hover:bg-white/30"
											>
												View Full Size
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>

			<!-- Right Column: Actions & Info -->
			<div class="space-y-6">
				<!-- Express Interest (for professionals) -->
				{#if canExpressInterest}
					<section
						class="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20"
							>
								<svg
									class="h-6 w-6 text-emerald-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-bold text-emerald-300">Interested in this project?</h3>
							<p class="mb-4 text-sm text-slate-300">
								Express your interest to start a conversation with the customer.
							</p>
							<button
								on:click={handleExpressInterest}
								disabled={isExpressingInterest}
								class="w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-500"
							>
								{isExpressingInterest ? 'Sending...' : 'Express Interest'}
							</button>
							{#if interestMessage}
								<p
									class="mt-4 text-sm {interestMessage.startsWith('Error:')
										? 'text-red-400'
										: 'text-emerald-400'}"
								>
									{interestMessage}
								</p>
							{/if}
						</div>
					</section>
				{:else if alreadyInterested}
					<section
						class="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20"
							>
								<svg
									class="h-6 w-6 text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-bold text-blue-300">Interest Expressed</h3>
							<p class="text-sm text-slate-300">
								You have already expressed interest in this project. The customer will contact you
								if interested.
							</p>
						</div>
					</section>
				{/if}

				<!-- Customer Actions -->
				{#if isCustomer}
					<!-- Interested Experts -->
					{#if interestedProfessionals.length > 0}
						<section
							class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
						>
							<div class="mb-4 flex items-center gap-3">
								<div class="rounded-lg bg-green-500/20 p-2">
									<svg
										class="h-5 w-5 text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
										/>
									</svg>
								</div>
								<h2 class="text-lg font-bold text-green-300">
									Interested Experts ({interestedProfessionals.length})
								</h2>
							</div>
							<div class="space-y-3">
								{#each interestedProfessionals as profId (profId)}
									<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-3">
										<div class="mb-2">
											<UserProfile userId={profId} />
										</div>
										<div class="flex gap-1.5">
											{#if chatMap.has(profId)}
												<a
													href="/chat/{chatMap.get(profId)}"
													class="flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-2 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
												>
													<svg
														class="h-3 w-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
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
											{#if canCreateContract}
												<a
													href="/contracts/create?workRequestId={workRequest.id}&expertId={profId}&customerId={workRequest.customerId}"
													class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
												>
													<svg
														class="h-3 w-3"
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
													Contract
												</a>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}

					<!-- Invited Experts -->
					{#if invitedExpertProfiles.length > 0 || invitedSupplierProfiles.length > 0}
						<section
							class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
						>
							<div class="mb-4 flex items-center gap-3">
								<div class="rounded-lg bg-amber-500/20 p-2">
									<svg
										class="h-5 w-5 text-amber-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
								<h2 class="text-lg font-bold text-amber-300">
									Invited Experts ({invitedExpertProfiles.length + invitedSupplierProfiles.length})
								</h2>
							</div>
							<div class="space-y-3">
								{#each [...invitedExpertProfiles, ...invitedSupplierProfiles] as profile (profile.id)}
									<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-3">
										<div class="mb-2">
											<UserProfile userId={profile.id} />
										</div>
										<div class="flex gap-1.5">
											{#if chatMap.has(profile.id)}
												<a
													href="/chat/{chatMap.get(profile.id)}"
													class="flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-2 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
												>
													<svg
														class="h-3 w-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
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
											{#if canCreateContract}
												<a
													href="/contracts/create?workRequestId={workRequest.id}&expertId={profile.id}&customerId={workRequest.customerId}"
													class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
												>
													<svg
														class="h-3 w-3"
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
													Contract
												</a>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}

					<!-- Invite More Experts -->
					{#if workRequest.status === 'open'}
						<section
							class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
						>
							<div class="text-center">
								<div
									class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20"
								>
									<svg
										class="h-6 w-6 text-sky-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										/>
									</svg>
								</div>
								<h3 class="mb-2 text-lg font-bold text-sky-300">Need More Options?</h3>
								<p class="mb-4 text-sm text-slate-300">
									Invite more experts to get additional quotes and options for your project.
								</p>
								<a
									href="/find-professionals?type=expert&request-id={workRequest.id}"
									class="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-600"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
									Find & Invite Experts
								</a>
							</div>
						</section>
					{/if}
				{/if}

				<!-- Request Summary (Customer Only) -->
				{#if isCustomer}
					<section
						class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="rounded-lg bg-slate-500/20 p-2">
								<svg
									class="h-5 w-5 text-slate-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-slate-300">Request Summary</h2>
						</div>
						<div class="space-y-3 text-sm">
							<div class="flex items-center justify-between">
								<span class="text-slate-400">Interested Experts</span>
								<span class="font-medium text-green-300">{interestedProfessionals.length}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-400">Invited Experts</span>
								<span class="font-medium text-amber-300"
									>{(workRequest.invitedExperts?.length || 0) +
										(workRequest.invitedSuppliers?.length || 0)}</span
								>
							</div>
							{#if existingContract}
								<div class="border-t border-slate-600/30 pt-2">
									<a
										href="/contracts/{existingContract.id}"
										class="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/20 p-3 text-emerald-300 transition-colors hover:bg-emerald-500/30"
									>
										<span class="font-medium">View Active Contract</span>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</a>
								</div>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Contract Link (For Experts when contract exists) -->
				{#if isProfessional && existingContract}
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
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-emerald-300">Active Contract</h2>
						</div>
						<a
							href="/contracts/{existingContract.id}"
							class="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/20 p-3 text-emerald-300 transition-colors hover:bg-emerald-500/30"
						>
							<span class="font-medium">View Contract Details</span>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</a>
					</section>
				{/if}
			</div>
		</div>

		<!-- Back Button -->
		<div class="text-center">
			<button
				on:click={() => goto('/home')}
				class="inline-flex items-center gap-2 rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Home
			</button>
		</div>
	{:else}
		<div class="rounded-2xl bg-slate-700/50 p-8 text-center shadow-xl backdrop-blur-sm">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-600/50"
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
					class="lucide lucide-clipboard-icon lucide-clipboard h-8 w-8 text-slate-400"
					><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path
						d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
					/></svg
				>
			</div>
			<h2 class="mb-3 text-xl font-bold text-sky-400">Work Request Not Found</h2>
			<p class="mb-6 text-slate-300">
				The requested work order (ID: {workRequestId || 'Unknown'}) could not be loaded or does not
				exist.
			</p>
			<button
				on:click={() => goto('/home')}
				class="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
			>
				← Back to Home
			</button>
		</div>
	{/if}
</div>
