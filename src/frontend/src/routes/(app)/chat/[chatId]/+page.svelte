<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import ContractModal from '$lib/components/contracts/ContractModal.svelte';

	// Define UserProfile, similar to other pages, ensure it matches backend structure
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile: {
			fullName?: string;
			companyName?: string;
			expertise?: string; // For experts
			category?: string; // For suppliers (e.g., material category)
			location?: string;
			avatarUrl?: string;
		};
	};

	// Define Chat structure
	type Chat = {
		id: string;
		participants: string[];
		workRequestId?: string;
		createdAt: string;
		updatedAt: string;
	};

	type Message = {
		id: string;
		chatId: string;
		senderId: string;
		content: string;
		timestamp: string;
		images?: string[];
		// Potentially add sender details like name/avatar if fetched
		senderName?: string;
		senderAvatar?: string;
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let messages: Message[] = [];
	let isLoading = true;
	let errorMessage = '';
	let chatId: string | null = null;
	let newMessageContent = '';
	let isSendingMessage = false;

	// Image Upload State
	let fileInput: HTMLInputElement;
	let selectedFile: File | null = null;
	let uploadedImagePath: string | null = null;
	let isUploadingImage = false;

	// Chat details and participant info
	let currentChatDetails: Chat | null = null;
	let otherParticipantProfile: UserProfile | null = null;
	let chatPageTitle = 'Chat'; // Dynamic title for the chat page

	// Contract Modal State
	let showContractModal = false;
	type ContractModalProps = {
		workRequestId?: string;
		customerId: string;
		expertSupplierId: string;
	};
	let contractModalProps: ContractModalProps | null = null;

	// For auto-scrolling
	let messagesContainer: HTMLElement;
	let shouldScrollToBottom = false;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function loadChatAndParticipantDetails(cId: string) {
		if (!token || !currentUser) {
			errorMessage = 'User or token not available for fetching chat details.';
			isLoading = false;
			return;
		}
		try {
			// 1. Fetch all chats for the current user (or a specific chat by ID if API supports)
			const chatsResponse = await fetch(`${API_BASE_URL}/api/chat`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!chatsResponse.ok) throw new Error('Failed to fetch chat list to find current chat.');
			const allUserChats: Chat[] = await chatsResponse.json();
			
			const foundChat = allUserChats.find(chat => chat.id === cId);
			if (!foundChat) {
				errorMessage = 'Chat details not found.';
				isLoading = false;
				return;
			}
			currentChatDetails = foundChat;

			// 2. Identify other participant
			const otherParticipantId = currentChatDetails.participants.find(pId => pId !== currentUser!.id);

			if (otherParticipantId) {
				// 3. Fetch other participant's profile
				const userProfileResponse = await fetch(`${API_BASE_URL}/api/users/${otherParticipantId}`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (!userProfileResponse.ok) throw new Error(`Failed to fetch profile for participant ${otherParticipantId}.`);
				otherParticipantProfile = await userProfileResponse.json();
				
				// 4. Set dynamic page title
				if (otherParticipantProfile?.profile) {
					chatPageTitle = `Chat with ${otherParticipantProfile.profile.fullName || otherParticipantProfile.profile.companyName || 'User'}`;
				} else {
					chatPageTitle = `Chat with User ${otherParticipantId.substring(0,6)}...`;
				}
			} else {
				chatPageTitle = 'Chat (Personal Notes or Group)'; // Or handle as error if 1-on-1 expected
			}

		} catch (err: any) {
			console.error('Error loading chat/participant details:', err);
			// Keep existing errorMessage or update if more specific
			if (!errorMessage) errorMessage = err.message || 'Error loading chat context.';
		}
	}

	async function fetchMessages(cId: string) {
		isLoading = true;
		// errorMessage = ''; // Keep previous error message if chat details failed to load
		if (!token) {
			errorMessage = 'Authentication token not available.';
			isLoading = false;
			return;
		}
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${cId}/messages`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to fetch messages.' }));
				throw new Error(errorData.message);
			}
			const fetchedMessages = await response.json();
			// TODO: Enrich messages with sender details (name, avatar) by fetching user profiles based on senderId
			// This is a common N+1 problem, so backend might ideally provide sender details with messages.
			messages = fetchedMessages.map((msg: any) => ({ ...msg }));
			shouldScrollToBottom = true; // Scroll after messages are loaded
		} catch (err: any) {
			console.error('Fetch messages error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function handleSendMessage() {
		if (!newMessageContent.trim() || !chatId || !token || !currentUser) return;
		isSendingMessage = true;
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ 
					content: newMessageContent.trim(),
					...(uploadedImagePath && { images: [uploadedImagePath] })
				})
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to send message.' }));
				throw new Error(errorData.message);
			}
			const sentMessage = await response.json();
			messages = [...messages, sentMessage];
			newMessageContent = '';
			uploadedImagePath = null; // Clear uploaded image path
			selectedFile = null; // Clear selected file
			if (fileInput) fileInput.value = ''; // Reset file input
			shouldScrollToBottom = true; // Scroll after new message is added
		} catch (err: any) {
			console.error('Send message error:', err);
			// Display error to user, maybe a toast notification
			alert(`Error sending message: ${err.message}`);
		} finally {
			isSendingMessage = false;
		}
	}

	onMount(() => {
		chatId = $page.params.chatId;
		if (chatId) {
			const unsubscribeAuth = authStore.subscribe(async (auth) => { // Make callback async
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					// Fetch messages and chat details
					await fetchMessages(chatId!); // Keep this to load messages
					await loadChatAndParticipantDetails(chatId!); // Load chat context
					unsubscribeAuth(); 
					// TODO: Implement polling or WebSocket for real-time messages
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated or details missing.';
					isLoading = false;
					unsubscribeAuth(); 
				}
			});
		} else {
			errorMessage = 'Chat ID not found in URL.';
			isLoading = false;
		}
	});

	afterUpdate(() => {
		if (shouldScrollToBottom && messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
			shouldScrollToBottom = false;
		}
	});

	function formatDate(timestamp: string) {
		if (!timestamp) return '';
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Placeholder function to get sender name - ideally fetched and stored with message or user store
	function getSenderName(senderId: string): string {
		if (senderId === currentUser?.id) return 'You';
		// TODO: Fetch other user's name based on senderId
		// For now, returning a generic name or part of ID
		// Could be enhanced if `otherParticipantProfile` is used for non-current user's messages
		if (otherParticipantProfile && senderId === otherParticipantProfile.id) {
			return otherParticipantProfile.profile?.fullName || otherParticipantProfile.profile?.companyName || `Participant ${senderId.substring(0,6)}`;
		}
		return `User ${senderId.substring(0, 6)}...`;
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	async function handleFileSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedFile = input.files[0];
			await uploadSelectedImage();
		}
	}

	async function uploadSelectedImage() {
		if (!selectedFile || !token) return;
		isUploadingImage = true;
		errorMessage = ''; // Clear previous errors

		const formData = new FormData();
		formData.append('file', selectedFile);

		try {
			const response = await fetch(`${API_BASE_URL}/api/upload`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
					// Content-Type is set automatically by browser for FormData
				},
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Failed to upload image.' }));
				throw new Error(errorData.message);
			}
			const result = await response.json();
			uploadedImagePath = result.filePath; // Store the path returned by the backend
		} catch (err: any) {
			console.error('Image upload error:', err);
			errorMessage = `Image upload failed: ${err.message}`;
			uploadedImagePath = null; // Clear path on error
			selectedFile = null; // Clear selected file on error
			if(fileInput) fileInput.value = ''; // Reset file input
		} finally {
			isUploadingImage = false;
		}
	}

	function removeSelectedImage() {
		selectedFile = null;
		uploadedImagePath = null;
		if (fileInput) fileInput.value = ''; // Reset file input to allow re-selection of the same file
	}

	function openCreateContractModal() {
		if (!currentUser || !currentChatDetails || !otherParticipantProfile) {
			alert('Cannot create contract: User, chat, or participant details missing.');
			return;
		}

		let determinedCustomerId: string | null = null;
		let determinedExpertSupplierId: string | null = null;

		if (currentUser.userType === 'customer' && (otherParticipantProfile.userType === 'expert' || otherParticipantProfile.userType === 'supplier')) {
			determinedCustomerId = currentUser.id;
			determinedExpertSupplierId = otherParticipantProfile.id;
		} else if (otherParticipantProfile.userType === 'customer' && (currentUser.userType === 'expert' || currentUser.userType === 'supplier')) {
			determinedCustomerId = otherParticipantProfile.id;
			determinedExpertSupplierId = currentUser.id;
		} else {
			alert('Contract can only be created between a Customer and an Expert/Supplier.');
			return;
		}

		contractModalProps = {
			workRequestId: currentChatDetails.workRequestId,
			customerId: determinedCustomerId,
			expertSupplierId: determinedExpertSupplierId
		};
		showContractModal = true;
	}

	$: canCreateContract = currentUser && otherParticipantProfile && currentChatDetails &&
		( (currentUser.userType === 'customer' && (otherParticipantProfile.userType === 'expert' || otherParticipantProfile.userType === 'supplier')) ||
		  (otherParticipantProfile.userType === 'customer' && (currentUser.userType === 'expert' || currentUser.userType === 'supplier')) );

</script>

<div
	class="mx-auto flex h-[calc(100vh-var(--header-height,10rem))] max-w-3xl flex-col overflow-hidden rounded-t-lg bg-slate-800 shadow-xl"
>
	<!-- Chat Header (Optional - could show other participant's name) -->
	<header class="sticky top-0 z-10 border-b border-slate-700 bg-slate-700/50 p-4">
		<div class="flex items-center space-x-3">
			<button
				on:click={() => goto('/chat')}
				class="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-slate-600 hover:text-emerald-400"
				aria-label="Back to chats"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-6 w-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
				</svg>
			</button>
			<h2 class="truncate text-xl font-semibold text-emerald-400">
				{chatPageTitle}
				{#if chatId && chatPageTitle === 'Chat'}<span class="ml-2 text-xs text-slate-500">ID: {chatId.substring(0, 8)}...</span>{/if}
			</h2>
			<div class="ml-auto">
				{#if canCreateContract}
					<button
						on:click={openCreateContractModal}
						class="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-600"
						title="Create a new contract with this user"
					>
						<!-- Three-dot Icon or Text -->
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="hidden h-5 w-5 sm:inline-block sm:mr-1">
  							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
						<span class="sm:inline">New Contract</span>
						<!-- Or use a three-dot icon:
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
						</svg> -->
					</button>
				{/if}
			</div>
		</div>
	</header>

	<!-- Messages Area -->
	<div
		bind:this={messagesContainer}
		class="flex-1 space-y-4 overflow-y-auto bg-slate-800 p-4 sm:p-6"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<svg
					class="h-8 w-8 animate-spin text-emerald-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					><circle class="opacity-75" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle><path
						class="opacity-50"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path></svg
				>
				<p class="ml-3 text-slate-300">Loading messages...</p>
			</div>
		{:else if errorMessage}
			<div class="rounded-md bg-red-700/20 p-6 text-center text-red-300">
				<p class="font-semibold">Error: {errorMessage}</p>
				<button
					on:click={() => fetchMessages(chatId!)}
					class="mt-3 rounded-md bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600"
					>Try Again</button
				>
			</div>
		{:else if messages.length === 0}
			<div class="py-10 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="mx-auto mb-3 h-12 w-12 text-slate-500"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12H21zM5.25 12C5.25 9.103 7.353 6.75 10.125 6.75s4.875 2.353 4.875 5.25H5.25z"
					/>
				</svg>
				<p class="text-slate-400">No messages in this chat yet. Send the first one!</p>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<div
					class="flex flex-col space-y-0.5 {message.senderId === currentUser?.id
						? 'items-end'
						: 'items-start'}"
				>
					<div
						class="max-w-md rounded-xl px-4 py-2.5 shadow-md {message.senderId === currentUser?.id
							? 'rounded-br-none bg-emerald-600 text-white'
							: 'rounded-bl-none bg-slate-600 text-slate-100'}"
					>
						{#if message.images && message.images.length > 0}
							<div class="mb-1.5 flex flex-wrap gap-2">
								{#each message.images as imageSrc (imageSrc)}
									<img
										src={imageSrc.startsWith('http') ? imageSrc : API_BASE_URL.replace('/api', '') + imageSrc} 
										alt="Chat attachment"
										class="max-h-48 max-w-xs cursor-pointer rounded-md border border-slate-500 object-contain"
										on:click={() => window.open(imageSrc.startsWith('http') ? imageSrc : API_BASE_URL.replace('/api', '') + imageSrc, '_blank')}
										loading="lazy"
									/>
								{/each}
							</div>
						{/if}
						{#if message.content && message.content.trim()}
						    <p class="break-words whitespace-pre-wrap">{message.content}</p>
                        {/if}
					</div>
					<div
						class="px-1 text-xs {message.senderId === currentUser?.id
							? 'text-right text-slate-500'
							: 'text-left text-slate-400'}"
					>
						<span>{getSenderName(message.senderId)}</span> at
						<span>{formatDate(message.timestamp)}</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Message Input Area -->
	<div class="sticky bottom-0 border-t border-slate-700 bg-slate-700/50 p-3 sm:p-4">
		<!-- Image Preview and Remove Button -->
		{#if uploadedImagePath && !isUploadingImage}
			<div class="mb-2 flex items-center space-x-2 rounded-md bg-slate-600/80 p-2 shadow">
				<img src={uploadedImagePath.startsWith('http') ? uploadedImagePath : API_BASE_URL.replace('/api', '') + uploadedImagePath} alt="Preview" class="h-12 w-12 rounded object-cover" />
				<span class="truncate text-xs text-slate-300">{selectedFile?.name || 'Uploaded Image'}</span>
				<button
					type="button"
					on:click={removeSelectedImage}
					class="ml-auto rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-500 hover:text-red-300"
					title="Remove image"
				>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/if}
		{#if isUploadingImage}
			<div class="mb-2 flex items-center space-x-2 rounded-md bg-slate-600/80 p-3 text-slate-300">
				<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span>Uploading image: {selectedFile?.name || '...'}</span>
			</div>
		{/if}

		<form
			on:submit|preventDefault={handleSendMessage}
			class="flex items-center space-x-2 sm:space-x-3"
		>
			<!-- Hidden File Input -->
			<input
				type="file"
				bind:this={fileInput}
				on:change={handleFileSelected}
				accept="image/*"
				class="hidden"
			/>

			<!-- Attach Image Button -->
			<button
				type="button"
				on:click={triggerFileInput}
				disabled={isUploadingImage || isSendingMessage}
				class="shrink-0 rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-slate-600 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
				aria-label="Attach image"
				title="Attach image"
			>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
				</svg>
			</button>
			
			<input
				type="text"
				bind:value={newMessageContent}
				placeholder="Type your message..."
				class="flex-1 rounded-lg border-slate-500/70 bg-slate-600 px-4 py-2.5 text-sm text-slate-100 transition-colors duration-150 outline-none placeholder:text-slate-400/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-base"
				disabled={isSendingMessage || isLoading}
			/>
			<button
				type="submit"
				disabled={isUploadingImage || isSendingMessage || (!newMessageContent.trim() && !uploadedImagePath)}
				class="focus:ring-opacity-75 rounded-lg bg-emerald-500 p-2.5 font-semibold text-white shadow transition-colors duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-md focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500/70 sm:px-5 sm:py-2.5"
				aria-label="Send message"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-5 w-5 sm:h-6 sm:w-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
					/>
				</svg>
			</button>
		</form>
	</div>
</div>

{#if showContractModal && contractModalProps}
	<ContractModal
		bind:show={showContractModal}
		workRequestId={contractModalProps.workRequestId}
		customerId={contractModalProps.customerId}
		expertSupplierId={contractModalProps.expertSupplierId}
		on:close={() => (showContractModal = false)}
		on:contractCreated={(e) => {
			console.log('Contract created from chat page:', e.detail);
			// Optionally, fetch contracts again or navigate to contract page
			// For now, just close the modal.
			showContractModal = false;
			// Maybe show a success toast/notification
		}}
	/>
{/if}

<style>
	/* Define a variable for header height to be used in h-screen calculation if layout changes */
	/* For example, if the (app) layout header is 64px, and this page's header is 68px */
	/* :root {
    --chat-page-header-height: 68px;
    --effective-screen-height: calc(100vh - var(--app-layout-header-height, 0px) - var(--chat-page-header-height));
  }
  .h-chat-area {
      height: var(--effective-screen-height);
  } */
	/* For simplicity, using a fixed offset in h-[calc(...)] for now.
     Assumes parent layout header + this page header totals about 10rem (a rough estimate) for viewport height adjustment.
     This can be made more precise if needed, e.g. using a store for layout dimensions or CSS variables passed down. */
</style>
