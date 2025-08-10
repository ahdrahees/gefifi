<!-- src/frontend/src/routes/(app)/my-requests/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { WorkRequest, MaterialRequest } from '$lib/types';
	import RequestsTabNavigation from '$lib/components/requests/RequestsTabNavigation.svelte';
	import RequestsList from '$lib/components/requests/RequestsList.svelte';
	import RequestsHeader from '$lib/components/requests/RequestsHeader.svelte';
	import RequestsStats from '$lib/components/requests/RequestsStats.svelte';

	// Types
	type RequestWithType = (WorkRequest | MaterialRequest) & {
		requestType: 'work' | 'material';
		contractInfo?: any;
		chatId?: string;
	};

	type StatusTab = 'active' | 'contracted' | 'completed' | 'on_hold' | 'cancelled';

	// State
	let currentUser: AuthUser | null = null;
	let allRequests: RequestWithType[] = [];
	let isLoading = true;
	let errorMessage = '';

	// Filters and search
	let activeTab: StatusTab = 'active';
	let requestTypeFilter: 'all' | 'work' | 'material' = 'all';
	let searchQuery = '';

	// Current user will be set in onMount

	// Status categorization
	const statusCategories = {
		active: ['open', 'in_discussion', 'awaiting_quotes', 'quoting', 'ordered'],
		contracted: ['contracted', 'signed', 'in_progress'],
		completed: ['completed'],
		on_hold: ['disputed', 'awaiting_signatures', 'revision_requested'],
		cancelled: ['cancelled', 'terminated']
	};

	// Reactive filtered requests
	$: filteredRequests = allRequests
		.filter((req) => {
			// Filter by status tab
			const statusMatch = statusCategories[activeTab].includes(req.status);
			if (!statusMatch) return false;

			// Filter by request type (for customers)
			if (currentUser?.userType === 'customer' && requestTypeFilter !== 'all') {
				if (requestTypeFilter !== req.requestType) return false;
			}

			// Filter by search query
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const titleMatch = req.title.toLowerCase().includes(query);
				const descMatch = req.description.toLowerCase().includes(query);
				const locationMatch = ('location' in req ? req.location : req.deliveryLocation)
					.toLowerCase()
					.includes(query);
				return titleMatch || descMatch || locationMatch;
			}

			return true;
		})
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

	// Stats for each tab
	$: tabStats = {
		active: allRequests.filter((r) => statusCategories.active.includes(r.status)).length,
		contracted: allRequests.filter((r) => statusCategories.contracted.includes(r.status)).length,
		completed: allRequests.filter((r) => statusCategories.completed.includes(r.status)).length,
		on_hold: allRequests.filter((r) => statusCategories.on_hold.includes(r.status)).length,
		cancelled: allRequests.filter((r) => statusCategories.cancelled.includes(r.status)).length
	};

	onMount(() => {
		// Get tab from URL params
		const tab = $page.url.searchParams.get('tab') as StatusTab;
		if (tab && Object.keys(statusCategories).includes(tab)) {
			activeTab = tab;
		}

		// Wait for auth to be ready before fetching requests
		const unsubscribe = authStore.subscribe((auth) => {
			if (auth.user && auth.token && !auth.isLoading) {
				currentUser = auth.user;
				fetchRequests();
			} else if (!auth.isLoading && !auth.user) {
				errorMessage = 'User not authenticated.';
				isLoading = false;
			}
		});

		return () => {
			unsubscribe();
		};
	});

	async function fetchRequests() {
		if (!currentUser) return;

		isLoading = true;
		errorMessage = '';

		try {
			let workRequests: any[] = [];
			let materialRequests: any[] = [];

			if (currentUser.userType === 'customer') {
				// Customers see all their requests
				[workRequests, materialRequests] = await Promise.all([
					apiClient.getWorkRequestsByCustomerId(currentUser.id),
					apiClient.getMaterialRequestsByCustomerId(currentUser.id)
				]);
			} else if (currentUser.userType === 'expert') {
				// Experts see only work requests they're associated with
				const allWorkRequests = await apiClient.getWorkRequests();
				workRequests = allWorkRequests.filter(
					(req) =>
						req.interestedExperts?.includes(currentUser?.id) ||
						req.invitedExperts?.includes(currentUser?.id) ||
						req.status === 'contracted' // TODO: Add logic to check if they have a contract
				);
			} else if (currentUser.userType === 'supplier') {
				// Suppliers see only material requests they're associated with
				const allMaterialRequests = await apiClient.getMaterialRequests();
				materialRequests = allMaterialRequests.filter(
					(req) =>
						req.interestedSuppliers?.includes(currentUser?.id) ||
						req.invitedSuppliers?.includes(currentUser?.id) ||
						req.status === 'contracted' // TODO: Add logic to check if they have a contract
				);
			}

			// Combine and add type information
			allRequests = [
				...workRequests.map((req) => ({ ...req, requestType: 'work' as const })),
				...materialRequests.map((req) => ({ ...req, requestType: 'material' as const }))
			];

			// TODO: Fetch contract and chat information for each request
			await enrichRequestsWithContractInfo();
		} catch (error: any) {
			console.error('Failed to fetch requests:', error);
			errorMessage = error.data?.message || 'Failed to load requests';
		} finally {
			isLoading = false;
		}
	}

	async function enrichRequestsWithContractInfo() {
		if (!currentUser || allRequests.length === 0) return;

		try {
			// Fetch contracts and chats in parallel
			const [contracts, chats] = await Promise.all([
				apiClient.getUserContracts(),
				apiClient.getUserChats()
			]);

			// Create maps for quick lookup
			const contractMap = new Map();
			const chatMap = new Map();

			// Map contracts by request ID
			contracts.forEach((contract: any) => {
				if (contract.workRequestId) {
					contractMap.set(contract.workRequestId, contract);
				}
				if (contract.materialRequestId) {
					contractMap.set(contract.materialRequestId, contract);
				}
			});

			// Map chats by participants (simplified approach)
			chats.forEach((chat: any) => {
				const otherParticipant = chat.participants.find((p: string) => p !== currentUser.id);
				if (otherParticipant) {
					chatMap.set(otherParticipant, chat.id);
				}
			});

			// Enrich requests with contract and chat info
			allRequests = allRequests.map((request) => {
				const contractInfo = contractMap.get(request.id);
				let chatId = null;

				// Find chat ID based on contract or interested users
				if (contractInfo) {
					const otherPartyId =
						contractInfo.customerId === currentUser.id
							? contractInfo.expertSupplierId
							: contractInfo.customerId;
					chatId = chatMap.get(otherPartyId);
				} else if (currentUser.userType === 'customer') {
					// For customers, find chat with interested users
					const interestedUsers =
						request.requestType === 'work'
							? [...(request.interestedExperts || []), ...(request.invitedExperts || [])]
							: [...(request.interestedSuppliers || []), ...(request.invitedSuppliers || [])];

					for (const userId of interestedUsers) {
						if (chatMap.has(userId)) {
							chatId = chatMap.get(userId);
							break;
						}
					}
				} else {
					// For experts/suppliers, find chat with customer
					chatId = chatMap.get(request.customerId);
				}

				return {
					...request,
					contractInfo,
					chatId
				};
			});
		} catch (error) {
			console.error('Failed to enrich requests with contract info:', error);
		}
	}

	function handleTabChange(tab: StatusTab) {
		activeTab = tab;
		// Update URL without navigation
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		window.history.replaceState({}, '', url);
	}

	function handleRequestTypeChange(type: 'all' | 'work' | 'material') {
		requestTypeFilter = type;
	}

	function handleSearch(query: string) {
		searchQuery = query;
	}

	async function handleStatusUpdate(requestId: string, newStatus: string) {
		try {
			// Find the request to determine its type
			const request = allRequests.find((r) => r.id === requestId);
			if (!request) {
				console.error('Request not found for status update');
				return;
			}

			// Update status based on request type
			if (request.requestType === 'work') {
				await apiClient.updateWorkRequestStatus(requestId, newStatus);
			} else {
				await apiClient.updateMaterialRequestStatus(requestId, newStatus);
			}

			// Refresh requests after successful update
			await fetchRequests();
		} catch (error: any) {
			console.error('Failed to update request status:', error);
			// You could show a toast notification here
		}
	}
</script>

<svelte:head>
	<title>My Requests - GEFIFI</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<RequestsHeader
		{currentUser}
		totalRequests={allRequests.length}
		on:createRequest={() => goto('/customer/create-request')}
	/>

	<!-- Stats -->
	<RequestsStats {tabStats} />

	<!-- Tab Navigation -->
	<RequestsTabNavigation
		{activeTab}
		{tabStats}
		{currentUser}
		{requestTypeFilter}
		{searchQuery}
		on:tabChange={(e) => handleTabChange(e.detail)}
		on:typeFilterChange={(e) => handleRequestTypeChange(e.detail)}
		on:search={(e) => handleSearch(e.detail)}
	/>

	<!-- Requests List -->
	<RequestsList
		requests={filteredRequests}
		{currentUser}
		{isLoading}
		{errorMessage}
		on:statusUpdate={(e) => handleStatusUpdate(e.detail.requestId, e.detail.newStatus)}
		on:refresh={fetchRequests}
	/>
</div>
