<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import type { Quote, WorkRequest, MaterialRequest } from '$lib/types';

	// Props
	export let requestId: string;
	export let requestType: 'work' | 'material';
	export let request: WorkRequest | MaterialRequest;
	export let availableRequests: (WorkRequest | MaterialRequest)[] = [];
	export let chatId: string | undefined = undefined; // Optional chat ID for chat-based submission
	export let revisionQuoteId: string | undefined = undefined; // Quote ID for revision mode
	export let existingQuote: Quote | undefined = undefined; // Existing quote data for revision

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		quoteSubmitted: Quote;
		close: void;
	}>();

	// State
	let currentUser = $authStore;
	let selectedRequestId = requestId;
	let title = '';
	let description = '';
	let amount = '';
	let currency = 'INR';
	let validityDays = 30;
	let additionalInfo = {
		deliveryTime: '',
		paymentTerms: '',
		warranty: '',
		notes: ''
	};

	// File handling
	let selectedFiles: File[] = [];
	let fileInput: HTMLInputElement;
	let isUploading = false;
	let errorMessage = '';
	let successMessage = '';

	// Progressive disclosure state
	let currentStep = requestId && requestId !== '' ? 2 : 1; // Skip request selection if requestId is provided
	let showSmartQuestions = false;
	let isRevision = !!revisionQuoteId; // Track if this is a revision based on prop
	let smartQuestions: Array<{
		id: string;
		question: string;
		field: string;
		value: any;
		show: boolean;
	}> = [];
	let analyzedContent = '';
	let isAnalyzing = false;

	// Constants
	const MAX_FILES = 10;
	const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

	// Computed
	$: filteredRequests = availableRequests.filter((req) =>
		request ? req.customerId === request.customerId && req.id !== requestId : true
	);

	$: canSubmit = title.trim() && selectedRequestId;

	// Pre-fill form with existing quote data for revision
	onMount(() => {
		if (isRevision && existingQuote) {
			title = existingQuote.title || '';
			description = existingQuote.description || '';
			amount = existingQuote.amount?.toString() || '';
			currency = existingQuote.currency || 'INR';
			validityDays = existingQuote.validityDays || 30;

			// Parse additional terms if it's a JSON string
			if (existingQuote.additionalTerms) {
				try {
					const parsed =
						typeof existingQuote.additionalTerms === 'string'
							? JSON.parse(existingQuote.additionalTerms)
							: existingQuote.additionalTerms;
					additionalInfo = {
						deliveryTime: parsed.deliveryTime || '',
						paymentTerms: parsed.paymentTerms || '',
						warranty: parsed.warranty || '',
						notes: parsed.notes || ''
					};
				} catch (e) {
					// If parsing fails, keep default values
					console.warn('Failed to parse additional terms:', e);
				}
			}

			// Note: Files cannot be pre-populated due to browser security restrictions
			// User will need to re-upload files or we keep existing files on backend
		}
	});
	$: canProceedToNext =
		currentStep === 1
			? selectedRequestId && selectedRequestId !== ''
			: currentStep === 2
				? selectedFiles.length > 0
				: currentStep === 3
					? title.trim()
					: currentStep === 4
						? true
						: true;

	// Methods
	async function checkForExistingQuote() {
		if (!selectedRequestId || !currentUser?.user) return;

		try {
			const response = await apiClient.getQuotesForRequest(selectedRequestId, requestType);
			const existingQuote = response.quotes.find(
				(quote: any) =>
					quote.expertSupplierId === currentUser.user?.id &&
					quote.status !== 'rejected' &&
					quote.status !== 'expired'
			);

			if (existingQuote) {
				isRevision = true;
				console.log('Existing quote found, switching to revision mode:', existingQuote);
			} else {
				isRevision = false;
				console.log('No existing quote found, new quote mode');
			}
		} catch (error) {
			console.error('Error checking for existing quote:', error);
			isRevision = false;
		}
	}

	function handleRequestSelection() {
		checkForExistingQuote();
	}

	// Helper function to check if two files are identical
	async function areFilesIdentical(file1: File, file2: File): Promise<boolean> {
		// First check basic properties
		if (
			file1.size !== file2.size ||
			file1.name !== file2.name ||
			file1.lastModified !== file2.lastModified
		) {
			return false;
		}

		// For small files (< 1MB), use hash-based detection for accuracy
		// For larger files, use 1KB content comparison for speed
		if (file1.size < 1024 * 1024) {
			// < 1MB
			try {
				// Hash-based detection for small files
				const content1 = await file1.arrayBuffer();
				const content2 = await file2.arrayBuffer();

				const hash1 = await crypto.subtle.digest('SHA-256', content1);
				const hash2 = await crypto.subtle.digest('SHA-256', content2);

				// Compare hashes
				const view1 = new Uint8Array(hash1);
				const view2 = new Uint8Array(hash2);

				for (let i = 0; i < view1.length; i++) {
					if (view1[i] !== view2[i]) {
						return false;
					}
				}

				return true;
			} catch (error) {
				console.warn('Error with hash comparison:', error);
				// Fall back to basic properties
				return true; // Assume identical if basic properties match
			}
		} else {
			// 1KB content comparison for larger files
			try {
				const chunkSize = 1024; // 1KB
				const buffer1 = await file1.slice(0, chunkSize).arrayBuffer();
				const buffer2 = await file2.slice(0, chunkSize).arrayBuffer();

				// Compare the buffers
				const view1 = new Uint8Array(buffer1);
				const view2 = new Uint8Array(buffer2);

				for (let i = 0; i < view1.length; i++) {
					if (view1[i] !== view2[i]) {
						return false;
					}
				}

				return true;
			} catch (error) {
				console.warn('Error comparing file content:', error);
				// If content comparison fails, fall back to basic properties
				return (
					file1.size === file2.size &&
					file1.name === file2.name &&
					file1.lastModified === file2.lastModified
				);
			}
		}
	}

	// Helper function to check if a file already exists in selectedFiles
	async function isFileDuplicate(newFile: File): Promise<boolean> {
		for (const existingFile of selectedFiles) {
			if (await areFilesIdentical(newFile, existingFile)) {
				return true;
			}
		}
		return false;
	}

	async function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);

		// Validate files and check for duplicates
		const validFiles = [];
		const duplicateFiles = [];

		for (const file of files) {
			if (file.size > MAX_FILE_SIZE) {
				errorMessage = `File ${file.name} is too large. Maximum size is 30MB.`;
				continue;
			}

			if (await isFileDuplicate(file)) {
				duplicateFiles.push(file.name);
				continue;
			}

			validFiles.push(file);
		}

		// Show duplicate files message if any
		if (duplicateFiles.length > 0) {
			const duplicateMessage =
				duplicateFiles.length === 1
					? `Duplicate file ignored: ${duplicateFiles[0]}`
					: `Duplicate files ignored: ${duplicateFiles.join(', ')}`;
			errorMessage = duplicateMessage;

			// Clear duplicate message after 5 seconds
			setTimeout(() => {
				errorMessage = '';
			}, 5000);
		}

		// Check total file count
		if (selectedFiles.length + validFiles.length > MAX_FILES) {
			errorMessage = `Maximum ${MAX_FILES} files allowed.`;
			return;
		}

		// Add valid files
		if (validFiles.length > 0) {
			selectedFiles = [...selectedFiles, ...validFiles];
			// Show success message for added files
			if (duplicateFiles.length === 0) {
				errorMessage = '';
				successMessage = `${validFiles.length} file${validFiles.length !== 1 ? 's' : ''} added successfully`;
				// Clear success message after 3 seconds
				setTimeout(() => {
					successMessage = '';
				}, 3000);
			}
		}

		// Clear the input value to prevent stale file names in browser
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function clearFiles() {
		selectedFiles = [];
		// Clear the input value only when all files are cleared
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase();
		switch (extension) {
			case 'pdf':
				return '📄';
			case 'doc':
			case 'docx':
				return '📝';
			case 'xls':
			case 'xlsx':
				return '📋';
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'gif':
			case 'webp':
				return '🖼️';
			case 'dwg':
			case 'dxf':
				return '📐';
			default:
				return '��';
		}
	}

	async function handleSubmit() {
		if (!canSubmit) return;

		isUploading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			formData.append('title', title.trim());
			formData.append('description', description.trim());
			formData.append('amount', amount);
			formData.append('currency', currency);
			formData.append('validityDays', validityDays.toString());

			// Add additional terms if any fields are filled
			const hasAdditionalInfo = Object.values(additionalInfo).some((value) => value.trim());
			if (hasAdditionalInfo) {
				formData.append('additionalTerms', JSON.stringify(additionalInfo));
			}

			// Add files
			selectedFiles.forEach((file) => {
				formData.append('files', file);
			});

			let quote;

			// Use revision API if in revision mode
			if (isRevision && revisionQuoteId) {
				quote = await apiClient.reviseQuote(revisionQuoteId, formData);
				successMessage = 'Quote revised successfully!';
			} else {
				// Add request info for new quotes
				formData.append('requestId', selectedRequestId);
				formData.append('requestType', requestType);

				// Submit quote through chat or regular API
				quote = chatId
					? await apiClient.submitQuoteThroughChat(chatId, formData)
					: await apiClient.submitQuote(formData);
				successMessage = 'Quote submitted successfully!';
			}

			dispatch('quoteSubmitted', quote);

			// Reset form
			title = '';
			description = '';
			amount = '';
			additionalInfo = {
				deliveryTime: '',
				paymentTerms: '',
				warranty: '',
				notes: ''
			};
			selectedFiles = [];
			showSmartQuestions = false;
		} catch (error) {
			console.error('Error submitting quote:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to submit quote';
		} finally {
			isUploading = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	// Smart analysis function
	async function analyzeUploadedFiles() {
		if (selectedFiles.length === 0) return;

		isAnalyzing = true;
		// Simulate analysis delay
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Generate smart questions based on common quote requirements
		smartQuestions = [
			{
				id: 'validity',
				question:
					"If your uploaded document doesn't contain quote validity information, please specify the validity period:",
				field: 'validityDays',
				value: validityDays,
				show: true
			},
			{
				id: 'amount',
				question:
					"If your uploaded document doesn't contain a specific amount, please add the quote amount:",
				field: 'amount',
				value: amount,
				show: !amount.trim()
			},
			{
				id: 'delivery',
				question:
					"If your uploaded document doesn't contain delivery timeline, please specify delivery time or project timeline:",
				field: 'deliveryTime',
				value: additionalInfo.deliveryTime,
				show: true
			},
			{
				id: 'payment',
				question:
					"If your uploaded document doesn't contain payment terms, please add payment terms:",
				field: 'paymentTerms',
				value: additionalInfo.paymentTerms,
				show: true
			}
		].filter((q) => q.show);

		isAnalyzing = false;
		showSmartQuestions = true;
	}

	// Step navigation
	function nextStep() {
		if (currentStep === 2 && selectedFiles.length > 0) {
			analyzeUploadedFiles();
		}
		if (canProceedToNext && currentStep < 5) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function skipSmartQuestions() {
		showSmartQuestions = false;
		currentStep = 5;
	}

	function answerSmartQuestion(questionId: string, value: string) {
		const question = smartQuestions.find((q) => q.id === questionId);
		if (question) {
			question.value = value;
			if (question.field === 'validityDays') {
				validityDays = parseInt(value) || 30;
			} else if (question.field === 'amount') {
				amount = value;
			} else if (question.field === 'deliveryTime') {
				additionalInfo.deliveryTime = value;
			} else if (question.field === 'paymentTerms') {
				additionalInfo.paymentTerms = value;
			}
		}
	}

	function handleSmartQuestionInput(event: Event, questionId: string) {
		const target = event.target as HTMLInputElement;
		if (target) {
			answerSmartQuestion(questionId, target.value);
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
>
	<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-slate-800 p-6 shadow-2xl">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h2 class="text-xl font-semibold text-slate-100">
					{isRevision ? 'Revise Quote' : 'Submit Quote'}
				</h2>
				<div class="mt-2 flex items-center gap-2">
					{#each [1, 2, 3, 4, 5] as step}
						<div class="flex items-center">
							<div
								class="h-2 w-8 rounded-full {currentStep >= step
									? 'bg-emerald-500'
									: 'bg-slate-600'}"
							></div>
							{#if step < 5}
								<div
									class="h-0.5 w-4 {currentStep > step ? 'bg-emerald-500' : 'bg-slate-600'}"
								></div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			<button
				on:click={handleClose}
				class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
				aria-label="Close quote submission form"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Progressive Disclosure Form -->
		<div class="space-y-6">
			<!-- Step 1: Request Selection -->
			{#if currentStep === 1}
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
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
							class="lucide lucide-clipboard-plus-icon lucide-clipboard-plus h-8 w-8 text-emerald-400"
							><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path
								d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
							/><path d="M9 14h6" /><path d="M12 17v-6" /></svg
						>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-slate-100">
						{#if isRevision}
							Revise Quote for Selected Request
						{:else}
							Select Request for Quote
						{/if}
					</h3>
					<p class="mb-6 text-slate-400">
						{#if isRevision}
							You already have a quote for this request. This will create a revision.
						{:else}
							Choose the request you want to submit a quote for.
						{/if}
					</p>

					<!-- Request Selection Dropdown -->
					<div class="mb-6">
						<label for="request-select" class="mb-2 block text-sm font-medium text-slate-300">
							Select Request
						</label>
						<select
							id="request-select"
							bind:value={selectedRequestId}
							on:change={handleRequestSelection}
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						>
							<option value="">Choose a request...</option>
							{#each availableRequests as req}
								<option value={req.id}>
									{req.title} - {req.status} - {req.customerId}
								</option>
							{/each}
						</select>
					</div>

					<!-- Selected Request Info -->
					{#if selectedRequestId}
						{@const selectedRequest = availableRequests.find((req) => req.id === selectedRequestId)}
						{#if selectedRequest}
							<div class="rounded-lg border border-slate-600 bg-slate-700/50 p-4 text-left">
								<h4 class="mb-2 font-semibold text-slate-100">{selectedRequest.title}</h4>
								<p class="mb-2 text-sm text-slate-300">{selectedRequest.description}</p>
								<div class="flex items-center gap-4 text-xs text-slate-400">
									<span>Status: {selectedRequest.status}</span>
									<span>Type: {requestType}</span>
									{#if isRevision}
										<span class="text-emerald-400">Revision Mode</span>
									{:else}
										<span class="text-blue-400">New Quote</span>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Step 2: File Upload -->
			{#if currentStep === 2}
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
					>
						<svg
							class="h-8 w-8 text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-slate-100">Upload Your Quote Documents</h3>
					<p class="mb-6 text-slate-400">
						Upload your quote files. We'll help you complete any missing information.
					</p>

					<!-- Custom File Input Area -->
					<div class="relative">
						<input
							bind:this={fileInput}
							type="file"
							multiple
							accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.dwg,.dxf"
							on:change={handleFileSelected}
							class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						/>
						<div
							class="w-full cursor-pointer rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/50 p-8 text-center transition-colors hover:border-emerald-500 hover:bg-slate-700/70"
						>
							<div class="flex flex-col items-center gap-2">
								<svg
									class="h-8 w-8 text-slate-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								<p class="font-medium text-slate-300">
									{#if selectedFiles.length === 0}
										Click to choose files or drag and drop
									{:else}
										{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
									{/if}
								</p>
								<p class="text-xs text-slate-400">
									{#if selectedFiles.length === 0}
										Maximum {MAX_FILES} files, 30MB each
									{:else}
										Click to add more files
									{/if}
								</p>
							</div>
						</div>
					</div>
					<p class="mt-2 text-xs text-slate-400">
						Maximum {MAX_FILES} files, 30MB each. Supported: PDF, Word, Excel, Images, CAD files
					</p>

					<!-- Selected Files Preview -->
					{#if selectedFiles.length > 0}
						<div class="mt-6 space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-slate-200"
									>Selected Files ({selectedFiles.length})</span
								>
								<button
									type="button"
									on:click={clearFiles}
									class="text-xs text-red-400 hover:text-red-300"
								>
									Clear All
								</button>
							</div>
							<div class="scrollable-content max-h-32 space-y-1 overflow-y-auto">
								{#each selectedFiles as file, index}
									<div class="flex items-center gap-2 rounded-lg bg-slate-700/50 p-2">
										<span class="text-lg">{getFileIcon(file.name)}</span>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm text-slate-200">{file.name}</p>
											<p class="text-xs text-slate-400">{formatBytes(file.size)}</p>
										</div>
										<button
											type="button"
											on:click={() => removeFile(index)}
											class="rounded p-1 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
											aria-label="Remove {file.name}"
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
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 3: Basic Information -->
			{#if currentStep === 3}
				<div>
					<h3 class="mb-4 text-lg font-semibold text-slate-100">Basic Quote Information</h3>

					<!-- Request Selection -->
					<div class="mb-4 space-y-2">
						<label for="request" class="block text-sm font-medium text-slate-200"
							>Select Request</label
						>
						<select
							id="request"
							bind:value={selectedRequestId}
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
						>
							{#if request}
								<option value={requestId}>{request.title} - {request.status}</option>
							{/if}
							{#each filteredRequests as req}
								<option value={req.id}>{req.title} - {req.status}</option>
							{/each}
						</select>
					</div>

					<!-- Quote Title -->
					<div class="mb-4 space-y-2">
						<label for="title" class="block text-sm font-medium text-slate-200">Quote Title *</label
						>
						<input
							id="title"
							type="text"
							bind:value={title}
							placeholder="Enter quote title"
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
							required
						/>
					</div>

					<!-- Description -->
					<div class="mb-4 space-y-2">
						<label for="description" class="block text-sm font-medium text-slate-200"
							>Description</label
						>
						<textarea
							id="description"
							bind:value={description}
							rows="3"
							placeholder="Enter quote description"
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Step 4: Smart Questions -->
			{#if currentStep === 4}
				<div>
					{#if isAnalyzing}
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20"
							>
								<svg
									class="h-8 w-8 animate-spin text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-lg font-semibold text-slate-100">
								Preparing Additional Questions
							</h3>
							<p class="text-slate-400">
								We're preparing some additional questions to help complete your quote...
							</p>
						</div>
					{:else if showSmartQuestions && smartQuestions.length > 0}
						<div>
							<h3 class="mb-4 text-lg font-semibold text-slate-100">Additional Information</h3>
							<p class="mb-6 text-slate-400">
								Please provide any missing information that might not be included in your uploaded
								documents:
							</p>

							<div class="space-y-4">
								{#each smartQuestions as question}
									<div class="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
										<p class="mb-3 text-sm text-slate-200">{question.question}</p>
										{#if question.field === 'validityDays'}
											<input
												type="number"
												bind:value={question.value}
												on:input={(e) => handleSmartQuestionInput(e, question.id)}
												placeholder="Enter validity in days"
												min="1"
												max="365"
												class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
											/>
										{:else if question.field === 'amount'}
											<div class="flex">
												<select
													bind:value={currency}
													class="rounded-l-lg border border-r-0 border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
												>
													<option value="INR">INR</option>
													<option value="USD">USD</option>
													<option value="EUR">EUR</option>
												</select>
												<input
													type="number"
													bind:value={question.value}
													on:input={(e) => handleSmartQuestionInput(e, question.id)}
													placeholder="0.00"
													step="0.01"
													min="0"
													class="w-full rounded-r-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
												/>
											</div>
										{:else}
											<input
												type="text"
												bind:value={question.value}
												on:input={(e) => handleSmartQuestionInput(e, question.id)}
												placeholder="Enter your answer..."
												class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
											/>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="text-center">
							<h3 class="mb-2 text-lg font-semibold text-slate-100">No Additional Questions</h3>
							<p class="text-slate-400">
								Your documents contain all the necessary information. You can proceed to review.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 5: Review & Submit -->
			{#if currentStep === 5}
				<div>
					<h3 class="mb-4 text-lg font-semibold text-slate-100">Review Your Quote</h3>

					<div class="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<span class="text-sm font-medium text-slate-400">Request</span>
								<p class="text-slate-200">{request?.title || 'No request selected'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-slate-400">Quote Title</span>
								<p class="text-slate-200">{title || 'Not specified'}</p>
							</div>
							{#if amount}
								<div>
									<span class="text-sm font-medium text-slate-400">Amount</span>
									<p class="text-slate-200">{currency} {amount}</p>
								</div>
							{/if}
							<div>
								<span class="text-sm font-medium text-slate-400">Validity</span>
								<p class="text-slate-200">{validityDays} days</p>
							</div>
						</div>

						{#if description}
							<div>
								<span class="text-sm font-medium text-slate-400">Description</span>
								<p class="text-slate-200">{description}</p>
							</div>
						{/if}

						{#if selectedFiles.length > 0}
							<div>
								<span class="text-sm font-medium text-slate-400"
									>Attachments ({selectedFiles.length})</span
								>
								<div class="mt-2 space-y-1">
									{#each selectedFiles as file}
										<div class="flex items-center gap-2 text-sm text-slate-300">
											<span>{getFileIcon(file.name)}</span>
											<span>{file.name}</span>
											<span class="text-slate-500">({formatBytes(file.size)})</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Error/Success Messages -->
			{#if errorMessage}
				<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
					{errorMessage}
				</div>
			{/if}

			{#if successMessage}
				<div
					class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
				>
					{successMessage}
				</div>
			{/if}

			<!-- Navigation Actions -->
			<div class="flex gap-3 pt-4">
				{#if currentStep > 1 && !(requestId && requestId !== '' && currentStep === 2)}
					<button
						type="button"
						on:click={prevStep}
						class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-600"
					>
						Previous
					</button>
				{/if}

				<button
					type="button"
					on:click={handleClose}
					class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-600"
				>
					Cancel
				</button>

				{#if currentStep < 5}
					<button
						type="button"
						on:click={nextStep}
						disabled={!canProceedToNext}
						class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if currentStep === 1}
							Continue
						{:else if currentStep === 2}
							Continue
						{:else if currentStep === 3}
							Continue
						{:else if currentStep === 4}
							Continue
						{/if}
					</button>
				{:else}
					<button
						type="button"
						on:click={handleSubmit}
						disabled={!canSubmit || isUploading}
						class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isUploading}
							{isRevision ? 'Revising...' : 'Submitting...'}
						{:else}
							{isRevision ? 'Revise Quote' : 'Submit Quote'}
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 4px;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.6),
			rgba(5, 150, 105, 0.8)
		); /* emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		transition: all 0.2s ease;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 1));
		border-color: rgba(16, 185, 129, 0.4);
		transform: scale(1.1);
	}
	.scrollable-content::-webkit-scrollbar-corner {
		background: transparent;
	}
	/* Firefox */
	.scrollable-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
		color-scheme: dark;
	}
</style>
