<!-- gefifi-2/src/frontend/src/lib/components/modals/SendInterestModal.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import apiClient, { type UserInterestData } from '$lib/api';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	interface Props {
		show?: boolean;
		targetProfessionalId: string;
		targetProfessionalName: string;
		professionalType: 'expert' | 'supplier';
		onInterestSent?: (detail: { chatId?: string }) => void;
		onClose?: () => void;
	}

	let {
		show = $bindable(false),
		targetProfessionalId,
		targetProfessionalName,
		professionalType,
		onInterestSent,
		onClose
	}: Props = $props();

	// A generic type for the dropdown list to handle both request types
	type CustomerRequest = {
		id: string;
		title: string;
		status: string;
	};

	let currentUser: AuthUser | null = $state(null);
	let token: string | null = null;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	let isLoading: boolean = $state(false);
	let formError: string | null = $state(null);
	let formSuccess: string | null = $state(null);

	let isPreselected: boolean = $state(false);
	let customerOpenRequests: CustomerRequest[] = $state([]);
	let isLoadingRequests = $state(false);
	let selectedRequestId: string | undefined = $state(undefined);
	let customMessage: string = $state('');

	// Determine if this is an invitation or interest based on preselection
	let isInvitation = $derived(isPreselected && selectedRequestId);
	let modalTitle = $derived(
		isInvitation ? `Invite ${targetProfessionalName}` : `Send Interest to ${targetProfessionalName}`
	);

	// --- Dynamic UI text based on professional type and invitation mode ---
	let requestTypeLabel = $derived(
		professionalType === 'expert' ? 'Work Request' : 'Material Request'
	);
	let discussLabel = $derived(
		isInvitation ? `Invite to ${requestTypeLabel}` : `Discuss a Specific ${requestTypeLabel}`
	);
	let placeholderText = $derived(
		professionalType === 'expert'
			? isInvitation
				? "e.g., We'd like to invite you to work on this project..."
				: "e.g., I'd like to discuss my upcoming renovation..."
			: isInvitation
				? "e.g., We'd like to invite you to supply materials for this project..."
				: "e.g., I'm looking for a quote on cement and steel..."
	);

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
				const allRequests = await apiClient.getMaterialRequests();
				customerOpenRequests = allRequests
					.filter(
						(mr) => mr.customerId === currentUser?.id && ['open', 'quoting'].includes(mr.status)
					)
					.map((mr) => ({ id: mr.id, title: mr.title, status: mr.status }));
			}
		} catch (error: unknown) {
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

		// URL query params are passed from material/work request
		const preselectedId = page.url.searchParams.get('request-id');
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
	$effect(() => {
		if (show) {
			resetState();
		}
	});

	async function handleSendQuickGreeting() {
		isLoading = true;
		formError = null;
		formSuccess = null;

		try {
			const result = await apiClient.sendInterest({
				targetUserId: targetProfessionalId,
				predefinedMessageKey: 'CUSTOMER_INTEREST_IN_PROVIDER'
			});
			formSuccess = result.message || 'Interest sent! Redirecting to chat...';
			onInterestSent?.({ chatId: result.chatId });
			setTimeout(() => {
				closeModalAndRedirect(result.chatId);
			}, 1500);
		} catch (error: unknown) {
			formError = error instanceof Error ? error.message : 'Failed to send quick greeting.';
			isLoading = false;
		}
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

		// If a request is selected, send formal invitation
		if (selectedRequestId) {
			await sendInvitation();
		} else {
			await sendInterestMessage();
		}
	}

	async function sendInvitation() {
		try {
			let result;
			if (professionalType === 'expert') {
				result = await apiClient.inviteToWorkRequest(selectedRequestId!, {
					userIds: [targetProfessionalId],
					userType: 'expert'
				});
			} else {
				result = await apiClient.inviteToMaterialRequest(selectedRequestId!, {
					userIds: [targetProfessionalId]
				});
			}

			console.log('Invitation sent successfully:', result);

			// Create a chat with invitation message if one doesn't exist
			const selectedRequest = customerOpenRequests.find((req) => req.id === selectedRequestId);
			let messageToSend = customMessage.trim();

			if (selectedRequest) {
				const reqBlurb = `You've been invited to our ${requestTypeLabel.toLowerCase()}: "${selectedRequest.title}"`;
				messageToSend = messageToSend ? `${reqBlurb}. ${messageToSend}` : reqBlurb;
			}

			if (!messageToSend) {
				messageToSend = `You've been invited to work on our ${requestTypeLabel.toLowerCase()}!`;
			}

			// Send initial message in chat
			try {
				const chatResult = await apiClient.sendInterest({
					targetUserId: targetProfessionalId,
					initialMessageContent: messageToSend,
					...(professionalType === 'expert' && { workRequestId: selectedRequestId }),
					...(professionalType === 'supplier' && { materialRequestId: selectedRequestId })
				});

				formSuccess = `Invitation sent successfully! ${targetProfessionalName} has been invited to your ${requestTypeLabel.toLowerCase()}.`;
				onInterestSent?.({ chatId: chatResult.chatId });
				setTimeout(() => {
					closeModalAndRedirect(chatResult.chatId);
				}, 2000);
			} catch (chatError: unknown) {
				console.error('Failed to send interest message:', chatError);
				// Even if chat creation fails, the invitation was successful
				formSuccess = `Invitation sent successfully! ${targetProfessionalName} has been invited to your ${requestTypeLabel.toLowerCase()}.`;
				onInterestSent?.({});
				setTimeout(() => {
					onClose?.();
				}, 2000);
			}
		} catch (error: unknown) {
			formError = error instanceof Error ? error.message : 'Failed to send invitation.';
			isLoading = false;
		}
	}

	async function sendInterestMessage() {
		let messageToSend = customMessage.trim();

		if (!messageToSend) {
			messageToSend = `I'm interested in discussing a ${requestTypeLabel.toLowerCase()}.`;
		}

		try {
			const payload: UserInterestData = {
				targetUserId: targetProfessionalId,
				initialMessageContent: messageToSend
			};

			const result = await apiClient.sendInterest(payload);
			formSuccess = result.message || 'Interest sent! Redirecting to chat...';
			onInterestSent?.({ chatId: result.chatId });
			setTimeout(() => {
				closeModalAndRedirect(result.chatId);
			}, 1500);
		} catch (error: unknown) {
			formError = error instanceof Error ? error.message : 'Failed to send interest message.';
			isLoading = false;
		}
	}

	function closeModalAndRedirect(chatId?: string) {
		isLoading = false;
		onClose?.();
		if (chatId) {
			goto(`/chat/${chatId}`);
		}
	}

	function handleClose() {
		if (isLoading) return;
		onClose?.();
	}
</script>

<GeneralModal {show} title={modalTitle} onClose={handleClose} maxWidthClass="max-w-xl">
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

			<!-- Show quick greeting option only if not preselected (not an invitation) -->
			{#if !isPreselected}
				<!-- Option 1: Quick Greeting -->
				<div class="rounded-lg bg-slate-700/50 p-4 shadow">
					<h3 class="text-md mb-2 font-semibold text-sky-300">Quick Greeting</h3>
					<p class="mb-3 text-sm text-slate-300">
						Send a general interest message to start a conversation.
					</p>
					<button
						onclick={handleSendQuickGreeting}
						disabled={isLoading}
						class="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading && !customMessage && !selectedRequestId}Processing...{:else}Send Quick
							Greeting{/if}
					</button>
				</div>

				<div class="my-4 flex items-center">
					<div class="grow border-t border-slate-600"></div>
					<span class="mx-3 shrink text-xs font-medium text-slate-400 uppercase">or</span>
					<div class="grow border-t border-slate-600"></div>
				</div>
			{/if}

			<!-- Option 2: Detailed Interest/Invitation -->
			<div class="space-y-4 rounded-lg bg-slate-700/50 p-4 shadow">
				<h3 class="text-md font-semibold text-sky-300">{discussLabel}</h3>

				{#if isInvitation || isPreselected}
					<!-- Show invitation-specific message for preselected requests -->
					<div class="rounded-md border border-emerald-600/30 bg-emerald-500/10 p-3">
						<p class="text-sm text-emerald-300">
							<svg
								class="mr-2 inline h-4 w-4"
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
							You're about to invite {targetProfessionalName} to work on your specific {requestTypeLabel.toLowerCase()}.
						</p>
					</div>
				{/if}

				{#if currentUser?.userType === 'customer'}
					<div class="form-group">
						<label for="request-select" class="mb-1 block text-sm font-medium text-slate-300">
							{isInvitation || isPreselected
								? 'Selected Request:'
								: `Select an existing ${requestTypeLabel.toLowerCase()} (Optional):`}
						</label>
						{#if isLoadingRequests}
							<p class="text-xs text-slate-400">Loading your requests...</p>
						{:else if customerOpenRequests.length > 0}
							<select
								id="request-select"
								bind:value={selectedRequestId}
								disabled={isLoading || isPreselected}
								class="w-full appearance-none rounded-md border border-slate-600 bg-slate-600 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
								style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;"
							>
								{#if !isPreselected}
									<option value={undefined}>-- None --</option>
								{/if}
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
					<label for="custom-message" class="mb-1 block text-sm font-medium text-slate-300">
						{isInvitation || isPreselected
							? 'Invitation message (Optional):'
							: 'Add a brief note (Optional):'}
					</label>
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
					onclick={handleSendDetailedInterest}
					disabled={isLoading}
					class="w-full rounded-md {isInvitation || isPreselected
						? 'bg-emerald-600 hover:bg-emerald-700'
						: 'bg-sky-500 hover:bg-sky-600'} px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isLoading && (customMessage || selectedRequestId)}
						Processing...
					{:else if isInvitation || isPreselected}
						Send Invitation
					{:else}
						Send Detailed Interest
					{/if}
				</button>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		{#if !formSuccess}
			<div class="flex justify-end border-t border-slate-700 p-4">
				<button
					type="button"
					onclick={handleClose}
					disabled={isLoading}
					class="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-500 disabled:opacity-70"
				>
					Cancel
				</button>
			</div>
		{/if}
	{/snippet}
</GeneralModal>
