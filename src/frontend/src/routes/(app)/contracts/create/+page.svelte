<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/create/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import UserProfile from '$lib/components/UserProfile.svelte';
	import ContractForm from '$lib/components/contracts/ContractForm.svelte';
	import type { Unsubscriber } from 'svelte/store';
	import type { WorkRequest, MaterialRequest } from '$lib/types';

	let currentUser: AuthUser | null = null;
	let workRequest: WorkRequest | null = null;
	let materialRequest: MaterialRequest | null = null;
	let professional: any = null;
	let isLoading = true;
	let errorMessage = '';

	// URL parameters
	let workRequestId: string | null = null;
	let materialRequestId: string | null = null;
	let customerId: string | null = null;
	let expertSupplierId: string | null = null;

	// Determine contract type
	$: contractType = workRequestId ? 'Expert Contract' : 'Material Contract';
	$: requestData = workRequestId ? workRequest : materialRequest;
	$: requestTypeLabel = workRequestId ? 'Work Request' : 'Material Request';

	authStore.subscribe((auth) => {
		currentUser = auth.user;
	});

	onMount(() => {
		const urlParams = new URLSearchParams($page.url.search);

		// Get request IDs
		workRequestId = urlParams.get('workRequestId');
		materialRequestId = urlParams.get('materialRequestId');

		// Get expertSupplierId from various possible parameter names
		expertSupplierId =
			urlParams.get('expertSupplierId') ||
			urlParams.get('professionalId') ||
			urlParams.get('expertId') ||
			urlParams.get('supplierId');

		customerId = urlParams.get('customerId');

		// Validation
		if (!workRequestId && !materialRequestId) {
			errorMessage =
				'Either Work Request ID or Material Request ID is required. Please navigate from a valid request or chat.';
			isLoading = false;
			return;
		}

		if (workRequestId && materialRequestId) {
			errorMessage =
				'Cannot create a contract for both a work request and material request simultaneously.';
			isLoading = false;
			return;
		}

		if (!expertSupplierId) {
			errorMessage = 'Expert/Supplier ID is required to create a contract.';
			isLoading = false;
			return;
		}

		if (!customerId) {
			errorMessage = 'Customer ID is required to create a contract.';
			isLoading = false;
			return;
		}

		if ($authStore.user?.userType === 'customer' && $authStore.user?.id !== customerId) {
			errorMessage = 'You are not authorized to create this contract.';
			isLoading = false;
			return;
		}

		if ($authStore.user?.userType !== 'customer' && $authStore.user?.id !== expertSupplierId) {
			errorMessage = 'You are not authorized to create this contract.';
			isLoading = false;
			return;
		}

		// Start fetching data if we have all required info
		fetchData();
	});

	async function fetchData() {
		isLoading = true;
		errorMessage = '';

		try {
			const requests = [];

			// Fetch request data
			if (workRequestId) {
				requests.push(
					apiClient.getWorkRequestById(workRequestId).then((data) => {
						workRequest = data as WorkRequest;
					})
				);
			} else if (materialRequestId) {
				requests.push(
					apiClient.getMaterialRequestById(materialRequestId).then((data) => {
						materialRequest = data as MaterialRequest;
					})
				);
			}

			// Fetch professional data
			requests.push(
				apiClient.getUserById(expertSupplierId!).then((data) => {
					professional = data;
				})
			);

			await Promise.all(requests);

			// Validate that current user is authorized to create this contract
			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			// Throwing error if request data is not found
			if (materialRequest === null && workRequest === null) {
				throw new Error('Request data not found.');
			}

			// Throwing error if current user is not int the queryparam customerId or expertSupplierId
			if (currentUser.id !== customerId && currentUser.id !== expertSupplierId) {
				throw new Error('You are not authorized to create this contract.');
			}

			// Throwing error if queryparam customerId is not same as request customer id
			if (requestData?.customerId !== customerId) {
				throw new Error('Customer ID mismatch with request owner.');
			}

			// Throwing error if queryparam expertSupplierId is not in the MaterialRequest or WorkRequest interested or invited fields
			// For Material Request
			if (
				materialRequest &&
				!materialRequest.interestedSuppliers?.includes(expertSupplierId!) &&
				!materialRequest.invitedSuppliers?.includes(expertSupplierId!)
			) {
				throw new Error(
					'You are not authorized to create this contract. expertSupplierId does not exist in the material request interested or invited fields.'
				);
			}

			// For Work Request
			if (
				workRequest &&
				!workRequest.interestedExperts?.includes(expertSupplierId!) &&
				!workRequest.invitedExperts?.includes(expertSupplierId!)
			) {
				throw new Error(
					'You are not authorized to create this contract. expertSupplierId does not exist in the work request interested or invited fields.'
				);
			}

			// Throwing error if current user is customer and not the owner of the  MaterialRequest or WorkRequest
			if (
				$authStore.user?.userType === 'customer' &&
				$authStore.user?.id !== requestData?.customerId
			) {
				throw new Error(
					'You are not authorized to create this contract. You are not the owner of the request.'
				);
			}

			// Throwing error if current user is expert or supplier and not in the request interested or invited fields
			if ($authStore.user?.userType !== 'customer') {
				// Throwing error if current user id is not in the material request interested or invited fields
				if (
					materialRequest &&
					!materialRequest.interestedSuppliers?.includes($authStore.user?.id!) &&
					!materialRequest.invitedSuppliers?.includes($authStore.user?.id!)
				) {
					throw new Error(
						'You are not authorized to create this contract. You are not in the request interested or invited fields.'
					);
				}

				// Throwing error if current user id is not in the work request interested or invited fields
				if (
					workRequest &&
					!workRequest.interestedExperts?.includes($authStore.user?.id!) &&
					!workRequest.invitedExperts?.includes($authStore.user?.id!)
				) {
					throw new Error(
						'You are not authorized to create this contract. You are not in the request interested or invited fields.'
					);
				}
			}
		} catch (error: any) {
			console.error('Error fetching contract creation data:', error);
			errorMessage = error.message || 'Failed to load contract creation data.';
		} finally {
			isLoading = false;
		}
	}

	function handleContractCreated(event: CustomEvent) {
		const contract = event.detail;
		console.log('Contract created:', contract);

		// Navigate to the created contract
		goto(`/contracts/${contract.id}`);
	}

	function handleGoBack() {
		if (workRequestId) {
			goto(`/work-requests/${workRequestId}`);
		} else if (materialRequestId) {
			goto(`/material-requests/${materialRequestId}`);
		} else {
			history.back();
		}
	}
</script>

<svelte:head>
	<title>Create {contractType} | GEFIFI</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8">
	<header class="text-center">
		<h1 class="text-3xl font-bold text-emerald-400 sm:text-4xl">Create {contractType}</h1>
		<p class="mt-2 text-slate-400">Finalize the details of your agreement.</p>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<svg
				class="h-10 w-10 animate-spin text-emerald-500"
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
			<span class="ml-3 text-lg text-slate-300">Loading details...</span>
		</div>
	{:else if errorMessage}
		<div class="rounded-lg border border-red-600 bg-red-700/30 p-6 text-center shadow-xl">
			<h2 class="mb-3 text-2xl font-semibold text-red-300">Error</h2>
			<p class="mb-4 text-red-400">{errorMessage}</p>
			<button
				on:click={handleGoBack}
				class="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition-colors hover:bg-sky-600"
			>
				Go Back
			</button>
		</div>
	{:else if requestData && professional}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Left Sidebar: Summary -->
			<div class="space-y-6 lg:col-span-1">
				<!-- Request Summary -->
				<section class="rounded-xl bg-slate-800/50 p-6">
					<h2 class="mb-3 text-xl font-semibold text-sky-300">{requestTypeLabel}</h2>
					<div class="space-y-2">
						<p class="font-bold text-slate-200">{requestData.title}</p>
						<p class="text-sm text-slate-400">{requestData.description}</p>
						{#if workRequestId}
							<a
								href={`/work-requests/${workRequestId}`}
								class="inline-block text-sm text-emerald-400 hover:underline"
							>
								View original request →
							</a>
						{:else if materialRequestId}
							<a
								href={`/material-requests/${materialRequestId}`}
								class="inline-block text-sm text-emerald-400 hover:underline"
							>
								View original request →
							</a>
						{/if}
					</div>
				</section>

				<!-- Professional Summary -->
				<section class="rounded-xl bg-slate-800/50 p-6">
					<h2 class="mb-3 text-xl font-semibold text-sky-300">
						{professional.userType === 'expert' ? 'Expert' : 'Supplier'}
					</h2>
					<UserProfile userId={expertSupplierId!} />
				</section>

				<!-- Status Info -->
				<section class="rounded-xl bg-slate-800/50 p-6">
					<h2 class="mb-3 text-xl font-semibold text-sky-300">Contract Info</h2>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-400">Request Status:</span>
							<span class="text-slate-200 capitalize">{requestData.status}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Contract Type:</span>
							<span class="text-slate-200">{contractType}</span>
						</div>
						{#if workRequest?.expectedCost}
							<div class="flex justify-between">
								<span class="text-slate-400">Expected Cost:</span>
								<span class="text-slate-200">₹{workRequest.expectedCost.toLocaleString()}</span>
							</div>
						{/if}
					</div>
				</section>
			</div>

			<!-- Main Content: Contract Form -->
			<div class="lg:col-span-3">
				<ContractForm
					workRequestId={workRequestId || undefined}
					materialRequestId={materialRequestId || undefined}
					customerId={customerId!}
					expertSupplierId={expertSupplierId!}
					on:contractCreated={handleContractCreated}
				/>
			</div>
		</div>
	{:else}
		<div class="rounded-lg border border-yellow-600 bg-yellow-700/30 p-6 text-center shadow-xl">
			<h2 class="mb-3 text-2xl font-semibold text-yellow-300">Loading Issue</h2>
			<p class="mb-4 text-yellow-400">Unable to load request or professional data.</p>
			<button
				on:click={handleGoBack}
				class="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition-colors hover:bg-sky-600"
			>
				Go Back
			</button>
		</div>
	{/if}
</div>
