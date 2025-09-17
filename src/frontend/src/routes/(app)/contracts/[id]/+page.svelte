<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/[id]/+page.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import AttachmentList from '$lib/components/AttachmentList.svelte';
	import UserProfile from '$lib/components/UserProfile.svelte';
	import ContractComments from '$lib/components/ContractComments.svelte';
	import ContractLinking from '$lib/components/contracts/ContractLinking.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import type { Contract, Attachment } from '$lib/types';
	import type { Unsubscriber } from 'svelte/store';
	import Avatar from '$lib/components/Avatar.svelte';
	import { writable } from 'svelte/store';

	// Define UserProfile, similar to other pages
	type UserProfile = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			// Profile is optional itself
			fullName?: string;
			companyName?: string;
			expertise?: string;
			category?: string;
			location?: string;
			avatarUrl?: string;
		};
	};

	// Define RequestInfo for fetching title
	type RequestInfo = {
		id: string;
		title: string;
	};

	type ContractDetail = Contract & {
		// For display - to be fetched or passed
		customerName?: string;
		customerAvatarUrl?: string;
		expertSupplierName?: string;
		expertSupplierAvatarUrl?: string;
		requestTitle?: string;
	};

	let currentUser: AuthUser | null = null;
	let token: string | null = null;
	let contract: ContractDetail | null = null;
	let customerProfile: AuthUser | null = null;
	let expertSupplierProfile: AuthUser | null = null;
	let isLoading = true;
	let errorMessage = '';
	let chatId: string | null = null;
	let contractIdFromUrl: string | null = null;
	let isSigning = false;
	let signMessage = '';

	// Signature modal state
	let showSignatureModal = false;
	let signatureComment = '';
	let signatureFiles = writable<File[]>([]);
	let isSignatureCommentValid = false;

	// Revision request modal state
	let showRevisionModal = false;
	let revisionComment = '';
	let revisionFiles = writable<File[]>([]);
	let isRevisionCommentValid = false;
	let isSubmittingRevision = false;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	async function fetchContractDetails(id: string) {
		isLoading = true;
		errorMessage = '';
		if (!token) {
			errorMessage = 'Authentication token not available.';
			isLoading = false;
			return;
		}
		try {
			// First, fetch the contract itself
			const response = await fetch(`${API_BASE_URL}/api/contracts/${id}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to fetch contract details' }));
				throw new Error(errorData.message);
			}
			const fetchedContract: ContractDetail = await response.json();

			// Fetch related details - customer name, expert/supplier name, request title
			try {
				// Fetch Customer Profile
				if (fetchedContract.customerId) {
					const customerRes = await fetch(
						`${API_BASE_URL}/api/users/${fetchedContract.customerId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (customerRes.ok) {
						const customerData: AuthUser = await customerRes.json();
						customerProfile = customerData;
						fetchedContract.customerName =
							customerData.profile?.fullName ||
							customerData.email.split('@')[0] ||
							`Customer ${fetchedContract.customerId.substring(0, 8)}`;

						fetchedContract.customerAvatarUrl = customerData.profile?.avatarUrl;
					} else {
						console.warn(
							`Failed to fetch customer profile ${fetchedContract.customerId}: ${customerRes.statusText}`
						);
						fetchedContract.customerName = `Customer ${fetchedContract.customerId.substring(0, 8)} (Details N/A)`;
						fetchedContract.customerAvatarUrl = '/images/default-avatar.png';
					}
				}

				// Fetch Expert/Supplier Profile
				if (fetchedContract.expertSupplierId) {
					const providerRes = await fetch(
						`${API_BASE_URL}/api/users/${fetchedContract.expertSupplierId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (providerRes.ok) {
						const providerData: AuthUser = await providerRes.json();
						expertSupplierProfile = providerData;

						if (providerData.userType === 'supplier' && providerData.profile?.companyName) {
							fetchedContract.expertSupplierName = providerData.profile.companyName;
							fetchedContract.expertSupplierAvatarUrl = providerData.profile.avatarUrl;
						} else if (providerData.profile?.fullName) {
							fetchedContract.expertSupplierName = providerData.profile.fullName;
							fetchedContract.expertSupplierAvatarUrl = providerData.profile.avatarUrl;
						} else {
							fetchedContract.expertSupplierName =
								providerData.email.split('@')[0] ||
								`${providerData.userType.charAt(0).toUpperCase() + providerData.userType.slice(1)} ${fetchedContract.expertSupplierId.substring(0, 8)}`;
							fetchedContract.expertSupplierAvatarUrl = '/images/default-avatar.png';
						}
					} else {
						console.warn(
							`Failed to fetch provider profile ${fetchedContract.expertSupplierId}: ${providerRes.statusText}`
						);
						fetchedContract.expertSupplierName = `Provider ${fetchedContract.expertSupplierId.substring(0, 8)} (Details N/A)`;
					}
				}

				// Fetch Request Title (Work Request or Material Request)
				if (fetchedContract.workRequestId) {
					const wrRes = await fetch(
						`${API_BASE_URL}/api/work-requests/${fetchedContract.workRequestId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (wrRes.ok) {
						const wrData: RequestInfo = await wrRes.json();
						fetchedContract.requestTitle =
							wrData.title || `Work Request ${fetchedContract.workRequestId.substring(0, 8)}`;
					} else {
						console.warn(
							`Failed to fetch work request ${fetchedContract.workRequestId}: ${wrRes.statusText}`
						);
						fetchedContract.requestTitle = `Work Request ${fetchedContract.workRequestId.substring(0, 8)} (Title N/A)`;
					}
				} else if (fetchedContract.materialRequestId) {
					const mrRes = await fetch(
						`${API_BASE_URL}/api/material-requests/${fetchedContract.materialRequestId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (mrRes.ok) {
						const mrData: RequestInfo = await mrRes.json();
						fetchedContract.requestTitle =
							mrData.title ||
							`Material Request ${fetchedContract.materialRequestId.substring(0, 8)}`;
					} else {
						console.warn(
							`Failed to fetch material request ${fetchedContract.materialRequestId}: ${mrRes.statusText}`
						);
						fetchedContract.requestTitle = `Material Request ${fetchedContract.materialRequestId.substring(0, 8)} (Title N/A)`;
					}
				} else {
					fetchedContract.requestTitle = 'N/A (No associated request)';
				}
			} catch (detailError: any) {
				console.error('Error fetching related contract details:', detailError);
				// Set fallback names if related details fetching fails
				if (!fetchedContract.customerName)
					fetchedContract.customerName = `Customer ${fetchedContract.customerId.substring(0, 8)} (Details Error)`;
				if (!fetchedContract.customerAvatarUrl)
					fetchedContract.customerAvatarUrl = '/images/default-avatar.png';
				if (!fetchedContract.expertSupplierName)
					fetchedContract.expertSupplierName = `Provider ${fetchedContract.expertSupplierId.substring(0, 8)} (Details Error)`;
				if (!fetchedContract.expertSupplierAvatarUrl)
					fetchedContract.expertSupplierAvatarUrl = '/images/default-avatar.png';
				if (!fetchedContract.requestTitle) {
					const requestId = fetchedContract.workRequestId || fetchedContract.materialRequestId;
					const requestType = fetchedContract.workRequestId ? 'Work Request' : 'Material Request';
					fetchedContract.requestTitle = requestId
						? `${requestType} ${requestId.substring(0, 8)} (Title Error)`
						: 'N/A (Error fetching request)';
				}
			}

			contract = fetchedContract;

			// After successfully fetching contract, find the chat ID
			if (contract) {
				await findChatId(contract.customerId, contract.expertSupplierId);
			}
		} catch (err: any) {
			console.error('Fetch contract detail error:', err);
			errorMessage = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function findChatId(party1: string, party2: string) {
		if (!token) return;
		try {
			const response = await fetch(`${API_BASE_URL}/api/chat`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const chats = await response.json();

				// Find the chat that includes both the customer and the expert/supplier.
				// This is more reliable than checking for a request ID, which is removed
				// from the chat after a contract is created.
				const relevantChat = chats.find(
					(chat: any) =>
						chat.participants.length === 2 &&
						chat.participants.includes(party1) &&
						chat.participants.includes(party2)
				);
				if (relevantChat) {
					chatId = relevantChat.id;
				} else {
					console.warn('Could not find a chat between the contract parties.');
				}
			}
		} catch (error) {
			console.error('Failed to find chat ID:', error);
		}
	}

	function openSignatureModal() {
		if (!contract || !currentUser || !token) return;
		if (
			(currentUser.id === contract.customerId && contract.customerSigned) ||
			(currentUser.id === contract.expertSupplierId && contract.expertSupplierSigned)
		) {
			signMessage = 'You have already signed this contract.';
			return;
		}

		showSignatureModal = true;
		signatureComment = '';
		signatureFiles.set([]);
		isSignatureCommentValid = false;
	}

	function closeSignatureModal() {
		showSignatureModal = false;
		signMessage = '';
	}

	function openRevisionModal() {
		if (!contract || !currentUser || !token) return;

		// Check if user is a contract participant
		if (currentUser.id !== contract.customerId && currentUser.id !== contract.expertSupplierId) {
			return;
		}

		// Check if contract is in a state where revision can be requested
		// Currently both parties can request revisions, but this may change in the future
		if (!['draft', 'awaiting_signatures', 'signed'].includes(contract.status)) {
			return;
		}

		showRevisionModal = true;
		revisionComment = '';
		revisionFiles.set([]);
		isRevisionCommentValid = false;
	}

	function closeRevisionModal() {
		showRevisionModal = false;
	}

	async function handleRevisionRequest() {
		if (!contract || !currentUser || !token) return;

		isSubmittingRevision = true;

		try {
			// Prepare the request body
			const requestBody: any = {
				comment: revisionComment.trim(),
				type: 'revision_request'
			};

			// If there are revision files, we need to use FormData
			if ($revisionFiles.length > 0) {
				const formData = new FormData();
				formData.append('comment', revisionComment.trim());
				formData.append('type', 'revision_request');

				$revisionFiles.forEach((file: File) => {
					formData.append('files', file);
				});

				const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/comments`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`
					},
					body: formData
				});

				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.message || 'Failed to submit revision request.');
				}

				// Update the contract with the new comment and status
				contract = {
					...contract,
					...result.contract,
					// Keep fetched names if result doesn't include them
					customerName: contract?.customerName,
					expertSupplierName: contract?.expertSupplierName,
					requestTitle: contract?.requestTitle
				};

				closeRevisionModal();
			} else {
				// No files, use JSON request
				const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/comments`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify(requestBody)
				});

				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.message || 'Failed to submit revision request.');
				}

				// Update the contract with the new comment and status
				contract = {
					...contract,
					...result.contract,
					// Keep fetched names if result doesn't include them
					customerName: contract?.customerName,
					expertSupplierName: contract?.expertSupplierName,
					requestTitle: contract?.requestTitle
				};

				closeRevisionModal();
			}
		} catch (error: any) {
			console.error('Error submitting revision request:', error);
			// You could add a toast notification here
		} finally {
			isSubmittingRevision = false;
		}
	}

	async function handleSignContract() {
		if (!contract || !currentUser || !token) return;

		isSigning = true;
		signMessage = '';

		try {
			// Prepare the request body
			const requestBody: any = {};

			// If there's a signature comment, add it to the request
			if (signatureComment.trim()) {
				requestBody.signatureComment = signatureComment.trim();
			}

			// If there are signature files, we need to use FormData
			if ($signatureFiles.length > 0) {
				const formData = new FormData();
				if (signatureComment.trim()) {
					formData.append('signatureComment', signatureComment.trim());
				}

				$signatureFiles.forEach((file: File) => {
					formData.append('signatureFiles', file);
				});

				const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/sign`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${token}`
					},
					body: formData
				});

				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.message || 'Failed to sign contract.');
				}

				signMessage = result.message || 'Contract signed successfully!';
				closeSignatureModal();

				// Refresh contract details to show new status and signatures
				if (result.id) {
					contract = {
						...contract,
						...result,
						// Keep fetched names if result doesn't include them
						customerName: contract?.customerName,
						expertSupplierName: contract?.expertSupplierName,
						requestTitle: contract?.requestTitle
					};
				} else {
					fetchContractDetails(contract.id);
				}
			} else {
				// No files, use JSON request
				const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/sign`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined
				});

				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.message || 'Failed to sign contract.');
				}

				signMessage = result.message || 'Contract signed successfully!';
				closeSignatureModal();

				// Refresh contract details to show new status and signatures
				if (result.id) {
					contract = {
						...contract,
						...result,
						// Keep fetched names if result doesn't include them
						customerName: contract?.customerName,
						expertSupplierName: contract?.expertSupplierName,
						requestTitle: contract?.requestTitle
					};
				} else {
					fetchContractDetails(contract.id);
				}
			}
		} catch (error: any) {
			console.error('Error signing contract:', error);
			signMessage = `Error: ${error.message}`;
		} finally {
			isSigning = false;
		}
	}

	async function handleAddComment(event: CustomEvent) {
		if (!contract || !currentUser || !token) return;

		const { comment, type, files } = event.detail;

		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/comments`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				},
				body: (() => {
					const formData = new FormData();
					formData.append('comment', comment);
					formData.append('type', type);

					if (files && files.length > 0) {
						files.forEach((file: File) => {
							formData.append('files', file);
						});
					}

					return formData;
				})()
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to add comment.');
			}

			// Update the contract with the new comment
			contract = {
				...contract,
				...result.contract,
				// Keep fetched names if result doesn't include them
				customerName: contract?.customerName,
				expertSupplierName: contract?.expertSupplierName,
				requestTitle: contract?.requestTitle
			};
		} catch (error: any) {
			console.error('Error adding comment:', error);
			// You could add a toast notification here
		}
	}

	onMount(() => {
		contractIdFromUrl = $page.params.id;
		let unsubscribe: Unsubscriber;
		if (contractIdFromUrl) {
			unsubscribe = authStore.subscribe((auth) => {
				if (auth.token && auth.user && !auth.isLoading) {
					token = auth.token;
					currentUser = auth.user;
					fetchContractDetails(contractIdFromUrl!);
				} else if (!auth.isLoading && (!auth.token || !auth.user)) {
					errorMessage = 'User not authenticated. Cannot load details.';
					isLoading = false;
				}
			});
		} else {
			errorMessage = 'Contract ID not found in URL.';
			isLoading = false;
		}

		const unsubscribePage = page.subscribe((page) => {
			if (page.params.id) {
				contractIdFromUrl = page.params.id;
				fetchContractDetails(contractIdFromUrl!);
			}
		});

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
			if (unsubscribePage) {
				unsubscribePage();
			}
		};
	});

	function getStatusClass(status: string | undefined, type: 'badge' | 'text' = 'badge') {
		if (!status) return type === 'badge' ? 'bg-slate-700 text-slate-400' : 'text-slate-400';
		const baseClasses: Record<string, { badge: string; text: string }> = {
			draft: {
				badge: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
				text: 'text-yellow-300'
			},
			awaiting_signatures: {
				badge: 'bg-sky-500/20 border-sky-500/50 text-sky-300',
				text: 'text-sky-300'
			},
			signed: {
				badge: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
				text: 'text-emerald-300'
			},
			in_progress: {
				badge: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
				text: 'text-blue-300'
			},
			completed: {
				badge: 'bg-green-600/30 border-green-600/60 text-green-300',
				text: 'text-green-300'
			},
			disputed: { badge: 'bg-red-500/20 border-red-500/50 text-red-300', text: 'text-red-300' },
			cancelled: {
				badge: 'bg-slate-600/30 border-slate-500/50 text-slate-400',
				text: 'text-slate-400'
			},
			terminated: {
				badge: 'bg-orange-600/30 border-orange-500/50 text-orange-300',
				text: 'text-orange-300'
			},
			default: { badge: 'bg-gray-500/20 border-gray-500/50 text-gray-300', text: 'text-gray-300' }
		};
		return (baseClasses[status] || baseClasses.default)[type];
	}

	function formatOptionalDate(timestamp?: string) {
		if (!timestamp) return 'Not signed';
		return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function formatCurrency(amount?: number) {
		if (!amount && amount !== 0) return 'Not specified';
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
	}

	function formatDate(dateStr?: string) {
		if (!dateStr) return 'Not specified';
		return new Date(dateStr).toLocaleDateString('en-GB', { dateStyle: 'medium' });
	}

	$: canCurrentUserSign =
		contract &&
		currentUser &&
		(contract.status === 'draft' || contract.status === 'awaiting_signatures') &&
		((currentUser.id === contract.customerId && !contract.customerSigned) ||
			(currentUser.id === contract.expertSupplierId && !contract.expertSupplierSigned));

	// Check if user can request revision
	$: canRequestRevision =
		contract &&
		currentUser &&
		// Currently both parties can request revisions, but this may change in the future
		(currentUser.id === contract.customerId || currentUser.id === contract.expertSupplierId) &&
		['draft', 'awaiting_signatures'].includes(contract.status) &&
		contract.status !== 'revision_requested';

	// Check if user can edit contract (contract creator - currently customer)
	$: canEditContract =
		contract &&
		currentUser &&
		contract.status === 'revision_requested' &&
		// Currently only customer can edit, but this may change in the future
		currentUser.id === contract.customerId;

	$: contractTypeLabel =
		contract?.contractType === 'expert_contract' ? 'Expert Contract' : 'Material Contract';
	$: relatedRequestUrl = contract?.workRequestId
		? `/work-requests/${contract.workRequestId}`
		: contract?.materialRequestId
			? `/material-requests/${contract.materialRequestId}`
			: null;

	// Signature comment validation
	$: {
		// Remove leading spaces
		if (signatureComment && signatureComment !== signatureComment.trimStart()) {
			signatureComment = signatureComment.trimStart();
		}

		// Validate signature comment length (minimum 1 character for emojis)
		const trimmedComment = signatureComment.trim();
		if (trimmedComment.length === 0) {
			isSignatureCommentValid = false;
		} else {
			isSignatureCommentValid = true;
		}
	}

	// Revision comment validation
	$: {
		// Remove leading spaces
		if (revisionComment && revisionComment !== revisionComment.trimStart()) {
			revisionComment = revisionComment.trimStart();
		}

		// Validate revision comment length (minimum 1 character for emojis)
		const trimmedRevisionComment = revisionComment.trim();
		if (trimmedRevisionComment.length === 0) {
			isRevisionCommentValid = false;
		} else {
			isRevisionCommentValid = true;
		}
	}
</script>

<svelte:head>
	<title>{contract ? `Contract: ${contract.requestTitle}` : 'Contract Details'} - GEFIFI</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 pb-12">
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
				<p class="text-xl text-slate-300">Loading Contract Details...</p>
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
			<h2 class="mb-3 text-2xl font-bold text-red-300">Unable to Load Contract</h2>
			<p class="mb-6 text-red-200/80">{errorMessage}</p>
			<button
				on:click={() => goto('/contracts')}
				class="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				← Back to Contracts
			</button>
		</div>
	{:else if contract}
		<!-- Header Section -->
		<header
			class="rounded-2xl border border-slate-600/30 bg-gradient-to-r from-slate-800/60 to-slate-700/60 p-6 shadow-2xl backdrop-blur-sm lg:p-8"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-emerald-500/20 p-2">
							<svg
								class="h-6 w-6 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</span>
						<div>
							<h1 class="text-2xl font-bold text-emerald-400 lg:text-3xl">{contractTypeLabel}</h1>
							<p class="text-slate-400">Contract ID: {contract.id.substring(0, 12)}...</p>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class="rounded-full border px-4 py-2 text-sm font-semibold {getStatusClass(
								contract.status,
								'badge'
							)}"
						>
							{contract.status.replace(/_/g, ' ').toUpperCase()}
						</span>
						<div class="flex flex-wrap items-center gap-2">
							{#if relatedRequestUrl}
								<a
									href={relatedRequestUrl}
									class="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
									View Related Request
								</a>
							{/if}
							<!-- Chat with Other Party -->
							{#if currentUser && contract && chatId}
								<a
									href="/chat/{chatId}"
									class="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									Continue Chat
								</a>
							{/if}
						</div>
					</div>
				</div>
				<div class="text-right">
					<p class="text-sm text-slate-400">Contract Date</p>
					<p class="text-lg font-semibold text-slate-200">
						{formatDate(contract.contractDate)}
					</p>
				</div>
			</div>
		</header>

		<!-- Main Content Grid -->
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left Column: Main Details -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Agreement Summary -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-sky-500/20 p-2">
							<svg
								class="h-5 w-5 text-sky-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-bold text-sky-300">Project Overview</h2>
					</div>
					<div class="space-y-4">
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Related Request
							</h3>
							<p class="text-lg font-medium text-slate-200">{contract.requestTitle}</p>
						</div>
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Agreement Summary
							</h3>
							<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
								{contract.agreementSummary || 'No summary provided.'}
							</p>
						</div>
						<div>
							<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
								Detailed Scope
							</h3>
							<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
								{contract.workDetails || 'No details provided.'}
							</p>
						</div>
					</div>
				</section>

				<!-- Financial & Timeline Section -->
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Financial Terms -->
					<section
						class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="rounded-lg bg-green-500/20 p-2">
								<svg
									class="h-5 w-5 text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-green-300">Financial Terms</h2>
						</div>
						<div class="space-y-3">
							<div class="flex items-center justify-between border-b border-slate-600/50 py-2">
								<span class="text-slate-400">Total Amount</span>
								<span class="font-semibold text-slate-200"
									>{formatCurrency(contract.totalAmount)}</span
								>
							</div>
							<div class="flex items-center justify-between border-b border-slate-600/50 py-2">
								<span class="text-slate-400">Advance Amount</span>
								<span class="font-semibold text-slate-200"
									>{formatCurrency(contract.advanceAmount)}</span
								>
							</div>
							{#if contract.paymentTerms}
								<div class="pt-2">
									<p class="mb-1 text-sm text-slate-400">Payment Terms</p>
									<p class="text-slate-300">{contract.paymentTerms}</p>
								</div>
							{/if}
						</div>
					</section>

					<!-- Timeline -->
					<section
						class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="rounded-lg bg-blue-500/20 p-2">
								<svg
									class="h-5 w-5 text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-blue-300">Timeline</h2>
						</div>
						<div class="space-y-3">
							<div class="flex items-center justify-between border-b border-slate-600/50 py-2">
								<span class="text-slate-400">Start Date</span>
								<span class="font-semibold text-slate-200">{formatDate(contract.startDate)}</span>
							</div>
							<div class="flex items-center justify-between border-b border-slate-600/50 py-2">
								<span class="text-slate-400">Expected Completion</span>
								<span class="font-semibold text-slate-200"
									>{formatDate(contract.expectedCompletionDate)}</span
								>
							</div>
							{#if contract.actualCompletionDate}
								<div class="flex items-center justify-between border-b border-slate-600/50 py-2">
									<span class="text-slate-400">Actual Completion</span>
									<span class="font-semibold text-green-300"
										>{formatDate(contract.actualCompletionDate)}</span
									>
								</div>
							{/if}
						</div>
					</section>
				</div>

				<!-- Legal & Compliance -->
				{#if contract.termsAndConditions || contract.warrantyPeriod || contract.cancellationPolicy}
					<section
						class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="rounded-lg bg-purple-500/20 p-2">
								<svg
									class="h-5 w-5 text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-purple-300">Legal & Compliance</h2>
						</div>
						<div class="space-y-4">
							{#if contract.termsAndConditions}
								<div>
									<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">
										Terms & Conditions
									</h3>
									<p class="leading-relaxed whitespace-pre-wrap text-slate-300">
										{contract.termsAndConditions}
									</p>
								</div>
							{/if}
							{#if contract.warrantyPeriod || contract.cancellationPolicy}
								<div class="grid gap-4 md:grid-cols-2">
									{#if contract.warrantyPeriod}
										<div>
											<h3 class="mb-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">
												Warranty Period
											</h3>
											<p class="text-slate-300">{contract.warrantyPeriod}</p>
										</div>
									{/if}
									{#if contract.cancellationPolicy}
										<div>
											<h3 class="mb-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">
												Cancellation Policy
											</h3>
											<p class="text-slate-300">{contract.cancellationPolicy}</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Attachments -->
				{#if contract.attachments && contract.attachments.length > 0}
					<section
						class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="rounded-lg bg-orange-500/20 p-2">
								<svg
									class="h-5 w-5 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
									/>
								</svg>
							</div>
							<h2 class="text-lg font-bold text-orange-300">Contract Documents</h2>
						</div>
						<AttachmentList attachments={contract.attachments} />
					</section>
				{/if}

				<!-- Contract Linking -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<ContractLinking {contract} {currentUser} />
				</section>

				<!-- Comments & Feedback -->
				<ContractComments
					{contract}
					{currentUser}
					{customerProfile}
					{expertSupplierProfile}
					on:addComment={handleAddComment}
				/>
			</div>

			<!-- Right Column: Signatures & Actions -->
			<div class="space-y-6">
				<!-- Signatures -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-5 w-5 text-emerald-400"
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
						</div>
						<h2 class="text-lg font-bold text-emerald-300">Signatures</h2>
					</div>
					<div class="space-y-4">
						<!-- Customer Signature -->
						<div class="rounded-xl bg-slate-700/50 p-4">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="font-semibold text-slate-300">Customer</h3>
								{#if contract.customerSigned}
									<span class="flex items-center gap-1 text-emerald-400">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Signed
									</span>
								{:else}
									<span class="text-yellow-400">Pending</span>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<Avatar url={contract.customerAvatarUrl} name={contract.customerName} />
								<div>
									<p class="text-sm font-medium text-slate-300">
										{contract.customerName || `ID: ${contract.customerId.substring(0, 8)}...`}
									</p>
									<p class="text-xs text-slate-500">
										{contract.customerSigned
											? formatOptionalDate(contract.customerSignatureTimestamp)
											: 'Awaiting signature'}
									</p>
								</div>
							</div>
						</div>

						<!-- Expert/Supplier Signature -->
						<div class="rounded-xl bg-slate-700/50 p-4">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="font-semibold text-slate-300">
									{contract.contractType === 'expert_contract' ? 'Expert' : 'Supplier'}
								</h3>
								{#if contract.expertSupplierSigned}
									<span class="flex items-center gap-1 text-emerald-400">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Signed
									</span>
								{:else}
									<span class="text-yellow-400">Pending</span>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<Avatar url={contract.expertSupplierAvatarUrl} name={contract.expertSupplierName} />
								<div>
									<p class="text-sm font-medium text-slate-300">
										{contract.expertSupplierName ||
											`ID: ${contract.expertSupplierId.substring(0, 8)}...`}
									</p>
									<p class="text-xs text-slate-500">
										{contract.expertSupplierSigned
											? formatOptionalDate(contract.expertSupplierSignatureTimestamp)
											: 'Awaiting signature'}
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- Sign Contract Action -->
				{#if canCurrentUserSign}
					<section
						class="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20"
							>
								<svg
									class="h-6 w-6 text-emerald-400"
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
							</div>
							<h2 class="mb-2 text-xl font-bold text-emerald-300">Ready to Sign?</h2>
							<p class="mb-4 text-sm text-slate-300">
								As the {currentUser?.id === contract.customerId
									? 'Customer'
									: contract.contractType === 'expert_contract'
										? 'Expert'
										: 'Supplier'}, you can sign this contract. Please review all details carefully.
							</p>
							<button
								on:click={openSignatureModal}
								disabled={isSigning}
								class="w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-500"
							>
								Sign Contract
							</button>
							{#if signMessage}
								<p
									class="mt-4 text-sm {signMessage.startsWith('Error:')
										? 'text-red-400'
										: 'text-emerald-400'}"
								>
									{signMessage}
								</p>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Request Revision Action -->
				{#if canRequestRevision}
					<section
						class="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20"
							>
								<svg
									class="h-6 w-6 text-orange-400"
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
							</div>
							<h2 class="mb-2 text-xl font-bold text-orange-300">Need Changes?</h2>
							<p class="mb-4 text-sm text-slate-300">
								Request revisions to this contract. This will pause the signing process until
								changes are made.
							</p>
							<button
								on:click={openRevisionModal}
								disabled={isSubmittingRevision}
								class="w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-orange-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-500"
							>
								Request Revision
							</button>
						</div>
					</section>
				{/if}

				<!-- Edit Contract Action -->
				{#if canEditContract}
					<section
						class="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 shadow-xl backdrop-blur-sm"
					>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20"
							>
								<svg
									class="h-6 w-6 text-blue-400"
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
							</div>
							<h2 class="mb-2 text-xl font-bold text-blue-300">Edit Contract</h2>
							<p class="mb-4 text-sm text-slate-300">
								Make changes to address the revision request. The contract will be ready for signing
								again after saving.
							</p>
							<a
								href="/contracts/edit?id={contract.id}"
								class="inline-block w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-600 hover:shadow-xl"
							>
								Edit Contract
							</a>
						</div>
					</section>
				{/if}

				<!-- Contract Metadata -->
				<section
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-slate-500/20 p-2">
							<svg
								class="h-5 w-5 text-slate-400"
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
						</div>
						<h2 class="text-lg font-bold text-slate-300">Contract Information</h2>
					</div>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-400">Created</span>
							<span class="text-slate-300">{formatDate(contract.createdAt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Last Updated</span>
							<span class="text-slate-300">{formatDate(contract.updatedAt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Type</span>
							<span class="text-slate-300">{contractTypeLabel}</span>
						</div>
					</div>
				</section>

				{#if contract.status === 'signed'}
					<div
						class="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 text-center shadow-xl backdrop-blur-sm"
					>
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
						>
							<svg
								class="h-8 w-8 text-green-400"
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
						</div>
						<h3 class="mb-2 text-xl font-bold text-green-300">Contract Active</h3>
						<p class="text-green-200/80">
							This agreement has been signed by all parties and is now active.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Back Button -->
		<div class="text-center">
			<button
				on:click={() => goto('/contracts')}
				class="inline-flex items-center gap-2 rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-500"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to All Contracts
			</button>
		</div>
	{:else}
		<div class="rounded-2xl bg-slate-700/50 p-8 text-center shadow-xl backdrop-blur-sm">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-600/50"
			>
				<svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h2 class="mb-3 text-xl font-bold text-sky-400">Contract Not Found</h2>
			<p class="mb-6 text-slate-300">
				The requested contract (ID: {contractIdFromUrl || 'Unknown'}) could not be loaded or does
				not exist.
			</p>
			<button
				on:click={() => goto('/contracts')}
				class="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
			>
				← Back to Contracts
			</button>
		</div>
	{/if}
</div>

<!-- Signature Modal -->
{#if showSignatureModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
		on:click|self={closeSignatureModal}
		on:keydown|self={(e) => e.key === 'Escape' && closeSignatureModal()}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-slate-600/30 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-sm"
		>
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold text-slate-200">Sign Contract</h3>
					<p class="text-sm text-slate-400">Add optional comment (optional)</p>
				</div>
				<button
					aria-label="Close modal"
					on:click={closeSignatureModal}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
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

			<form on:submit|preventDefault={handleSignContract} class="space-y-4">
				<!-- Signature Comment -->
				<div>
					<label for="signature-comment" class="mb-2 block text-sm font-medium text-slate-400">
						Comment (Optional)
					</label>
					<textarea
						id="signature-comment"
						bind:value={signatureComment}
						placeholder="Add a comment about this signature (optional)"
						rows="3"
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
					></textarea>
				</div>

				<!-- Signature File Attachments -->
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-400">
						Attachments (Optional)
					</label>
					<FileUpload
						acceptedFileTypes={[
							'image/jpeg',
							'image/jpg',
							'image/png',
							'image/gif',
							'image/webp',
							'application/pdf',
							'application/msword',
							'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							'application/vnd.ms-excel',
							'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
							'.dwg',
							'.dxf'
						]}
						maxFileSize={25 * 1024 * 1024}
						multiple={true}
						bind:files={signatureFiles}
					/>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={closeSignatureModal}
						class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSigning}
						class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500"
					>
						{isSigning ? 'Signing...' : 'Confirm Sign'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Revision Request Modal -->
{#if showRevisionModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
		on:click|self={closeRevisionModal}
		on:keydown|self={(e) => e.key === 'Escape' && closeRevisionModal()}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-slate-600/30 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-sm"
		>
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold text-slate-200">Request Revision</h3>
					<p class="text-sm text-slate-400">Explain what changes are needed</p>
				</div>
				<button
					aria-label="Close modal"
					on:click={closeRevisionModal}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
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

			<form on:submit|preventDefault={handleRevisionRequest} class="space-y-4">
				<!-- Revision Comment -->
				<div>
					<label for="revision-comment" class="mb-2 block text-sm font-medium text-slate-400">
						Revision Request (Required)
					</label>
					<textarea
						id="revision-comment"
						bind:value={revisionComment}
						placeholder="Explain what changes are needed in the contract..."
						rows="4"
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
						required
					></textarea>
				</div>

				<!-- Revision File Attachments -->
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-400">
						Attachments (Optional)
					</label>
					<FileUpload
						acceptedFileTypes={[
							'image/jpeg',
							'image/jpg',
							'image/png',
							'image/gif',
							'image/webp',
							'application/pdf',
							'application/msword',
							'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							'application/vnd.ms-excel',
							'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
							'.dwg',
							'.dxf'
						]}
						maxFileSize={25 * 1024 * 1024}
						multiple={true}
						bind:files={revisionFiles}
					/>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={closeRevisionModal}
						class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!isRevisionCommentValid || isSubmittingRevision}
						class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-500"
					>
						{isSubmittingRevision ? 'Submitting...' : 'Submit Revision Request'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
