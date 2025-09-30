<!-- gefifi-2/src/frontend/src/lib/components/chat/ChatInput.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { realtimeChatService } from '$lib/services/realtimeChat';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import QuoteSubmissionForm from '$lib/components/quotes/QuoteSubmissionForm.svelte';
	import GeneralModal from '$lib/components/ui/GeneralModal.svelte';
	import apiClient from '$lib/api';
	import { authStore } from '$lib/stores/auth';

	// --- PROPS ---
	export let isSending: boolean = false;
	export let isUploadingFiles: boolean = false;
	export let selectedFiles: File[] = [];
	export let value: string = ''; // For two-way binding of textarea content
	export let chatId: string = '';
	export let currentUserId: string = '';
	export let currentUser: any = null; // Add currentUser prop for user type validation
	export let chatDetails: any = null; // Chat object with workRequestId/materialRequestId

	// --- INTERNAL STATE & BINDINGS ---
	let fileInput: HTMLInputElement;
	let imageInput: HTMLInputElement;
	let quoteInput: HTMLInputElement;
	let typingTimeout: NodeJS.Timeout | null = null;
	let showDropdown = false;
	let showQuoteModal = false;
	let availableRequests: any[] = [];

	// --- CONSTANTS ---
	const MAX_FILES = 10;
	const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

	// --- COMPUTED PROPERTIES ---
	$: canSubmitQuote =
		($authStore.user && $authStore.user.userType !== 'customer') ||
		(currentUser && currentUser.userType !== 'customer');
	// Debug modal state changes
	// $: console.log('Modal state changed:', { showQuoteModal, availableRequests: availableRequests.length });

	// --- EVENTS ---
	const dispatch = createEventDispatcher<{
		sendMessage: void;
		startRecording: void;
		selectFiles: { files: File[] };
		removeFile: { index: number };
		clearFiles: void;
		submitQuote: void;
	}>();

	// --- FILE TYPE UTILITIES ---
	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function getFileTypeDescription(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'Image';
		if (extension === 'pdf') return 'PDF Document';
		if (['doc', 'docx'].includes(extension)) return 'Word Document';
		if (['xls', 'xlsx'].includes(extension)) return 'Excel Spreadsheet';
		if (extension === 'dwg') return 'AutoCAD Drawing';
		if (extension === 'dxf') return 'DXF Drawing';
		return 'Document';
	}

	function getFileTypeClasses(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
			return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
		}
		if (extension === 'pdf') return 'bg-red-500/20 text-red-300 border-red-500/30';
		if (['doc', 'docx'].includes(extension))
			return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
		if (['xls', 'xlsx'].includes(extension))
			return 'bg-green-500/20 text-green-300 border-green-500/30';
		if (['dwg', 'dxf'].includes(extension))
			return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
		return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
	}

	function shouldShowThumbnail(file: File): boolean {
		// Show thumbnails for images
		if (file.type.startsWith('image/')) return true;

		// Check by extension for files that might not have correct MIME types
		const extension = file.name.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
			return true;
		}

		return false;
	}

	function createFilePreviewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	function formatBytes(bytes: number, decimals = 1): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	// --- EVENT HANDLERS ---
	const triggerFileInput = () => fileInput?.click();
	const triggerImageInput = () => imageInput?.click();
	const triggerQuoteInput = () => quoteInput?.click();

	const handleFileSelected = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const newFiles = Array.from(target.files);

			// Check if adding these files would exceed the limit
			if (selectedFiles.length + newFiles.length > MAX_FILES) {
				alert(
					`You can only select up to ${MAX_FILES} files. You currently have ${selectedFiles.length} files selected.`
				);
				return;
			}

			// Validate file sizes
			const oversizedFiles = newFiles.filter((file) => file.size > MAX_FILE_SIZE);
			if (oversizedFiles.length > 0) {
				alert(`Some files are too large. Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
				return;
			}

			// Add new files to existing selection
			const updatedFiles = [...selectedFiles, ...newFiles];
			selectedFiles = updatedFiles;
			dispatch('selectFiles', { files: updatedFiles });
		}
	};

	const handleRemoveFile = (index: number) => {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
		dispatch('removeFile', { index });
	};

	const handleClearFiles = () => {
		selectedFiles = [];
		dispatch('clearFiles');
	};

	const handleSendMessage = () => {
		if (isSending) return;
		dispatch('sendMessage');
	};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	};

	const handleInput = () => {
		// Set typing indicator
		if (chatId && currentUserId && value.trim()) {
			realtimeChatService.setTyping(chatId, currentUserId);

			// Clear previous timeout
			if (typingTimeout) {
				clearTimeout(typingTimeout);
			}

			// Clear typing indicator after 2 seconds of no typing
			typingTimeout = setTimeout(() => {
				realtimeChatService.clearTyping(chatId, currentUserId);
			}, 2000);
		} else if (chatId && currentUserId) {
			// Clear typing if input is empty
			realtimeChatService.clearTyping(chatId, currentUserId);
		}
	};

	const handleQuoteSubmit = async () => {
		console.log('Quote button clicked!', { currentUser, canSubmitQuote, chatDetails });
		const user = $authStore.user || currentUser;
		if (user && canSubmitQuote && chatDetails) {
			console.log('User type:', user.userType);
			try {
				let requests: any[] = [];
				let preselectedRequestId: string | null = null;

				// Get the customer ID from chat participants
				const otherParticipantId = chatDetails.participants.find((p: string) => p !== user.id);
				console.log('Other participant (customer):', otherParticipantId);

				// Fetch requests based on user type
				if (user.userType === 'expert') {
					console.log('Fetching work requests for expert...');
					const workRequests = await apiClient.getWorkRequests();
					requests = workRequests.filter((req: any) => {
						return (
							req.customerId === otherParticipantId &&
							(req.interestedExperts?.includes(user.id) ||
								req.invitedExperts?.includes(user.id) ||
								req.status === 'contracted')
						);
					});

					// Optionally preselect if workRequestId exists in chat
					if (chatDetails.workRequestId) {
						preselectedRequestId = chatDetails.workRequestId;
						console.log('Preselecting work request:', preselectedRequestId);
					}
				} else if (user.userType === 'supplier') {
					console.log('Fetching material requests for supplier...');
					const materialRequests = await apiClient.getMaterialRequests();
					requests = materialRequests.filter((req: any) => {
						return (
							req.customerId === otherParticipantId &&
							(req.interestedSuppliers?.includes(user.id) ||
								req.invitedSuppliers?.includes(user.id) ||
								req.status === 'contracted')
						);
					});

					// Optionally preselect if materialRequestId exists in chat
					if (chatDetails.materialRequestId) {
						preselectedRequestId = chatDetails.materialRequestId;
						console.log('Preselecting material request:', preselectedRequestId);
					}
				} else {
					console.log('Invalid user type for quote submission:', user.userType);
					return;
				}

				availableRequests = requests;
				console.log('Available requests:', requests.length, 'Preselected:', preselectedRequestId);
				showQuoteModal = true;
			} catch (error) {
				console.error('Error fetching available requests:', error);
				showQuoteModal = true;
			}
		} else {
			console.log('Cannot submit quote:', { currentUser, canSubmitQuote, chatDetails });
		}
	};

	const handleQuoteSubmitted = () => {
		showQuoteModal = false;
		dispatch('submitQuote');
	};

	const toggleDropdown = () => {
		showDropdown = !showDropdown;
	};

	const closeDropdown = () => {
		showDropdown = false;
	};
</script>

<div class="border-t border-slate-700/50 bg-slate-800 p-3" role="region" tabindex="-1">
	<!-- File Preview / Upload Progress -->
	{#if isUploadingFiles}
		<div class="mb-2 flex animate-pulse items-center gap-3 rounded-lg bg-slate-700 p-3">
			<div class="h-10 w-10 rounded-md bg-slate-600"></div>
			<div class="flex-1">
				<p class="text-sm text-slate-400">Uploading files...</p>
				<p class="text-xs text-slate-500">
					{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
				</p>
			</div>
		</div>
	{:else if selectedFiles.length > 0}
		<!-- Multiple Files Preview -->
		<div class="mb-2 rounded-lg bg-slate-700 p-3">
			<!-- Header with file count and clear button -->
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-slate-300">
						{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
					</span>
					<span class="text-xs text-slate-400">
						({formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))})
					</span>
				</div>
				<button
					on:click={handleClearFiles}
					class="rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
					aria-label="Clear all files"
				>
					Clear all
				</button>
			</div>

			<!-- Horizontal scrollable file list -->
			<div class="file-preview-scroll flex gap-3 overflow-x-auto py-2">
				{#each selectedFiles as file, index (index)}
					<div class="w-24 flex-shrink-0">
						<div class="group relative">
							<!-- File Preview -->
							<div
								class="h-16 w-24 overflow-hidden rounded-lg border border-slate-600 bg-slate-800"
							>
								{#if shouldShowThumbnail(file)}
									<!-- Image Thumbnail -->
									<img
										src={createFilePreviewUrl(file)}
										alt={file.name}
										class="h-full w-full object-cover"
										loading="lazy"
										on:error={(e) => {
											// Fallback to icon if image fails to load
											const img = e.target as HTMLImageElement;
											if (img) {
												img.style.display = 'none';
												const fallback = img.nextElementSibling as HTMLElement;
												if (fallback) {
													fallback.style.display = 'flex';
												}
											}
										}}
									/>
									<!-- Fallback icon (hidden by default) -->
									<div class="hidden h-16 w-24 items-center justify-center text-2xl">
										{getFileIcon(file.name)}
									</div>
								{:else}
									<!-- Regular File Icon -->
									<div class="flex h-16 w-24 items-center justify-center text-2xl">
										{getFileIcon(file.name)}
									</div>
								{/if}
							</div>

							<!-- Remove Button -->
							<button
								on:click={() => handleRemoveFile(index)}
								class="absolute -top-1 -right-1 flex h-6 w-6 touch-manipulation items-center justify-center rounded-full border border-slate-600/50 bg-slate-700/95 text-slate-200 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-slate-600 hover:text-white active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
								aria-label="Remove {file.name}"
							>
								<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>

							<!-- File Name (truncated) -->
							<div class="mt-1 truncate text-xs text-slate-300" title={file.name}>
								{file.name}
							</div>

							<!-- File Size -->
							<div class="text-xs text-slate-400">
								{formatBytes(file.size)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Main Input Form -->
	<div class="flex items-center gap-3">
		<!-- Hidden file inputs -->
		<input
			type="file"
			bind:this={fileInput}
			on:change={handleFileSelected}
			multiple
			accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.dwg,.dxf"
			class="hidden"
		/>
		<input
			type="file"
			bind:this={imageInput}
			on:change={handleFileSelected}
			multiple
			accept="image/*"
			class="hidden"
		/>
		<input
			type="file"
			bind:this={quoteInput}
			on:change={handleFileSelected}
			multiple
			accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.dwg,.dxf"
			class="hidden"
		/>

		{#if selectedFiles.length < MAX_FILES}
			<!-- File Upload Dropdown -->
			<DropdownMenu
				bind:isOpen={showDropdown}
				position="right"
				placement="top"
				autoPosition={true}
				debug={false}
			>
				<button
					slot="trigger"
					class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
					aria-label="Attach files"
				>
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
						/>
					</svg>
				</button>

				<button
					on:click={() => {
						triggerFileInput();
						closeDropdown();
					}}
					class="dropdown-menu-item"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
						<path d="M14 2v4a2 2 0 0 0 2 2h4" />
						<path d="M12 12v6" />
						<path d="m15 15-3-3-3 3" />
					</svg>
					<span>Document</span>
				</button>
				<button
					on:click={() => {
						triggerImageInput();
						closeDropdown();
					}}
					class="dropdown-menu-item"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
						<path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
						<circle cx="13" cy="7" r="1" fill="currentColor" />
						<rect x="8" y="2" width="14" height="14" rx="2" />
					</svg>
					<span>Photos</span>
				</button>
				{#if canSubmitQuote}
					<button
						on:click={() => {
							handleQuoteSubmit();
							closeDropdown();
						}}
						class="dropdown-menu-item"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
							<path d="M9 14h6" />
							<path d="M12 17v-6" />
						</svg>
						<span>Quote</span>
					</button>
				{/if}
			</DropdownMenu>
		{/if}
		<textarea
			bind:value
			on:keydown={handleKeyPress}
			on:input={handleInput}
			disabled={isSending}
			rows="1"
			placeholder="Type a message..."
			class="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-700 p-3 text-slate-100 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
		></textarea>
		{#if value.trim() || selectedFiles.length > 0}
			<button
				on:click={handleSendMessage}
				disabled={isSending}
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-500 disabled:scale-100 disabled:bg-slate-600 disabled:opacity-70"
				aria-label="Send message"
			>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
				</svg>
			</button>
		{:else}
			<button
				on:click={() => dispatch('startRecording')}
				disabled={isSending}
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-500 disabled:scale-100 disabled:bg-slate-600 disabled:opacity-70"
				aria-label="Record voice message"
			>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Quote Submission Modal -->
	<GeneralModal
		bind:show={showQuoteModal}
		on:close={() => (showQuoteModal = false)}
		title="Submit Quote"
		maxWidthClass="max-w-4xl"
	>
		<QuoteSubmissionForm
			requestId={chatDetails?.workRequestId || chatDetails?.materialRequestId || ''}
			requestType={($authStore.user || currentUser)?.userType === 'supplier' ? 'material' : 'work'}
			request={availableRequests.find(
				(req) => req.id === (chatDetails?.workRequestId || chatDetails?.materialRequestId)
			) || null}
			{availableRequests}
			{chatId}
			on:quoteSubmitted={handleQuoteSubmitted}
			on:close={() => (showQuoteModal = false)}
		/>
	</GeneralModal>
</div>

<style>
	/* Green scrollbar styling for file preview */
	.file-preview-scroll::-webkit-scrollbar {
		height: 6px;
		background-color: transparent;
	}
	.file-preview-scroll::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 2px;
	}
	.file-preview-scroll::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.6),
			rgba(5, 150, 105, 0.8)
		); /* emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		transition: all 0.2s ease;
	}
	.file-preview-scroll::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 1));
		border-color: rgba(16, 185, 129, 0.4);
		transform: scale(1.1);
	}

	/* Firefox */
	.file-preview-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
	}
</style>
