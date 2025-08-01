<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';
	import AttachmentList from '$lib/components/AttachmentList.svelte';
	import UserProfile from '$lib/components/UserProfile.svelte';
	import type { Contract, Attachment } from '$lib/types';
	import type { Unsubscriber } from 'svelte/store';
	import Avatar from '$lib/components/Avatar.svelte';

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
	let isLoading = true;
	let errorMessage = '';
	let chatId: string | null = null;
	let contractIdFromUrl: string | null = null;
	let isSigning = false;
	let signMessage = '';

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
				// Fetch Customer Name
				if (fetchedContract.customerId) {
					const customerRes = await fetch(
						`${API_BASE_URL}/api/users/${fetchedContract.customerId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (customerRes.ok) {
						const customerData: UserProfile = await customerRes.json();
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

				// Fetch Expert/Supplier Name
				if (fetchedContract.expertSupplierId) {
					const providerRes = await fetch(
						`${API_BASE_URL}/api/users/${fetchedContract.expertSupplierId}`,
						{ headers: { Authorization: `Bearer ${token}` } }
					);
					if (providerRes.ok) {
						const providerData: UserProfile = await providerRes.json();

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
			const response = await fetch(`${API_BASE_URL}/api/chats`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const chats = await response.json();
				console.log('chats', chats);
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

	async function handleSignContract() {
		if (!contract || !currentUser || !token) return;
		if (
			(currentUser.id === contract.customerId && contract.customerSigned) ||
			(currentUser.id === contract.expertSupplierId && contract.expertSupplierSigned)
		) {
			signMessage = 'You have already signed this contract.';
			return;
		}

		isSigning = true;
		signMessage = '';
		try {
			const response = await fetch(`${API_BASE_URL}/api/contracts/${contract.id}/sign`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to sign contract.');
			}
			signMessage = result.message || 'Contract signed successfully!';
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
		} catch (error: any) {
			console.error('Error signing contract:', error);
			signMessage = `Error: ${error.message}`;
		} finally {
			isSigning = false;
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

		return () => {
			if (unsubscribe) {
				unsubscribe();
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

	$: contractTypeLabel =
		contract?.contractType === 'expert_contract' ? 'Expert Contract' : 'Material Contract';
	$: relatedRequestUrl = contract?.workRequestId
		? `/work-requests/${contract.workRequestId}`
		: contract?.materialRequestId
			? `/material-requests/${contract.materialRequestId}`
			: null;
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
								on:click={handleSignContract}
								disabled={isSigning}
								class="w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-500"
							>
								{isSigning ? 'Processing...' : 'Sign Contract'}
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
