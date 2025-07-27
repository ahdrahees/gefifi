<!-- gefifi-2/src/frontend/src/lib/components/modals/SendInterestModal.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import apiClient from '$lib/api';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser, WorkRequest, MaterialRequest } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let show: boolean = false;
	export let targetProfessionalId: string;
	export let targetProfessionalName: string;
	export let professionalType: 'expert' | 'supplier';

	// A generic type for the dropdown list to handle both request types
	type CustomerRequest = Pick<WorkRequest | MaterialRequest, 'id' | 'title' | 'status'>;

	let currentUser: AuthUser | null = null;
	let token: string | null = null;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	const dispatch = createEventDispatcher();

	let isLoading: boolean = false;
	let formError: string | null = null;
	let formSuccess: string | null = null;

	let isPreselected: boolean = false;
	let customerOpenRequests: CustomerRequest[] = [];
	let isLoadingRequests = false;
	let selectedRequestId: string | undefined = undefined;
	let customMessage: string = '';

	// --- Dynamic UI text based on professional type ---
	$: requestTypeLabel = professionalType === 'expert' ? 'Expert Request' : 'Material Request';
	$: discussLabel = `Discuss a Specific ${requestTypeLabel}`;
	$: placeholderText =
		professionalType === 'expert'
			? "e.g., I'd like to discuss my upcoming renovation..."
			: "e.g., I'm looking for a quote on cement and steel...";

	async function fetchCustomerOpenRequests() {
		if (!currentUser || !token || currentUser.userType !== 'customer') return;
		isLoadingRequests = true;
		try {
			if (professionalType === 'expert') {
				const allRequests = await apiClient.getWorkRequests();
				customerOpenRequests = allRequests
					.filter((wr) => wr.customerId === currentUser?.id && wr.status === 'open')
					.map((wr) => ({ id: wr.id, title: wr.title, status: wr.status }));
			} else {
				// Assumes an equivalent apiClient method for material requests
				const allRequests = await apiClient.getMaterialRequests();
				customerOpenRequests = allRequests
					.filter((mr) => mr.customerId === currentUser?.id && mr.status === 'open')
					.map((mr) => ({ id: mr.id, title: mr.title, status: mr.status }));
			}
		} catch (error: any) {
			console.error(`Failed to fetch customer ${professionalType} requests:`, error);
			// Silently fail for this non-critical list
		} finally {
			isLoadingRequests = false;
		}
	}

	function resetState() {
		formError = null;
		formSuccess = null;
		customMessage = '';
		isLoading = false;

		// URL query params are passed from material/Expert request
		const preselectedId = $page.url.searchParams.get('request-id');
		selectedRequestId = preselectedId || undefined;
		isPreselected = !!preselectedId;

		if (currentUser?.userType === 'customer') {
			fetchCustomerOpenRequests();
		}
	}

	onMount(() => {
		if (show) {
			resetState();
		}
	});

	// Re-fetch if modal is re-shown and was hidden
	$: if (show) {
		resetState();
	}

	async function handleSendQuickGreeting() {
		isLoading = true;
		formError = null;
		formSuccess = null;

		try {
			const result = await apiClient.sendInterest({
				targetUserId: targetProfessionalId,
				predefinedMessageKey: 'CUSTOMER_INTEREST_IN_PROVIDER'
				// workRequestId is not sent for a quick greeting
			});
			formSuccess = result.message || 'Interest sent! Redirecting to chat...';
			dispatch('interestSent', { chatId: result.chatId });
			setTimeout(() => {
				closeModalAndRedirect(result.chatId);
			}, 1500);
		} catch (error: any) {
			formError = error.data?.message || error.message || 'Failed to send quick greeting.';
			isLoading = false;
		}
		// isLoading will be set to false by closing the modal or on error
	}

	async function handleSendDetailedInterest() {
		isLoading = true;
		formError = null;
		formSuccess = null;

		if (!customMessage.trim() && !selectedRequestId) {
			formError = 'Please write a note or select a request to discuss.';
			isLoading = false;
			return;
		}

		let messageToSend = customMessage.trim();
		if (selectedRequestId && customerOpenRequests.length > 0) {
			const selectedRequest = customerOpenRequests.find((req) => req.id === selectedRequestId);
			if (selectedRequest) {
				const reqBlurb = `Regarding ${requestTypeLabel.toLowerCase()}: "${selectedRequest.title}"`;
				messageToSend = messageToSend ? `${reqBlurb}. ${messageToSend}` : reqBlurb;
			}
		}

		if (!messageToSend) {
			messageToSend = `I'm interested in discussing a ${requestTypeLabel.toLowerCase()}.`;
		}

		try {
			const payload: any = {
				targetUserId: targetProfessionalId,
				initialMessageContent: messageToSend
			};

			if (selectedRequestId) {
				if (professionalType === 'expert') {
					payload.workRequestId = selectedRequestId;
				} else {
					payload.materialRequestId = selectedRequestId;
				}
			}

			const result = await apiClient.sendInterest(payload);
			formSuccess = result.message || 'Interest sent! Redirecting to chat...';
			dispatch('interestSent', { chatId: result.chatId });
			setTimeout(() => {
				closeModalAndRedirect(result.chatId);
			}, 1500);
		} catch (error: any) {
			formError = error.data?.message || error.message || 'Failed to send detailed interest.';
			isLoading = false;
		}
	}

	function closeModalAndRedirect(chatId?: string) {
		isLoading = false; // Ensure loading is false before closing
		dispatch('close');
		if (chatId) {
			goto(`/chat/${chatId}`);
		}
	}

	function handleClose() {
		if (isLoading) return; // Don't close if an action is in progress
		dispatch('close');
	}
</script>

<GeneralModal
	{show}
	title="Send Interest to {targetProfessionalName}"
	on:close={handleClose}
	maxWidthClass="max-w-xl"
>
	<div class="space-y-6">
		{#if formError}
			<div
				role="alert"
				class="rounded-md border border-red-600 bg-red-500/20 p-3 text-sm text-red-300"
			>
				{formError}
			</div>
		{/if}
		{#if formSuccess}
			<div
				role="alert"
				class="rounded-md border border-emerald-600 bg-emerald-500/20 p-3 text-sm text-emerald-300"
			>
				{formSuccess}
			</div>
		{/if}

		{#if !formSuccess}
			<!-- Hide form options if successfully submitted -->

			<!-- display only if not preselected by passing URL query parameters -->
			{#if !isPreselected}
				<!-- Option 1: Quick Greeting -->
				<div class="rounded-lg bg-slate-700/50 p-4 shadow">
					<h3 class="text-md mb-2 font-semibold text-sky-300">Quick Greeting</h3>
					<p class="mb-3 text-sm text-slate-300">
						Send a general interest message to start a conversation.
					</p>
					<button
						on:click={handleSendQuickGreeting}
						disabled={isLoading}
						class="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading && !customMessage && !selectedRequestId}Processing...{:else}Send Quick
							Greeting{/if}
					</button>
				</div>

				<div class="my-4 flex items-center">
					<span class="flex-grow border-t border-slate-600"></span>
					<span class="mx-3 text-xs text-slate-400 uppercase">Or</span>
					<span class="flex-grow border-t border-slate-600"></span>
				</div>
			{/if}

			<!-- Option 2: Detailed Interest -->
			<div class="space-y-4 rounded-lg bg-slate-700/50 p-4 shadow">
				<h3 class="text-md font-semibold text-sky-300">{discussLabel}</h3>

				{#if currentUser?.userType === 'customer'}
					<div class="form-group">
						<label for="request-select" class="mb-1 block text-sm font-medium text-slate-300"
							>Select an existing {requestTypeLabel.toLowerCase()} (Optional):</label
						>
						{#if isLoadingRequests}
							<p class="text-xs text-slate-400">Loading your requests...</p>
						{:else if customerOpenRequests.length > 0}
							<select
								id="request-select"
								bind:value={selectedRequestId}
								disabled={isLoading}
								class="w-full appearance-none rounded-md border border-slate-600 bg-slate-600 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
								style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;"
							>
								<option value={undefined}>-- None --</option>
								{#each customerOpenRequests as req (req.id)}
									<option value={req.id}>{req.title} (Status: {req.status})</option>
								{/each}
							</select>
						{:else}
							<p class="text-xs text-slate-400">
								You have no open {requestTypeLabel.toLowerCase()}s to link.
							</p>
						{/if}
					</div>
				{/if}

				<div>
					<label for="custom-message" class="mb-1 block text-sm font-medium text-slate-300"
						>Add a brief note (Optional):</label
					>
					<textarea
						id="custom-message"
						bind:value={customMessage}
						rows="3"
						disabled={isLoading}
						class="w-full rounded-md border border-slate-600 bg-slate-600 px-3 py-2 text-sm text-slate-100 shadow-inner placeholder:text-slate-400/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
						placeholder={placeholderText}
					></textarea>
				</div>
				<button
					on:click={handleSendDetailedInterest}
					disabled={isLoading}
					class="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isLoading && (customMessage || selectedRequestId)}Processing...{:else}Send Detailed
						Interest{/if}
				</button>
			</div>
		{/if}
	</div>

	<svelte:fragment slot="footer">
		{#if !formSuccess}
			<div class="flex justify-end border-t border-slate-700 p-4">
				<button
					type="button"
					on:click={handleClose}
					disabled={isLoading}
					class="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-500 disabled:opacity-70"
				>
					Cancel
				</button>
			</div>
		{/if}
	</svelte:fragment>
</GeneralModal>
