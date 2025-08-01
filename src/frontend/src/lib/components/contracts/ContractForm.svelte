<!-- gefifi-2/src/frontend/src/lib/components/contracts/ContractForm.svelte -->
<script lang="ts">
	import type { Contract } from '$lib/types';
	import { createEventDispatcher } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { writable } from 'svelte/store';

	export let workRequestId: string | undefined = undefined;
	export let materialRequestId: string | undefined = undefined;
	export let customerId: string;
	export let expertSupplierId: string;

	const dispatch = createEventDispatcher();

	// Determine contract type and labels
	$: contractType = workRequestId ? 'expert_contract' : 'material_contract';
	$: isWorkContract = !!workRequestId;
	$: detailsLabel = isWorkContract ? 'Work Details' : 'Material & Delivery Details';
	$: detailsPlaceholder = isWorkContract
		? 'Describe the scope of work, tasks, deliverables...'
		: 'List the materials, quantities, and delivery terms...';

	// Basic required fields
	let workDetails = '';
	let agreementSummary = '';
	let contractDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

	// Financial fields
	let totalAmount: number | null = null;
	let paymentTerms = '';
	let advanceAmount: number | null = null;

	// Timeline fields
	let startDate = '';
	let expectedCompletionDate = '';

	// Legal fields
	let termsAndConditions = '';
	let warrantyPeriod = '';
	let cancellationPolicy = '';

	// Attachment handling
	let selectedFiles = writable<File[]>([]);
	let isUploadingFiles = false;

	// UI state
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	// File upload configuration
	const acceptedFileTypes = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/dwg',
		'application/dxf'
	];
	const maxFileSize = 25 * 1024 * 1024; // 25MB

	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';
		successMessage = '';

		// Validation
		if (!workDetails.trim() || !agreementSummary.trim()) {
			errorMessage = 'Work details and agreement summary are required.';
			isLoading = false;
			return;
		}

		if (!workRequestId && !materialRequestId) {
			errorMessage = 'A related Work Request or Material Request is required.';
			isLoading = false;
			return;
		}

		// Client-side validation for file count
		const fileCount = $selectedFiles.length;
		if (fileCount > 15) {
			errorMessage = 'Maximum 15 files allowed per contract.';
			isLoading = false;
			return;
		}

		try {
			// Prepare contract data
			const contractData: any = {
				customerId,
				expertSupplierId,
				workDetails: workDetails.trim(),
				agreementSummary: agreementSummary.trim(),
				contractDate
			};

			// Add request ID
			if (workRequestId) {
				contractData.workRequestId = workRequestId;
			} else if (materialRequestId) {
				contractData.materialRequestId = materialRequestId;
			}

			// Add optional financial fields
			if (totalAmount !== null && totalAmount > 0) {
				contractData.totalAmount = totalAmount;
			}
			if (paymentTerms.trim()) {
				contractData.paymentTerms = paymentTerms.trim();
			}
			if (advanceAmount !== null && advanceAmount > 0) {
				contractData.advanceAmount = advanceAmount;
			}

			// Add optional timeline fields
			if (startDate) {
				contractData.startDate = startDate;
			}
			if (expectedCompletionDate) {
				contractData.expectedCompletionDate = expectedCompletionDate;
			}

			// Add optional legal fields
			if (termsAndConditions.trim()) {
				contractData.termsAndConditions = termsAndConditions.trim();
			}
			if (warrantyPeriod.trim()) {
				contractData.warrantyPeriod = warrantyPeriod.trim();
			}
			if (cancellationPolicy.trim()) {
				contractData.cancellationPolicy = cancellationPolicy.trim();
			}

			// Create the contract
			const createdContract = await apiClient.createContract(contractData);

			// Upload attachments if any files are selected
			if (fileCount > 0) {
				isUploadingFiles = true;
				try {
					const formData = new FormData();
					$selectedFiles.forEach((file) => {
						formData.append('files', file);
					});

					await apiClient.uploadEntityAttachments('contracts', createdContract.id, formData);
				} catch (attachmentError: any) {
					console.error('Error uploading contract attachments:', attachmentError);
					// Don't fail the entire contract creation, but show a warning
					errorMessage = `Contract created successfully, but failed to upload some attachments: ${attachmentError.message || 'Unknown error'}`;
				} finally {
					isUploadingFiles = false;
				}
			}

			if (!errorMessage) {
				successMessage = `Contract (ID: ${createdContract.id.substring(0, 8)}) created successfully!`;

				// Clear form
				clearForm();

				// Dispatch success event
				dispatch('contractCreated', createdContract);
			}
		} catch (error: any) {
			console.error('Error creating contract:', error);
			errorMessage = error.message || 'An unexpected error occurred while creating the contract.';
		} finally {
			isLoading = false;
		}
	}

	function clearForm() {
		workDetails = '';
		agreementSummary = '';
		totalAmount = null;
		paymentTerms = '';
		advanceAmount = null;
		startDate = '';
		expectedCompletionDate = '';
		termsAndConditions = '';
		warrantyPeriod = '';
		cancellationPolicy = '';
		selectedFiles.set([]);
	}
</script>

<div class="space-y-6 rounded-lg bg-slate-700 p-6 shadow-xl">
	<h2 class="text-2xl font-semibold text-sky-300">
		Create New {contractType === 'expert_contract' ? 'Expert' : 'Material'} Contract
	</h2>

	{#if errorMessage}
		<div class="rounded border border-red-700 bg-red-800/50 p-3 text-sm text-red-300">
			{errorMessage}
		</div>
	{/if}
	{#if successMessage}
		<div class="rounded border border-green-700 bg-green-800/50 p-3 text-sm text-green-300">
			{successMessage}
		</div>
	{/if}

	<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<!-- Basic Details Section -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-emerald-300">Basic Details</h3>

			<div>
				<label for="work-details" class="mb-1 block text-sm font-medium text-slate-300">
					{detailsLabel}
				</label>
				<textarea
					id="work-details"
					bind:value={workDetails}
					rows="4"
					class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
					placeholder={detailsPlaceholder}
					required
					disabled={isLoading || isUploadingFiles}
				/>
			</div>

			<div>
				<label for="agreement-summary" class="mb-1 block text-sm font-medium text-slate-300">
					Agreement Summary
				</label>
				<textarea
					id="agreement-summary"
					bind:value={agreementSummary}
					rows="3"
					class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
					placeholder="Summarize key terms, payment schedule, timelines, etc."
					required
					disabled={isLoading || isUploadingFiles}
				/>
			</div>

			<div>
				<label for="contract-date" class="mb-1 block text-sm font-medium text-slate-300">
					Contract Date
				</label>
				<input
					type="date"
					id="contract-date"
					bind:value={contractDate}
					class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500"
					disabled={isLoading || isUploadingFiles}
				/>
			</div>
		</div>

		<!-- Financial Terms Section -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-emerald-300">Financial Terms</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="total-amount" class="mb-1 block text-sm font-medium text-slate-300">
						Total Amount (₹)
					</label>
					<input
						type="number"
						id="total-amount"
						bind:value={totalAmount}
						min="0"
						step="0.01"
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="e.g., 50000"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>

				<div>
					<label for="advance-amount" class="mb-1 block text-sm font-medium text-slate-300">
						Advance Amount (₹)
					</label>
					<input
						type="number"
						id="advance-amount"
						bind:value={advanceAmount}
						min="0"
						step="0.01"
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="e.g., 25000"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>
			</div>

			<div>
				<label for="payment-terms" class="mb-1 block text-sm font-medium text-slate-300">
					Payment Terms
				</label>
				<input
					type="text"
					id="payment-terms"
					bind:value={paymentTerms}
					class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
					placeholder="e.g., 50% advance, 50% on completion"
					disabled={isLoading || isUploadingFiles}
				/>
			</div>
		</div>

		<!-- Timeline Section -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-emerald-300">Timeline</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="start-date" class="mb-1 block text-sm font-medium text-slate-300">
						Start Date
					</label>
					<input
						type="date"
						id="start-date"
						bind:value={startDate}
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>

				<div>
					<label for="expected-completion" class="mb-1 block text-sm font-medium text-slate-300">
						Expected Completion Date
					</label>
					<input
						type="date"
						id="expected-completion"
						bind:value={expectedCompletionDate}
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>
			</div>
		</div>

		<!-- Legal & Compliance Section -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-emerald-300">Legal & Compliance</h3>

			<div>
				<label for="terms-conditions" class="mb-1 block text-sm font-medium text-slate-300">
					Terms & Conditions
				</label>
				<textarea
					id="terms-conditions"
					bind:value={termsAndConditions}
					rows="3"
					class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
					placeholder="Detailed terms, conditions, and legal requirements..."
					disabled={isLoading || isUploadingFiles}
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="warranty-period" class="mb-1 block text-sm font-medium text-slate-300">
						Warranty Period
					</label>
					<input
						type="text"
						id="warranty-period"
						bind:value={warrantyPeriod}
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="e.g., 6 months, 1 year"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>

				<div>
					<label for="cancellation-policy" class="mb-1 block text-sm font-medium text-slate-300">
						Cancellation Policy
					</label>
					<input
						type="text"
						id="cancellation-policy"
						bind:value={cancellationPolicy}
						class="w-full rounded-md border-slate-600 bg-slate-800 p-2.5 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
						placeholder="e.g., 48-hour notice required"
						disabled={isLoading || isUploadingFiles}
					/>
				</div>
			</div>
		</div>

		<!-- Attachments Section -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-emerald-300">Contract Documents</h3>
			<FileUpload {acceptedFileTypes} {maxFileSize} multiple={true} bind:files={selectedFiles} />
			<p class="text-xs text-slate-400">
				Attach relevant documents like specifications, blueprints, terms documents, etc. (Max 15
				files, 25MB total)
			</p>
		</div>

		<!-- Request Info -->
		<div class="rounded-md border border-slate-600/50 bg-slate-800/30 p-4">
			<p class="text-xs text-slate-400">
				{#if workRequestId}
					<strong>Work Request ID:</strong> {workRequestId}
				{:else if materialRequestId}
					<strong>Material Request ID:</strong> {materialRequestId}
				{/if}
				<br />
				<strong>Customer ID:</strong>
				{customerId || 'N/A'}<br />
				<strong>Expert/Supplier ID:</strong>
				{expertSupplierId || 'N/A'}
			</p>
		</div>

		<!-- Submit Button -->
		<div class="flex justify-end pt-4">
			<button
				type="submit"
				class="rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={isLoading || isUploadingFiles || successMessage !== ''}
			>
				{#if isLoading}
					<svg
						class="mr-2 inline h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					Creating Contract...
				{:else if isUploadingFiles}
					<svg
						class="mr-2 inline h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					Uploading Files...
				{:else}
					Create Contract Draft
				{/if}
			</button>
		</div>
	</form>
</div>
