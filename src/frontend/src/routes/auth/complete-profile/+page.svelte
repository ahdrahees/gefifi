<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser, type AuthState } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import apiClient from '$lib/api';
	import { onMount } from 'svelte';

	let currentUser: AuthUser | null = null;
	let isLoading = false;
	let errorMessage = '';

	// --- Form State ---
	// We use one object to hold all possible fields for simplicity.
	let profileData = {
		// Common
		fullName: '',
		phoneNumber: '',
		location: '',
		// Expert
		expertise: '',
		experience: '',
		// Supplier
		companyName: '',
		category: ''
		// 'experience' is shared with expert
	};

	onMount(() => {
		const auth = get(authStore);
		if (!auth.isAuthenticated || !auth.user) {
			goto('/auth/login'); // If not authenticated, redirect to login
			return;
		}
		currentUser = auth.user;

		// Pre-fill form with data we might already have from Google
		if (currentUser.profile) {
			profileData.fullName = currentUser.profile.fullName || '';
		}
	});

	async function handleSubmit() {
		if (!currentUser) return;
		isLoading = true;
		errorMessage = '';

		try {
			const { user: updatedUser } = await apiClient.updateUserProfile(profileData);
			// Update the store with the complete user profile
			authStore.update((state: AuthState) => ({
				...state,
				user: updatedUser
			}));
			// Redirect to the main home page
			goto('/home');
		} catch (error: any) {
			errorMessage = error.data?.message || error.message || 'An unknown error occurred.';
			console.error('Profile completion error:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-4 font-sans text-gray-100"
>
	<div class="w-full max-w-lg">
		<div class="mb-6 text-center sm:mb-8">
			<a href="/">
				<img
					class="mx-auto h-16 w-auto"
					src="/images/Gefifi-Logo.png"
					alt="GEFIFI Construction Marketplace"
				/>
			</a>
			<h2 class="mt-2 text-2xl text-sky-300">Complete Your Profile</h2>
			<p class="mt-1 text-sm text-slate-400">
				Just a few more details to get you started as a <span
					class="font-semibold text-amber-400 capitalize">{currentUser?.userType}</span
				>.
			</p>
		</div>

		<div class="rounded-xl bg-slate-800/70 p-6 shadow-2xl sm:p-8">
			{#if currentUser}
				<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
					<!-- Customer and Expert Fields -->
					{#if currentUser.userType === 'customer' || currentUser.userType === 'expert'}
						<div>
							<label for="fullName" class="block text-sm leading-6 font-medium text-slate-300"
								>Full Name</label
							>
							<div class="mt-2">
								<input
									id="fullName"
									name="fullName"
									type="text"
									required
									bind:value={profileData.fullName}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Supplier Fields -->
					{#if currentUser.userType === 'supplier'}
						<div>
							<label for="companyName" class="block text-sm leading-6 font-medium text-slate-300"
								>Company Name</label
							>
							<div class="mt-2">
								<input
									id="companyName"
									name="companyName"
									type="text"
									required
									bind:value={profileData.companyName}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
						<div>
							<label for="category" class="block text-sm leading-6 font-medium text-slate-300"
								>Main Material Category</label
							>
							<div class="mt-2">
								<input
									id="category"
									name="category"
									type="text"
									required
									placeholder="e.g., Cement, Steel, Electricals"
									bind:value={profileData.category}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Expert Fields -->
					{#if currentUser.userType === 'expert'}
						<div>
							<label for="expertise" class="block text-sm leading-6 font-medium text-slate-300"
								>Primary Expertise</label
							>
							<div class="mt-2">
								<input
									id="expertise"
									name="expertise"
									type="text"
									required
									placeholder="e.g., Plumbing, Masonry"
									bind:value={profileData.expertise}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Shared Expert/Supplier Fields -->
					{#if currentUser.userType === 'expert' || currentUser.userType === 'supplier'}
						<div>
							<label for="experience" class="block text-sm leading-6 font-medium text-slate-300"
								>{currentUser.userType === 'expert'
									? 'Years of Experience'
									: 'Years in Business'}</label
							>
							<div class="mt-2">
								<input
									id="experience"
									name="experience"
									type="text"
									required
									bind:value={profileData.experience}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Common Optional Fields -->
					<div>
						<label for="phoneNumber" class="block text-sm leading-6 font-medium text-slate-300"
							>Phone Number <span class="text-xs text-slate-400">(Optional)</span></label
						>
						<div class="mt-2">
							<input
								id="phoneNumber"
								name="phoneNumber"
								type="tel"
								bind:value={profileData.phoneNumber}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label for="location" class="block text-sm leading-6 font-medium text-slate-300"
							>Primary Location (City/Area)
							<span class="text-xs text-slate-400">(Optional)</span></label
						>
						<div class="mt-2">
							<input
								id="location"
								name="location"
								type="text"
								placeholder="e.g., Mumbai, Maharashtra"
								bind:value={profileData.location}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					{#if errorMessage}
						<div
							class="rounded-md border border-red-500/50 bg-red-500/25 p-3.5 text-sm text-red-200"
							role="alert"
						>
							{errorMessage}
						</div>
					{/if}

					<div>
						<button
							type="submit"
							disabled={isLoading}
							class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm leading-6 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
						>
							{#if isLoading}
								<svg
									class="mr-3 h-5 w-5 animate-spin text-white"
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
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span>Saving...</span>
							{:else}
								Save and Continue
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<div class="text-center text-slate-400">Loading user data...</div>
			{/if}
		</div>
	</div>
</div>
