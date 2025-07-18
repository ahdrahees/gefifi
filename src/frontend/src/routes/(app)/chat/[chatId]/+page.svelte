<!-- gefifi-2/src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import ContractModal from '$lib/components/contracts/ContractModal.svelte';

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

	type Chat = {
		id: string;
		participants: string[];
		workRequestId?: string;
		createdAt: string;
		updatedAt: string;
	};

	type Message = {
		id: string;
		senderId: string;
		content: string;
		images?: string[];
		timestamp: string;
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let messages: Message[] = [];
	let isLoading = true;
	let errorMessage = '';
	let chatId: string;
	let newMessageContent = '';
	let isSendingMessage = false;

	// File upload
	let fileInput: HTMLInputElement;
	let selectedFile: File | null = null;
	let uploadedImagePath: string | null = null;
	let isUploadingImage = false;

	// Chat details
	let currentChatDetails: Chat | null = null;
	let otherParticipantProfile: UserProfile | null = null;
	let chatPageTitle = 'Chat';

	// Contract modal
	let showContractModal = false;
	type ContractModalProps = {
		workRequestId: string;
		otherPartyId: string;
		otherPartyName: string;
		userType: string;
	};
	let contractModalProps: ContractModalProps | null = null;

	// Message container for auto-scroll
	let messagesContainer: HTMLElement;
	let shouldAutoScroll = true;
	let isNearBottom = true;

	// Auto-scroll management
	function checkIfNearBottom() {
		if (!messagesContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
		isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
	}

	function scrollToBottom(smooth = true) {
		if (!messagesContainer) return;
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behavior: smooth ? 'smooth' : 'instant'
		});
	}

	// Force scroll to bottom on mount and when new messages arrive
	async function handleAutoScroll() {
		if (shouldAutoScroll) {
			await tick();
			scrollToBottom(false);
		}
	}

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function loadChatAndParticipantDetails(cId: string) {
		if (!token || !currentUser) {
			errorMessage = 'Authentication required.';
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat/${cId}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				throw new Error('Chat not found or access denied.');
			}

			const chatData: Chat = await response.json();
			currentChatDetails = chatData;

			// Get other participant's profile
			const otherParticipantId = chatData.participants.find((pId) => pId !== currentUser?.id);
			if (otherParticipantId) {
				try {
					const userResponse = await fetch(`${API_BASE_URL}/api/users/${otherParticipantId}`, {
						headers: { Authorization: `Bearer ${token}` }
					});
					if (userResponse.ok) {
						otherParticipantProfile = await userResponse.json();
						chatPageTitle = getChatTitle(otherParticipantProfile);
					}
				} catch (e) {
					console.warn('Failed to load participant profile:', e);
				}
			}
		} catch (error) {
			console.error('Error loading chat details:', error);
			errorMessage = 'Failed to load chat details.';
		}
	}

	function getChatTitle(profile: UserProfile | null): string {
		if (!profile) return 'Chat';

		const { fullName, companyName } = profile.profile || {};
		switch (profile.userType) {
			case 'customer':
				return fullName || 'Customer';
			case 'expert':
				return fullName || 'Expert';
			case 'supplier':
				return companyName || fullName || 'Supplier';
			default:
				return fullName || companyName || 'User';
		}
	}

	function getUserTypeDisplay(userType: string): { label: string; color: string; bgColor: string } {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}

	async function fetchMessages(cId: string) {
		isLoading = true;

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

			const responseData = await response.json();
			const fetchedMessages = responseData.messages || responseData || [];
			messages = fetchedMessages.map((msg: Message) => ({ ...msg }));

			// Auto-scroll to bottom after loading messages
			shouldAutoScroll = true;
			await handleAutoScroll();
		} catch (err: unknown) {
			console.error('Fetch messages error:', err);
			errorMessage = (err as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function handleSendMessage(event?: Event) {
		if (event) event.preventDefault();

		if ((!newMessageContent.trim() && !uploadedImagePath) || !chatId || !token || !currentUser) {
			return;
		}

		if (isSendingMessage) return;

		isSendingMessage = true;
		const tempMessage = {
			id: `temp-${Date.now()}`,
			senderId: currentUser.id,
			content: newMessageContent.trim(),
			images: uploadedImagePath ? [uploadedImagePath] : undefined,
			timestamp: new Date().toISOString()
		};

		// Optimistically add message to UI
		messages = [...messages, tempMessage];
		const messageToSend = newMessageContent.trim();
		newMessageContent = '';
		const imageToSend = uploadedImagePath;
		uploadedImagePath = null;
		selectedFile = null;
		if (fileInput) fileInput.value = '';

		// Auto-scroll to show new message
		shouldAutoScroll = true;
		await handleAutoScroll();

		try {
			const payload = {
				content: messageToSend,
				...(imageToSend && { images: [imageToSend] })
			};

			const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to send message.' }));
				throw new Error(errorData.message);
			}

			const sentMessage = await response.json();

			// Replace temporary message with real message
			messages = messages.map((msg) => (msg.id === tempMessage.id ? sentMessage : msg));

			// Ensure we stay scrolled to bottom
			await handleAutoScroll();
		} catch (err: unknown) {
			console.error('Send message error:', err);
			// Remove the temporary message on error
			messages = messages.filter((msg) => msg.id !== tempMessage.id);
			// Restore the content
			newMessageContent = messageToSend;
			uploadedImagePath = imageToSend;
			errorMessage = `Failed to send message: ${(err as Error).message}`;
		} finally {
			isSendingMessage = false;
		}
	}

	function parseAndSanitize(content: string): string {
		try {
			const html = marked(content);
			return DOMPurify.sanitize(html);
		} catch (error) {
			console.error('Markdown parsing error:', error);
			return DOMPurify.sanitize(content);
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

		return date.toLocaleDateString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getSenderName(senderId: string): string {
		if (senderId === 'system') return 'System';
		if (senderId === currentUser?.id) return 'You';
		return (
			otherParticipantProfile?.profile?.fullName ||
			otherParticipantProfile?.profile?.companyName ||
			'Other User'
		);
	}

	function triggerFileInput() {
		fileInput.click();
	}

	async function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
			await uploadSelectedImage();
		}
	}

	async function uploadSelectedImage() {
		if (!selectedFile) return;

		isUploadingImage = true;
		try {
			const formData = new FormData();
			formData.append('file', selectedFile);

			const response = await fetch(`${API_BASE_URL}/api/upload`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error('Upload failed');
			}

			const result = await response.json();
			uploadedImagePath = result.filePath;
		} catch (error: unknown) {
			console.error('Image upload error:', error);
			errorMessage = `Image upload failed: ${(error as Error).message}`;
			uploadedImagePath = null;
			selectedFile = null;
			if (fileInput) fileInput.value = '';
		} finally {
			isUploadingImage = false;
		}
	}

	function removeSelectedImage() {
		uploadedImagePath = null;
		selectedFile = null;
		if (fileInput) fileInput.value = '';
	}

	// Handle scroll events to determine if user is near bottom
	function handleScroll() {
		checkIfNearBottom();
		shouldAutoScroll = isNearBottom;
	}

	// Page initialization
	onMount(async () => {
		const unsubscribe = page.subscribe(async (p) => {
			chatId = p.params.chatId;
			if (chatId && currentUser && token) {
				await loadChatAndParticipantDetails(chatId);
				await fetchMessages(chatId);
			}
		});

		const authUnsubscribe = authStore.subscribe(async (auth) => {
			if (auth.user && auth.token && !auth.isLoading && chatId) {
				currentUser = auth.user;
				token = auth.token;
				await loadChatAndParticipantDetails(chatId);
				await fetchMessages(chatId);
			}
		});

		return () => {
			unsubscribe();
			authUnsubscribe();
		};
	});

	// Auto-scroll when messages change
	$: if (messages.length > 0) {
		handleAutoScroll();
	}
</script>

<div class="flex h-full flex-col bg-slate-900">
	<!-- Header -->
	<header class="border-b border-slate-700/50 bg-slate-800/50 p-4 backdrop-blur-sm">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<button
					onclick={() => goto('/chat')}
					class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
					aria-label="Back to chat list"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>

				<div class="flex items-center gap-3">
					<div class="relative">
						<img
							src={otherParticipantProfile?.profile?.avatarUrl || '/images/default-avatar.png'}
							alt="Avatar"
							class="h-10 w-10 rounded-full border-2 border-slate-600 object-cover"
						/>
						<div
							class="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-slate-800 bg-emerald-500"
						></div>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="font-semibold text-slate-200">{chatPageTitle}</h2>
							{#if otherParticipantProfile}
								{@const typeInfo = getUserTypeDisplay(otherParticipantProfile.userType)}
								<span
									class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {typeInfo.color} {typeInfo.bgColor}"
								>
									{typeInfo.label}
								</span>
							{/if}
						</div>
						{#if otherParticipantProfile?.profile}
							<p class="text-sm text-slate-400">
								{#if otherParticipantProfile.userType === 'expert' && otherParticipantProfile.profile.expertise}
									{otherParticipantProfile.profile.expertise}
								{:else if otherParticipantProfile.userType === 'supplier' && otherParticipantProfile.profile.category}
									{otherParticipantProfile.profile.category}
								{/if}
								{#if otherParticipantProfile.profile.location}
									• {otherParticipantProfile.profile.location}
								{/if}
							</p>
						{/if}
					</div>
				</div>
			</div>

			{#if currentChatDetails?.workRequestId}
				<button
					onclick={() => {
						if (otherParticipantProfile) {
							contractModalProps = {
								workRequestId: currentChatDetails.workRequestId,
								otherPartyId: otherParticipantProfile.id,
								otherPartyName: chatPageTitle,
								userType: currentUser?.userType || 'customer'
							};
							showContractModal = true;
						}
					}}
					class="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span class="hidden sm:inline">Create Contract</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- Messages -->
	<div
		class="flex-1 space-y-4 overflow-y-auto p-4"
		bind:this={messagesContainer}
		onscroll={handleScroll}
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500"
					></div>
					<p class="text-slate-300">Loading messages...</p>
				</div>
			</div>
		{:else if errorMessage}
			<div class="flex h-full items-center justify-center">
				<div class="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
					<p class="text-red-300">{errorMessage}</p>
					<button
						onclick={() => fetchMessages(chatId)}
						class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if messages.length === 0}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div class="mb-4 inline-block rounded-full bg-slate-700/50 p-4">
						<svg
							class="h-12 w-12 text-slate-500"
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
					</div>
					<p class="text-slate-400">No messages yet. Start the conversation!</p>
				</div>
			</div>
		{:else}
			{#each messages as message (message.id)}
				{#if message.senderId === 'system'}
					<div class="flex items-center justify-center py-2">
						<div
							class="flex items-center justify-center gap-2 rounded-full bg-slate-700/50 px-4 py-2"
						>
							<svg
								class="h-4 w-4 text-slate-400"
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
							<span class="text-xs text-slate-400">{@html parseAndSanitize(message.content)}</span>
						</div>
					</div>
				{:else}
					<div
						class="flex {message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}"
					>
						<div class="max-w-xs md:max-w-md lg:max-w-lg">
							{#if message.senderId !== currentUser?.id}
								<div class="mb-1 flex items-center gap-2">
									<img
										src={otherParticipantProfile?.profile?.avatarUrl ||
											'/images/default-avatar.png'}
										alt="Avatar"
										class="h-6 w-6 rounded-full border border-slate-600 object-cover"
									/>
									<span class="text-sm font-medium text-slate-300"
										>{getSenderName(message.senderId)}</span
									>
									<span class="text-xs text-slate-500">{formatTimestamp(message.timestamp)}</span>
								</div>
							{/if}

							<div
								class="w-fit rounded-2xl p-3 {message.senderId === currentUser?.id
									? 'bg-emerald-600'
									: 'bg-slate-700'}"
							>
								{#if message.images && message.images.length > 0}
									<div class="mb-2 space-y-2">
										{#each message.images as imageSrc, index (index)}
											<img
												src={imageSrc.startsWith('http')
													? imageSrc
													: `${API_BASE_URL.replace('/api', '')}${imageSrc}`}
												alt="Chat attachment"
												class="max-w-full rounded-lg border border-slate-600 object-contain"
												loading="lazy"
											/>
										{/each}
									</div>
								{/if}

								{#if message.content && message.content.trim()}
									<div
										class="prose prose-sm max-w-none {message.senderId === currentUser?.id
											? 'prose-invert text-white'
											: 'prose-slate text-slate-100'}"
									>
										{@html parseAndSanitize(message.content)}
									</div>
								{/if}
							</div>

							{#if message.senderId === currentUser?.id}
								<div class="mt-1 text-right">
									<span class="text-xs text-slate-500">{formatTimestamp(message.timestamp)}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		{/if}
	</div>

	<!-- Scroll to bottom button -->
	{#if !isNearBottom && messages.length > 0}
		<div class="absolute right-4 bottom-28 sm:right-6 sm:bottom-32 lg:right-8 lg:bottom-32">
			<button
				onclick={() => scrollToBottom()}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700"
				aria-label="Scroll to bottom"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 14l-7 7m0 0l-7-7m7 7V3"
					/>
				</svg>
			</button>
		</div>
	{/if}

	<!-- Message Input -->
	<div class="border-t border-slate-700/50 bg-slate-800/50 p-4">
		<!-- Image preview -->
		{#if uploadedImagePath && !isUploadingImage}
			<div class="mb-3 flex items-center gap-3 rounded-lg bg-slate-700/50 p-3">
				<img
					src={uploadedImagePath.startsWith('http')
						? uploadedImagePath
						: `${API_BASE_URL.replace('/api', '')}${uploadedImagePath}`}
					alt="Upload preview"
					class="h-12 w-12 rounded-lg border border-slate-600 object-cover"
				/>
				<span class="flex-1 truncate text-sm text-slate-300"
					>{selectedFile?.name || 'Uploaded Image'}</span
				>
				<button
					type="button"
					onclick={removeSelectedImage}
					aria-label="Remove selected image"
					class="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-red-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		{/if}

		<!-- Upload progress -->
		{#if isUploadingImage}
			<div class="mb-3 flex items-center gap-3 rounded-lg bg-slate-700/50 p-3">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500"
				></div>
				<span class="text-sm text-slate-300">Uploading image...</span>
			</div>
		{/if}

		<!-- Message form -->
		<form onsubmit={handleSendMessage} class="flex items-center justify-center gap-2">
			<input
				type="file"
				accept="image/*"
				bind:this={fileInput}
				onchange={handleFileSelected}
				class="hidden"
			/>

			<button
				type="button"
				onclick={triggerFileInput}
				class="rounded-full bg-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-600 hover:text-slate-200"
				aria-label="Upload image"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
					/>
				</svg>
			</button>

			<div class="flex-1">
				<textarea
					bind:value={newMessageContent}
					onkeydown={handleKeyPress}
					placeholder="Type your message..."
					class="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 p-3 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
					rows="1"
					style="min-height: 44px; max-height: 120px;"
				></textarea>
			</div>

			<button
				type="submit"
				disabled={(!newMessageContent.trim() && !uploadedImagePath) || isSendingMessage}
				class="rounded-full bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label="Send message"
			>
				{#if isSendingMessage}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
						/>
					</svg>
				{/if}
			</button>
		</form>
	</div>
</div>

<!-- Contract Modal -->
{#if showContractModal && contractModalProps}
	<ContractModal
		bind:show={showContractModal}
		workRequestId={contractModalProps.workRequestId}
		otherPartyId={contractModalProps.otherPartyId}
		otherPartyName={contractModalProps.otherPartyName}
		userType={contractModalProps.userType}
		onclose={() => {
			showContractModal = false;
			contractModalProps = null;
		}}
	/>
{/if}
