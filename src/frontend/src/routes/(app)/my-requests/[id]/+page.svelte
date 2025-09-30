<!-- src/frontend/src/routes/(app)/my-requests/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { WorkRequest, MaterialRequest } from '$lib/types';
	import RequestDetailHeader from '$lib/components/requests/RequestDetailHeader.svelte';
	import RequestDetailContent from '$lib/components/requests/RequestDetailContent.svelte';
	import RequestDetailActions from '$lib/components/requests/RequestDetailActions.svelte';
	import RequestDetailTabs from '$lib/components/requests/RequestDetailTabs.svelte';
	import RequestQuotationsTab from '$lib/components/requests/RequestQuotationsTab.svelte';

	let currentUser: AuthUser | null = null;
	let request: (WorkRequest | MaterialRequest) | null = null;
	let requestType: 'work' | 'material' | null = null;
	let isLoading = true;
	let errorMessage = '';

	// Additional data
	let contractInfo: any = null;
	let chatId: string | null = null;
	let interestedUsers: any[] = [];
	let activeTab: 'details' | 'quotations' = 'details';
	let quotesCount: number = 0;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
	});

	$: isCustomer = currentUser && request && currentUser.id === request.customerId;
	$: canEdit = isCustomer && request && request.status === 'open';

	onMount(async () => {
		const requestId = $page.params.id;
		if (!requestId) {
			errorMessage = 'Request ID not found in URL.';
			isLoading = false;
			return;
		}

		await fetchRequestDetails(requestId);
	});

	async function fetchRequestDetails(requestId: string) {
		isLoading = true;
		errorMessage = '';

		try {
			// Try to fetch as work request first
			try {
				const workRequest = await apiClient.getWorkRequestById(requestId);
				request = workRequest as any;
				requestType = 'work';
			} catch {
				// If work request fails, try material request
				const materialRequest = await apiClient.getMaterialRequestById(requestId);
				request = materialRequest as any;
				requestType = 'material';
			}

			if (request) {
				// Fetch additional data
				await Promise.all([
					fetchContractInfo(),
					fetchChatInfo(),
					fetchInterestedUsers(),
					fetchQuotesCount()
				]);
			}
		} catch (error: any) {
			console.error('Failed to fetch request details:', error);
			errorMessage = error.data?.message || 'Could not load request details.';
		} finally {
			isLoading = false;
		}
	}

	async function fetchContractInfo() {
		if (!request) return;

		try {
			const contracts = await apiClient.getUserContracts();
			const relatedContract = contracts.find((contract: any) => {
				if (requestType === 'work') {
					return contract.workRequestId === request?.id;
				} else {
					return contract.materialRequestId === request?.id;
				}
			});
			contractInfo = relatedContract || null;
		} catch (error) {
			console.error('Failed to fetch contract info:', error);
		}
	}

	async function fetchChatInfo() {
		if (!request || !currentUser) return;

		try {
			const chats = await apiClient.getUserChats();

			// Find chat based on contract or interested users
			if (contractInfo) {
				// If there's a contract, find chat with the other party
				const otherPartyId =
					contractInfo.customerId === currentUser.id
						? contractInfo.expertSupplierId
						: contractInfo.customerId;

				const relatedChat = chats.find(
					(chat: any) =>
						chat.participants.includes(otherPartyId) && chat.participants.includes(currentUser!.id)
				);
				chatId = relatedChat?.id || null;
			} else if (currentUser.userType === 'customer') {
				// For customers, find chat with any interested user
				const interestedUsers =
					requestType === 'work'
						? [
								...((request as WorkRequest).interestedExperts || []),
								...((request as WorkRequest).invitedExperts || [])
							]
						: [
								...((request as MaterialRequest).interestedSuppliers || []),
								...((request as MaterialRequest).invitedSuppliers || [])
							];

				for (const userId of interestedUsers) {
					const relatedChat = chats.find(
						(chat: any) =>
							chat.participants.includes(userId) && chat.participants.includes(currentUser!.id)
					);
					if (relatedChat) {
						chatId = relatedChat.id;
						break;
					}
				}
			} else {
				// For experts/suppliers, find chat with customer
				const relatedChat = chats.find(
					(chat: any) =>
						chat.participants.includes(request!.customerId) &&
						chat.participants.includes(currentUser!.id)
				);
				chatId = relatedChat?.id || null;
			}
		} catch (error) {
			console.error('Failed to fetch chat info:', error);
		}
	}

	async function fetchInterestedUsers() {
		if (!request || !isCustomer) return;

		try {
			const userIds =
				requestType === 'work'
					? (request as WorkRequest).interestedExperts || []
					: (request as MaterialRequest).interestedSuppliers || [];

			if (userIds.length > 0) {
				const userPromises = userIds.map((id) => apiClient.getUserById(id));
				interestedUsers = await Promise.all(userPromises);
			}
		} catch (error) {
			console.error('Failed to fetch interested users:', error);
		}
	}

	async function fetchQuotesCount() {
		if (!request || !requestType) return;

		try {
			const response = await apiClient.getQuotesForRequest(request.id, requestType);
			quotesCount = response.quotes?.length || 0;
		} catch (error) {
			console.error('Failed to fetch quotes count:', error);
			quotesCount = 0;
		}
	}

	async function handleStatusUpdate(newStatus: string) {
		if (!request || !requestType) return;

		try {
			// Update status based on request type
			if (requestType === 'work') {
				await apiClient.updateWorkRequestStatus(request.id, newStatus);
			} else {
				await apiClient.updateMaterialRequestStatus(request.id, newStatus);
			}

			// Refresh request details
			await fetchRequestDetails(request.id);
		} catch (error: any) {
			console.error('Failed to update status:', error);
			// The error will be handled by the RequestDetailActions component
		}
	}

	function handleEdit() {
		if (request) {
			goto(`/customer/edit-request/${request.id}`);
		}
	}

	function handleBackToList() {
		goto('/my-requests');
	}

	function handleTabChange(event: CustomEvent) {
		activeTab = event.detail.tab;
	}
</script>

<svelte:head>
	<title>{request ? `${request.title} - My Requests` : 'Request Details'} - GEFIFI</title>
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
				<p class="text-xl text-slate-300">Loading request details...</p>
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
			<h2 class="mb-3 text-2xl font-bold text-red-300">Unable to Load Request</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={handleBackToList}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to My Requests
			</button>
		</div>
	{:else if request && requestType}
		<!-- Back Button -->
		<button
			on:click={handleBackToList}
			class="mb-4 flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 hover:underline"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to My Requests
		</button>

		<!-- Header -->
		<RequestDetailHeader
			{request}
			{requestType}
			{contractInfo}
			canEdit={canEdit || false}
			on:edit={handleEdit}
		/>

		<!-- Tabs -->
		<RequestDetailTabs {activeTab} {quotesCount} on:tabChange={handleTabChange} />

		<!-- Tab Content -->
		{#if activeTab === 'details'}
			<!-- Main Content Grid -->
			<div class="grid gap-6 lg:grid-cols-3">
				<!-- Left Column: Main Content -->
				<div class="lg:col-span-2">
					<RequestDetailContent {request} {requestType} {currentUser} {interestedUsers} />
				</div>

				<!-- Right Column: Actions and Info -->
				<div class="lg:col-span-1">
					<RequestDetailActions
						{request}
						{requestType}
						{currentUser}
						{contractInfo}
						{chatId}
						canEdit={canEdit || false}
						on:statusUpdate={(e) => handleStatusUpdate(e.detail)}
						on:edit={handleEdit}
					/>
				</div>
			</div>
		{:else if activeTab === 'quotations'}
			<!-- Quotations Tab -->
			<RequestQuotationsTab {request} {requestType} {currentUser} />
		{/if}
	{/if}
</div>
