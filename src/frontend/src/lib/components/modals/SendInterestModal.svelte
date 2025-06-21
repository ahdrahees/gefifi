<!-- gefifi-2/src/frontend/src/lib/components/modals/SendInterestModal.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import apiClient from '$lib/api';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	export let show: boolean = false;
	export let targetProfessionalId: string;
	export let targetProfessionalName: string;

	// Define a simple type for WorkRequest for the dropdown
	type CustomerWorkRequest = {
		id: string;
		title: string;
		status: string;
	};

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

	// For "Discuss Specific Project"
	let customerWorkRequests: CustomerWorkRequest[] = [];
	let isLoadingWorkRequests = false;
	let selectedWorkRequestId: string | undefined = undefined;
	let customMessage: string = '';

	async function fetchCustomerWorkRequests() {
		if (!currentUser || !token || currentUser.userType !== 'customer') return;
		isLoadingWorkRequests = true;
		try {
			// Assuming apiClient.getWorkRequests() fetches all for the user or can be filtered
			// Or, if a specific endpoint exists, use that. For now, filter client-side.
			const allRequests = await apiClient.getWorkRequests(); // This is authed
			customerWorkRequests = allRequests
				.filter((wr) => wr.customerId === currentUser?.id && wr.status === 'open') // Filter for current customer and 'open' status
				.map((wr) => ({ id: wr.id, title: wr.title, status: wr.status }));
		} catch (error: any) {
			console.error('Failed to fetch customer work requests:', error);
			// Silently fail for this non-critical list, or show a small error
		} finally {
			isLoadingWorkRequests = false;
		}
	}

	onMount(() => {
		if (show) {
			// Reset state when modal is shown
			formError = null;
			formSuccess = null;
			selectedWorkRequestId = undefined;
			customMessage = '';
			if (currentUser?.userType === 'customer') {
				fetchCustomerWorkRequests();
			}
		}
	});

	// Re-fetch if modal is reshown and was hidden
	$: if (show && currentUser?.userType === 'customer' && customerWorkRequests.length === 0 && !isLoadingWorkRequests && !formSuccess) {
		fetchCustomerWorkRequests();
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

		if (!customMessage.trim() && !selectedWorkRequestId) {
			formError = "Please write a note or select a project to discuss.";
			isLoading = false;
			return;
		}

		let messageToSend = customMessage.trim();
		if (selectedWorkRequestId && customerWorkRequests.length > 0) {
			const selectedWR = customerWorkRequests.find(wr => wr.id === selectedWorkRequestId);
			if (selectedWR) {
				const wrBlurb = `Regarding project: "${selectedWR.title}"`;
				messageToSend = messageToSend ? `${wrBlurb}. ${messageToSend}` : wrBlurb;
			}
		}
		if (!messageToSend) { // Fallback if only WR was selected but something went wrong with title
			messageToSend = `I'm interested in discussing a project.`;
		}


		try {
			const result = await apiClient.sendInterest({
				targetUserId: targetProfessionalId,
				workRequestId: selectedWorkRequestId, // Optional
				initialMessageContent: messageToSend
			});
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

<GeneralModal {show} title="Send Interest to {targetProfessionalName}" on:close={handleClose} maxWidthClass="max-w-xl">
	<div class="space-y-6">
		{#if formError}
			<div role="alert" class="rounded-md border border-red-600 bg-red-500/20 p-3 text-sm text-red-300">
				{formError}
			</div>
		{/if}
		{#if formSuccess}
			<div role="alert" class="rounded-md border border-emerald-600 bg-emerald-500/20 p-3 text-sm text-emerald-300">
				{formSuccess}
			</div>
		{/if}

		{#if !formSuccess} <!-- Hide form options if successfully submitted -->
			<!-- Option 1: Quick Greeting -->
			<div class="rounded-lg bg-slate-700/50 p-4 shadow">
				<h3 class="mb-2 text-md font-semibold text-sky-300">Quick Greeting</h3>
				<p class="mb-3 text-sm text-slate-300">
					Send a general interest message to start a conversation.
				</p>
				<button
					on:click={handleSendQuickGreeting}
					disabled={isLoading}
					class="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isLoading && !customMessage && !selectedWorkRequestId}Processing...{:else}Send Quick Greeting{/if}
				</button>
			</div>

			<div class="my-4 flex items-center">
				<span class="flex-grow border-t border-slate-600"></span>
				<span class="mx-3 text-xs uppercase text-slate-400">Or</span>
				<span class="flex-grow border-t border-slate-600"></span>
			</div>

			<!-- Option 2: Detailed Interest -->
			<div class="space-y-4 rounded-lg bg-slate-700/50 p-4 shadow">
				<h3 class="text-md font-semibold text-sky-300">Discuss a Specific Project</h3>

				{#if currentUser?.userType === 'customer'}
					<div class="form-group">
						<label for="work-request-select" class="mb-1 block text-sm font-medium text-slate-300"
							>Select an existing project (Optional):</label
						>
						{#if isLoadingWorkRequests}
							<p class="text-xs text-slate-400">Loading your projects...</p>
						{:else if customerWorkRequests.length > 0}
							<select
								id="work-request-select"
								bind:value={selectedWorkRequestId}
								disabled={isLoading}
								class="w-full appearance-none rounded-md border border-slate-600 bg-slate-600 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
								style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;"
							>
								<option value={undefined}>-- None --</option>
								{#each customerWorkRequests as wr (wr.id)}
									<option value={wr.id}>{wr.title} (Status: {wr.status})</option>
								{/each}
							</select>
						{:else}
							<p class="text-xs text-slate-400">You have no open work requests to link.</p>
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
						placeholder="e.g., I'd like to discuss my upcoming renovation..."
					></textarea>
				</div>
				<button
					on:click={handleSendDetailedInterest}
					disabled={isLoading}
					class="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isLoading && (customMessage || selectedWorkRequestId)}Processing...{:else}Send Detailed Interest{/if}
				</button>
			</div>
		{/if} <!-- end !formSuccess block -->
	</div>

	<svelte:fragment slot="footer">
		{#if !formSuccess}
			<div class="border-t border-slate-700 p-4 flex justify-end">
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
