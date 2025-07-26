<!-- gefifi-2/src/frontend/src/routes/(app)/find-professionals/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser, UserProfile } from '$lib/types';
	import apiClient from '$lib/api';
	import ProfessionalCard from '$lib/components/ui/ProfessionalCard.svelte';
	import SendInterestModal from '$lib/components/modals/SendInterestModal.svelte';
	import { page } from '$app/stores';

	let currentUser: AuthUser | null = null;
	let token: string | null = null;

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	let allExperts: UserProfile[] = [];
	let allSuppliers: UserProfile[] = [];
	let displayedProfessionals: UserProfile[] = [];

	let searchTerm: string = '';
	let selectedType: 'all' | 'expert' | 'supplier' = 'all';

	let isLoading: boolean = true;
	let errorMessage: string | null = null;

	onMount(async () => {
		if (currentUser?.userType !== 'customer') {
			errorMessage = 'Access denied. This page is for customers only.';
			isLoading = false;
			return;
		}

		// params are passed from material/Expert request
		selectedType = ($page.url.searchParams.get('type') as 'expert' | 'supplier') || 'all';

		await fetchData();
	});

	async function fetchData() {
		isLoading = true;
		errorMessage = null;
		try {
			const [expertsData, suppliersData] = await Promise.all([
				apiClient.getExperts(),
				apiClient.getSuppliers()
			]);

			allExperts = expertsData;
			allSuppliers = suppliersData;

			console.log(
				'ALL EXPERTS (first 2 for brevity):',
				JSON.stringify(allExperts.slice(0, 2), null, 2)
			);
			console.log(
				'ALL SUPPLIERS (first 2 for brevity):',
				JSON.stringify(allSuppliers.slice(0, 2), null, 2)
			);

			// Initial filter call after data is fetched
			// searchTerm is '' and selectedType is 'all' at this point
			filterAndSortProfessionals(searchTerm, selectedType, allExperts, allSuppliers, currentUser);
		} catch (err: any) {
			console.error('Error fetching professionals:', err);
			errorMessage = err.data?.message || err.message || 'Failed to load professionals list.';
		} finally {
			isLoading = false;
		}
	}

	function filterAndSortProfessionals(
		currentSearchTerm: string,
		currentSelectedType: 'all' | 'expert' | 'supplier',
		currentExperts: UserProfile[],
		currentSuppliers: UserProfile[],
		currentLocalUser: AuthUser | null
	) {
		console.log(
			`filterAndSortProfessionals CALLED with: searchTerm='${currentSearchTerm}', selectedType='${currentSelectedType}', Experts: ${currentExperts.length}, Suppliers: ${currentSuppliers.length}`
		);

		if (currentExperts.length === 0 && currentSuppliers.length === 0 && !isLoading) {
			// If there's no data after loading, don't try to filter.
			console.log('Filter skipped: No expert or supplier data available.');
			displayedProfessionals = [];
			return;
		}

		let combinedList: UserProfile[] = [];
		if (currentSelectedType === 'all') {
			combinedList = [...currentExperts, ...currentSuppliers];
		} else if (currentSelectedType === 'expert') {
			combinedList = currentExperts;
		} else if (currentSelectedType === 'supplier') {
			combinedList = currentSuppliers;
		}
		console.log(
			`Step 1 - Combined list based on selectedType='${currentSelectedType}', count: ${combinedList.length}`
		);

		let filteredList = combinedList;
		if (currentSearchTerm.trim() !== '') {
			const lowerSearchTerm = currentSearchTerm.toLowerCase().trim();
			filteredList = combinedList.filter((prof) => {
				if (!prof || !prof.profile) {
					console.warn('Professional object or profile is missing:', prof);
					return false;
				}
				const profile = prof.profile;

				const name = String(profile.fullName || profile.companyName || '').toLowerCase();
				const expertise = String(
					prof.userType === 'expert' ? profile.expertise || '' : ''
				).toLowerCase();
				const category = String(
					prof.userType === 'supplier' ? profile.category || '' : ''
				).toLowerCase();
				const location = String(profile.location || '').toLowerCase();

				const matchesName = name.includes(lowerSearchTerm);
				const matchesExpertise = prof.userType === 'expert' && expertise.includes(lowerSearchTerm);
				const matchesCategory = prof.userType === 'supplier' && category.includes(lowerSearchTerm);
				const matchesLocation = location.includes(lowerSearchTerm);

				return matchesName || matchesExpertise || matchesCategory || matchesLocation;
			});
			console.log(
				`Step 2 - After search term filter ('${currentSearchTerm}'), count: ${filteredList.length}`
			);
		}

		if (
			currentLocalUser?.profile?.location &&
			currentSearchTerm.trim() === '' &&
			currentSelectedType === 'all'
		) {
			const customerLocationLower = currentLocalUser.profile.location.toLowerCase();
			const nearby: UserProfile[] = [];
			const others: UserProfile[] = [];
			filteredList.forEach((prof) => {
				if (prof.profile?.location?.toLowerCase().includes(customerLocationLower)) {
					nearby.push(prof);
				} else {
					others.push(prof);
				}
			});

			const uniqueNearbyIds = new Set<string>();
			const uniqueNearbyFiltered = nearby.filter((p) => {
				if (p && p.id && !uniqueNearbyIds.has(p.id)) {
					uniqueNearbyIds.add(p.id);
					return true;
				}
				return false;
			});

			const uniqueOthersFiltered = others.filter((p) => p && p.id && !uniqueNearbyIds.has(p.id));

			displayedProfessionals = [...uniqueNearbyFiltered, ...uniqueOthersFiltered];
			console.log(
				`Step 3a - Nearby prioritization applied, count: ${displayedProfessionals.length}`
			);
		} else {
			displayedProfessionals = filteredList;
			console.log(
				`Step 3b - Nearby skipped or search active, count: ${displayedProfessionals.length}`
			);
		}

		console.log(
			'Final displayedProfessionals (first 2 for brevity):',
			JSON.stringify(displayedProfessionals.slice(0, 2), null, 2)
		);
	}

	$: if (!isLoading) {
		console.log(
			`Reactive EFFECT TRIGGERED by change: Term='${searchTerm}', Type='${selectedType}'`
		);
		filterAndSortProfessionals(searchTerm, selectedType, allExperts, allSuppliers, currentUser);
	}

	let showInterestModal = false;
	let currentTargetProfessionalId: string | null = null;
	let currentTargetProfessionalName: string | null = null;

	function handleOpenInterestModal(eventDetail: { userId: string; userName: string }) {
		currentTargetProfessionalId = eventDetail.userId;
		currentTargetProfessionalName = eventDetail.userName;
		showInterestModal = true;
	}

	function handleCloseInterestModal() {
		showInterestModal = false;
	}

	function handleInterestSuccessfullySent(event: CustomEvent<{ chatId?: string }>) {
		console.log('Interest successfully sent, event from modal:', event.detail);
	}

	function getProfessionalName(prof: UserProfile): string {
		return prof.profile?.fullName || prof.profile?.companyName || prof.email || 'Professional';
	}
</script>

<div class="space-y-6 pb-10">
	<header class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
		<h1 class="text-3xl font-bold text-emerald-400">Find Experts & Suppliers</h1>
		<!-- Potential future add: button for advanced filter modal -->
	</header>

	<!-- Search and Filter Controls -->
	<div
		class="sticky top-16 z-20 border-b border-slate-700/50 bg-slate-800/80 py-4 backdrop-blur-md sm:top-0"
	>
		<div class="grid grid-cols-1 gap-4 rounded-lg bg-slate-700/30 p-3 shadow-md md:grid-cols-3">
			<div class="md:col-span-2">
				<label for="search-professionals" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Search by Name, Skill, Material, Location...</label
				>
				<input
					type="text"
					id="search-professionals"
					bind:value={searchTerm}
					placeholder="e.g., Carpenter, Bricks, Chennai..."
					class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 shadow-inner transition-colors outline-none placeholder:text-slate-400/70 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
				/>
			</div>
			<div>
				<label for="type-selector" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Filter by Type</label
				>
				<select
					id="type-selector"
					bind:value={selectedType}
					class="w-full appearance-none rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 pr-8 text-gray-100 shadow-inner transition-colors outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
					style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;"
				>
					<option value="all">All Professionals</option>
					<option value="expert">Experts Only</option>
					<option value="supplier">Suppliers Only</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Results Area -->
	{#if isLoading}
		<div class="flex h-64 flex-col items-center justify-center pt-10">
			<svg
				class="mr-3 -ml-1 h-10 w-10 animate-spin text-emerald-500"
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
			<p class="mt-3 text-lg text-slate-300">Loading professionals...</p>
		</div>
	{:else if errorMessage}
		<div
			class="rounded-lg border border-red-700/80 bg-red-600/30 p-6 text-center text-red-200 shadow-xl"
		>
			<h3 class="mb-2 text-xl font-semibold">Oops! Something went wrong.</h3>
			<p>{errorMessage}</p>
			<button
				class="mt-4 rounded-md bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-sky-600"
				on:click={fetchData}
			>
				Try Again
			</button>
		</div>
	{:else if displayedProfessionals.length === 0}
		<div class="rounded-xl bg-slate-700/50 p-10 text-center shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-6 h-20 w-20 text-slate-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
			<h2 class="mb-2 text-2xl font-semibold text-sky-400">No Professionals Found</h2>
			<p class="text-slate-300">
				Try adjusting your search term or filter.
				{#if searchTerm.trim() !== '' || selectedType !== 'all'}
					<button
						class="ml-1 text-emerald-400 underline hover:text-emerald-300"
						on:click={() => {
							searchTerm = '';
							selectedType = 'all';
						}}
					>
						Clear search & filters
					</button>
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
			{#each displayedProfessionals as professional (professional.id)}
				<ProfessionalCard
					{professional}
					on:sendInterest={(event) => handleOpenInterestModal(event.detail)}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- SendInterestModal Integration -->
{#if currentTargetProfessionalId && currentTargetProfessionalName}
	<SendInterestModal
		bind:show={showInterestModal}
		targetProfessionalId={currentTargetProfessionalId}
		targetProfessionalName={currentTargetProfessionalName}
		on:close={handleCloseInterestModal}
		on:interestSent={handleInterestSuccessfullySent}
	/>
{/if}

<style lang="postcss">
	/* Add any page-specific styles here if needed, e.g., for the sticky header spacing */
</style>
