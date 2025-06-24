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
			// Redirect to the main dashboard
			goto('/dashboard');
		} catch (error: any) {
			errorMessage = error.data?.message || error.message || 'An unknown error occurred.';
			console.error('Profile completion error:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-10 text-center text-2xl leading-9 font-bold tracking-tight text-gray-900">
			Complete Your Profile
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			Just a few more details to get you started.
		</p>
	</div>

	<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
		{#if currentUser}
			<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
				<!-- Customer Fields -->
				{#if currentUser.userType === 'customer' || currentUser.userType === 'expert'}
					<div>
						<label for="fullName" class="block text-sm leading-6 font-medium text-gray-900"
							>Full Name</label
						>
						<div class="mt-2">
							<input
								id="fullName"
								name="fullName"
								type="text"
								required
								bind:value={profileData.fullName}
								class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>
				{/if}

				<!-- Supplier Fields -->
				{#if currentUser.userType === 'supplier'}
					<div>
						<label for="companyName" class="block text-sm leading-6 font-medium text-gray-900"
							>Company Name</label
						>
						<div class="mt-2">
							<input
								id="companyName"
								name="companyName"
								type="text"
								required
								bind:value={profileData.companyName}
								class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>
					<div>
						<label for="category" class="block text-sm leading-6 font-medium text-gray-900"
							>Main Material Category (e.g., Cement, Steel, Electricals)</label
						>
						<div class="mt-2">
							<input
								id="category"
								name="category"
								type="text"
								required
								bind:value={profileData.category}
								class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>
				{/if}

				<!-- Expert Fields -->
				{#if currentUser.userType === 'expert'}
					<div>
						<label for="expertise" class="block text-sm leading-6 font-medium text-gray-900"
							>Primary Expertise (e.g., Plumbing, Masonry, Electrical Work)</label
						>
						<div class="mt-2">
							<input
								id="expertise"
								name="expertise"
								type="text"
								required
								bind:value={profileData.expertise}
								class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>
				{/if}

				<!-- Shared Expert/Supplier Fields -->
				{#if currentUser.userType === 'expert' || currentUser.userType === 'supplier'}
					<div>
						<label for="experience" class="block text-sm leading-6 font-medium text-gray-900"
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
								class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>
				{/if}

				<!-- Common Optional Fields -->
				<div>
					<label for="phoneNumber" class="block text-sm leading-6 font-medium text-gray-900"
						>Phone Number <span class="text-xs text-gray-500">(Optional)</span></label
					>
					<div class="mt-2">
						<input
							id="phoneNumber"
							name="phoneNumber"
							type="tel"
							bind:value={profileData.phoneNumber}
							class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div>
					<label for="location" class="block text-sm leading-6 font-medium text-gray-900"
						>Primary Location (City/Area)
						<span class="text-xs text-gray-500">(Optional)</span></label
					>
					<div class="mt-2">
						<input
							id="location"
							name="location"
							type="text"
							bind:value={profileData.location}
							class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				{#if errorMessage}
					<div class="text-sm text-red-600">
						{errorMessage}
					</div>
				{/if}

				<div>
					<button
						type="submit"
						disabled={isLoading}
						class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
					>
						{#if isLoading}
							<span>Saving...</span>
						{:else}
							Save and Continue
						{/if}
					</button>
				</div>
			</form>
		{:else}
			<div class="text-center text-gray-500">Loading user data...</div>
		{/if}
	</div>
</div>
