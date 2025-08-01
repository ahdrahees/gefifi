<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import apiClient from '$lib/api';
	import type { MaterialRequest } from '$lib/types';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import AttachmentList from '$lib/components/AttachmentList.svelte';
	import UserProfile from '$lib/components/UserProfile.svelte';
	import { API_BASE_URL } from '$lib/config';

	// Define UserProfile type
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			fullName?: string;
			companyName?: string;
			expertise?: string;
			category?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	let request: MaterialRequest | null = null;
	let isLoading = true;
	let errorMessage = '';

	// For supplier interest
	let isExpressingInterest = false;
	let interestMessage = '';

	// Supplier management state
	let invitedSupplierProfiles: UserProfile[] = [];
	let chatMap = new Map<string, string>();
	let existingContract: any = null;

	// Reactive computed values
	$: isCustomer = currentUser && request && currentUser.id === request.customerId;
	$: isSupplier = currentUser && request && currentUser.id !== request.customerId;
	$: canExpressInterest =
		isSupplier &&
		request &&
		!request.interestedSuppliers?.includes(currentUser?.id || '') &&
		request.status === 'open';
	$: alreadyInterested =
		isSupplier && request && request.interestedSuppliers?.includes(currentUser?.id || '');
	$: interestedSuppliers = request ? request.interestedSuppliers || [] : [];
	$: canCreateContract =
		isCustomer && request && !existingContract && ['open', 'quoting'].includes(request.status);

	onMount(async () => {
		const requestId = $page.params.id;
		if (!requestId) {
			errorMessage = 'No request ID found in the URL.';
			isLoading = false;
			return;
		}

		try {
			request = (await apiClient.getMaterialRequestById(requestId)) as MaterialRequest;
			if (request && currentUser && currentUser.id === request.customerId) {
				await Promise.all([
					fetchInvitedSupplierProfiles(),
					fetchChatMappings(),
					fetchExistingContract()
				]);
			}
		} catch (error: any) {
			console.error('Failed to fetch material request:', error);
			errorMessage = error.data?.message || 'Could not load the material request.';
		} finally {
			isLoading = false;
		}
	});

	async function fetchInvitedSupplierProfiles() {
		if (!request?.invitedSuppliers || !token) return;

		try {
			const profiles = await Promise.all(
				request.invitedSuppliers.map(async (supplierId) => {
					const response = await fetch(`${API_BASE_URL}/api/users/${supplierId}`, {
						headers: { Authorization: `Bearer ${token}` }
					});
					if (response.ok) {
						return await response.json();
					}
					return null;
				})
			);
			invitedSupplierProfiles = profiles.filter(Boolean);
		} catch (error) {
			console.error('Failed to fetch invited supplier profiles:', error);
		}
	}

	async function fetchChatMappings() {
		if (!request || !token) return;

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const chats = await response.json();

				console.log('chats', chats);
				const newChatMap = new Map();
				chats.forEach((chat: any) => {
					const otherParticipant = chat.participants.find((p: string) => p !== currentUser?.id);
					if (otherParticipant) {
						newChatMap.set(otherParticipant, chat.id);
					}
				});
				chatMap = newChatMap;
			}
		} catch (error) {
			console.error('Failed to fetch chat mappings:', error);
		}
	}

	async function fetchExistingContract() {
		if (!request || !token) return;

		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const contracts = await response.json();
				existingContract = contracts.find(
					(contract: any) => request && contract.materialRequestId === request.id
				);
			}
		} catch (error) {
			console.error('Failed to fetch existing contracts:', error);
		}
	}

	async function handleExpressInterest() {
		if (!request || !currentUser || currentUser.userType !== 'supplier') return;

		isExpressingInterest = true;
		interestMessage = '';
		try {
			const result = await apiClient.sendInterest({
				targetUserId: request.customerId,
				materialRequestId: request.id,
				predefinedMessageKey: 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST'
			});
			interestMessage = result.message || 'Interest sent successfully!';
			await fetchRequestDetails(request.id);
			setTimeout(() => {
				goto(`/chat/${result.chatId}`);
			}, 2000);
		} catch (error: any) {
			interestMessage = error.data?.message || 'Failed to send interest.';
		} finally {
			isExpressingInterest = false;
		}
	}

	async function fetchRequestDetails(id: string) {
		try {
			request = (await apiClient.getMaterialRequestById(id)) as MaterialRequest;
		} catch (error: any) {
			console.error('Failed to fetch material request:', error);
			errorMessage = error.data?.message || 'Could not load the material request.';
		}
	}

	function formatDate(dateString: string | undefined) {
		if (!dateString) return 'Not specified';
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatCurrency(amount?: number) {
		if (!amount && amount !== 0) return 'Not specified';
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
	}

	function getStatusClasses(status: string) {
		const classes = {
			open: 'bg-green-500/20 text-green-300 border-green-500/50',
			quoting: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
			contracted: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
			completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
			cancelled: 'bg-red-500/20 text-red-300 border-red-500/50'
		};
		return (
			classes[status as keyof typeof classes] ||
			'bg-slate-500/20 text-slate-300 border-slate-500/50'
		);
	}
</script>

<svelte:head>
	<title>{request ? `Material Request: ${request.title}` : 'Material Request'} - GEFIFI</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 pb-12">
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
				<p class="text-xl text-slate-300">Loading Material Request...</p>
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
			<h2 class="mb-3 text-2xl font-bold text-red-300">Unable to Load Material Request</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={() => goto('/material-requests')}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to Material Requests
			</button>
		</div>
	{:else if request}
		<!-- Header Section -->
		<header
			class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-emerald-500/20 p-2">
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
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</span>
						<div>
							<h1 class="text-2xl font-bold text-emerald-400 lg:text-3xl">{request.title}</h1>
							<p class="text-slate-400">Material Request ID: {request.id.substring(0, 12)}...</p>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class="rounded-full border px-4 py-2 text-sm font-semibold {getStatusClasses(
								request.status
							)}"
						>
							{request.status.toUpperCase()}
						</span>
						<span
							class="rounded-full border border-slate-500/50 bg-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300"
						>
							Material Request
						</span>
						{#if request.linkedWorkRequestId}
							<a
								href="/work-requests/{request.linkedWorkRequestId}"
								class="rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
							>
								Linked to Work Request
							</a>
						{/if}
					</div>
				</div>
				<div class="text-right">
					<p class="text-sm text-slate-400">Created</p>
					<p class="text-lg font-semibold text-slate-200">
						{formatDate(request.createdAt)}
					</p>
				</div>
			</div>
		</header>

		<!-- Main Content Grid -->
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left Column: Main Details -->
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
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h2 class="text-lg font-bold text-sky-300">Description</h2>
					</div>
					<p class="leading-relaxed text-slate-300">{request.description}</p>
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
						<h2 class="text-lg font-bold text-purple-300">Requested Items</h2>
					</div>
					<div class="space-y-3">
						{#each request.items as item, index (index)}
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
				{#if request.attachments && request.attachments.length > 0}
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
							<h2 class="text-lg font-bold text-orange-300">Attachments</h2>
						</div>
						<AttachmentList attachments={request.attachments} />
					</section>
				{/if}
			</div>

			<!-- Right Column: Details & Actions -->
			<div class="space-y-6">
				<!-- Request Details -->
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
								{request.status.toUpperCase()}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-slate-400">Delivery Location</span>
							<span class="text-right text-sm font-medium text-slate-200"
								>{request.deliveryLocation}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-slate-400">Delivery Date</span>
							<span class="text-right text-sm font-medium text-slate-200"
								>{formatDate(request.deliveryDate)}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-slate-400">Posted</span>
							<span class="text-right text-sm font-medium text-slate-200"
								>{formatDate(request.createdAt)}</span
							>
						</div>
						{#if isCustomer}
							<div class="space-y-2 border-t border-slate-600 pt-3">
								<div class="flex items-center justify-between">
									<span class="text-slate-400">Interested Suppliers</span>
									<span class="text-right text-sm font-medium text-emerald-300"
										>{interestedSuppliers.length}</span
									>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-slate-400">Invited Suppliers</span>
									<span class="text-right text-sm font-medium text-amber-300"
										>{invitedSupplierProfiles.length}</span
									>
								</div>
							</div>
						{/if}
					</div>
				</section>

				<!-- Express Interest (for suppliers) -->
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
							<h3 class="mb-2 text-xl font-bold text-emerald-300">Ready to supply materials?</h3>
							<p class="mb-4 text-sm text-slate-300">
								Connect with the customer to discuss pricing, delivery, and material specifications
								for this request.
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
								You have already expressed interest in this material request. The customer will
								contact you to discuss supply details.
							</p>
						</div>
					</section>
				{/if}

				<!-- Interested Suppliers -->
				{#if isCustomer && interestedSuppliers.length > 0}
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
								Interested Suppliers ({interestedSuppliers.length})
							</h2>
						</div>
						<div class="space-y-3">
							{#each interestedSuppliers as supplierId (supplierId)}
								<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-3">
									<div class="mb-2">
										<UserProfile userId={supplierId} />
									</div>
									<div class="flex gap-1.5">
										{#if chatMap.has(supplierId)}
											<a
												href="/chat/{chatMap.get(supplierId)}"
												class="flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-2 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
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
										{#if canCreateContract}
											<a
												href="/contracts/create?materialRequestId={request.id}&expertSupplierId={supplierId}"
												class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
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
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Invited Suppliers -->
				{#if isCustomer && invitedSupplierProfiles.length > 0}
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
								Invited Suppliers ({invitedSupplierProfiles.length})
							</h2>
						</div>
						<div class="space-y-3">
							{#each invitedSupplierProfiles as profile (profile.id)}
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
										{#if canCreateContract}
											<a
												href="/contracts/create?materialRequestId={request.id}&expertSupplierId={profile.id}"
												class="flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
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
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Call to Action for more suppliers -->
				{#if isCustomer && request.status === 'open'}
					<section
						class="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-600/20 p-6 shadow-xl backdrop-blur-sm"
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
							<h2 class="mb-2 text-xl font-bold text-sky-300">Need More Options?</h2>
							<p class="mb-4 text-sm text-slate-300">
								Invite more suppliers to get additional quotes and options for your project.
							</p>
							<a
								href="/find-professionals?type=supplier&request-id={request.id}"
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
								Find & Invite Suppliers
							</a>
						</div>
					</section>
				{/if}

				<!-- Show Active Contract for Suppliers -->
				{#if isSupplier && existingContract}
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
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-emerald-300">Active Contract</h2>
						</div>
						<a
							href="/contracts/{existingContract.id}"
							class="block w-full rounded-xl bg-emerald-500 px-6 py-3 text-center font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl"
						>
							View Contract Details
						</a>
					</section>
				{/if}
			</div>
		</div>
	{/if}
</div>
