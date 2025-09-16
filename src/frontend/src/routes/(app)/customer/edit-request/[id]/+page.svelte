<!-- src/frontend/src/routes/(app)/customer/edit-request/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { WorkRequest, MaterialRequest } from '$lib/types';
	import EditWorkRequestForm from '$lib/components/forms/EditWorkRequestForm.svelte';
	import EditMaterialRequestForm from '$lib/components/forms/EditMaterialRequestForm.svelte';

	let currentUser: AuthUser | null = null;
	let request: (WorkRequest | MaterialRequest) | null = null;
	let requestType: 'work' | 'material' | null = null;
	let isLoading = true;
	let errorMessage = '';

	authStore.subscribe((auth) => {
		currentUser = auth.user;
	});

	$: canEdit =
		currentUser &&
		request &&
		currentUser.id === request.customerId &&
		request.status === 'open' &&
		currentUser.userType === 'customer';

	onMount(async () => {
		const requestId = $page.params.id;
		if (!requestId) {
			errorMessage = 'Request ID not found in URL.';
			isLoading = false;
			return;
		}

		if (!currentUser) {
			// Wait for auth to load
			const unsubscribe = authStore.subscribe((auth) => {
				if (auth.user && !auth.isLoading) {
					currentUser = auth.user;
					fetchRequestDetails(requestId);
					unsubscribe();
				} else if (!auth.isLoading && !auth.user) {
					goto('/auth/login');
					unsubscribe();
				}
			});
		} else {
			await fetchRequestDetails(requestId);
		}
	});

	async function fetchRequestDetails(requestId: string) {
		isLoading = true;
		errorMessage = '';

		try {
			let workRequestError = null;
			let materialRequestError = null;

			// Try to fetch as work request first
			try {
				console.log('Trying to fetch as work request:', requestId);
				const workRequest = await apiClient.getWorkRequestById(requestId);
				request = workRequest;
				requestType = 'work';
				console.log('Successfully fetched work request:', workRequest);
			} catch (error: any) {
				console.log('Work request fetch failed:', error.data?.message || error.message);
				workRequestError = error;

				// If work request fails, try material request
				try {
					console.log('Trying to fetch as material request:', requestId);
					const materialRequest = await apiClient.getMaterialRequestById(requestId);
					request = materialRequest;
					requestType = 'material';
					console.log('Successfully fetched material request:', materialRequest);
				} catch (error: any) {
					console.log('Material request fetch failed:', error.data?.message || error.message);
					materialRequestError = error;
					// Both requests failed
					throw new Error(
						'Request not found. It may have been deleted or you may not have access to it.'
					);
				}
			}

			// Check if user can edit this request after successfully fetching it
			// Note: canEdit is a reactive statement, so we need to check the conditions manually here
			if (request && currentUser) {
				const isOwner = currentUser.id === request.customerId;
				const isCustomer = currentUser.userType === 'customer';
				const isOpen = request.status === 'open';

				console.log('Permission check:', {
					requestId: request.id,
					requestType,
					requestStatus: request.status,
					currentUserId: currentUser.id,
					requestCustomerId: request.customerId,
					isOwner,
					isCustomer,
					isOpen
				});

				if (!isOwner) {
					errorMessage =
						'You do not have permission to edit this request. Only the request owner can edit it.';
				} else if (!isCustomer) {
					errorMessage = 'Only customers can edit requests.';
				} else if (!isOpen) {
					errorMessage = `This request cannot be edited because its status is "${request.status}". Only open requests can be edited.`;
				}
			}
		} catch (error: any) {
			console.error('Failed to fetch request details:', error);
			errorMessage = error.message || 'Could not load request details.';
		} finally {
			isLoading = false;
		}
	}

	async function handleSave(updatedRequest: any) {
		if (!request || !requestType) return;

		try {
			// Extract file-related data
			const { newFiles, removedFiles, ...requestData } = updatedRequest;

			// Update request based on type
			if (requestType === 'work') {
				await apiClient.updateWorkRequest(request.id, requestData);
			} else {
				await apiClient.updateMaterialRequest(request.id, requestData);

				// Handle file uploads for material requests
				if (newFiles && newFiles.length > 0) {
					const formData = new FormData();
					newFiles.forEach((file: File) => {
						formData.append('files', file);
					});

					try {
						await apiClient.uploadEntityAttachments('material-requests', request.id, formData);
					} catch (fileError: any) {
						console.error('Failed to upload new files:', fileError);
						// Continue anyway since the request was updated successfully
					}
				}

				// Note: File removal is typically handled by the backend when the request is updated
				// The removedFiles array can be used by the backend to clean up unused files
			}

			// Redirect back to request details
			goto(`/my-requests/${request.id}`);
		} catch (error: any) {
			console.error('Failed to update request:', error);
			// Error will be handled by the form component
		}
	}

	function handleCancel() {
		if (request) {
			goto(`/my-requests/${request.id}`);
		} else {
			goto('/my-requests');
		}
	}
</script>

<svelte:head>
	<title>{request ? `Edit ${request.title}` : 'Edit Request'} - GEFIFI</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 pb-12">
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
				<p class="text-xl text-slate-300">Loading request...</p>
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
			<h2 class="mb-3 text-2xl font-bold text-red-300">Cannot Edit Request</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={handleCancel}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to Requests
			</button>
		</div>
	{:else if request && requestType && canEdit}
		<!-- Header -->
		<header
			class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<span class="rounded-xl bg-amber-500/20 p-3">
						<svg
							class="h-6 w-6 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
					</span>
					<div>
						<h1 class="text-2xl font-bold text-amber-400 lg:text-3xl">
							Edit {requestType === 'work' ? 'Work' : 'Material'} Request
						</h1>
						<p class="text-slate-400">{request.title}</p>
					</div>
				</div>

				<button
					on:click={handleCancel}
					class="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600/40"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
					<span class="hidden sm:inline">Cancel</span>
				</button>
			</div>
		</header>

		<!-- Edit Form -->
		{#if requestType === 'work'}
			<EditWorkRequestForm
				workRequest={request}
				on:save={(e) => handleSave(e.detail)}
				on:cancel={handleCancel}
			/>
		{:else}
			<EditMaterialRequestForm
				materialRequest={request}
				on:save={(e) => handleSave(e.detail)}
				on:cancel={handleCancel}
			/>
		{/if}
	{/if}
</div>
