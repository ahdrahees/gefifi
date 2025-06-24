<!-- gefifi-2/src/frontend/src/routes/auth/complete-profile/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/types';
	import apiClient, { ApiError } from '$lib/api';
	import { onMount } from 'svelte';

	let currentUser: AuthUser | null = null;
	let userType: 'customer' | 'expert' | 'supplier' = 'customer';

	// Profile form data
	let profile = {
		fullName: '',
		phoneNumber: '',
		location: '',

		// Expert-specific
		expertise: '',
		experience: '',

		// Supplier-specific
		companyName: '',
		category: ''
	};

	let isLoading = false;
	let errorMessage: string | null = null;

	// Check if user is logged in and needs profile completion
	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			currentUser = state.user;
			if (currentUser) {
				userType = currentUser.userType;
				// Pre-fill form with existing data
				profile.fullName = currentUser.profile.fullName || '';
				profile.phoneNumber = currentUser.profile.phoneNumber || '';
				profile.location = currentUser.profile.location || '';
				profile.expertise = currentUser.profile.expertise || '';
				profile.experience = currentUser.profile.experience || '';
				profile.companyName = currentUser.profile.companyName || '';
				profile.category = currentUser.profile.category || '';

				// If profile is already complete, redirect to dashboard
				if (currentUser.profileCompleted) {
					goto('/dashboard');
				}
			} else if (!state.isLoading) {
				// User not logged in, redirect to login
				goto('/auth/login');
			}
		});

		return unsubscribe;
	});

	async function handleCompleteProfile() {
		if (!currentUser) return;

		isLoading = true;
		errorMessage = null;

		// Validate required fields based on user type
		if (userType === 'expert' && (!profile.fullName.trim() || !profile.expertise.trim())) {
			errorMessage = 'Full name and primary expertise are required for experts.';
			isLoading = false;
			return;
		}
		if (userType === 'supplier' && (!profile.companyName.trim() || !profile.category.trim())) {
			errorMessage = 'Company name and main material category are required for suppliers.';
			isLoading = false;
			return;
		}
		if (userType === 'customer' && !profile.fullName.trim()) {
			errorMessage = 'Full name is required for customers.';
			isLoading = false;
			return;
		}

		const profileData: any = {
			fullName: profile.fullName.trim() || undefined,
			phoneNumber: profile.phoneNumber.trim() || undefined,
			location: profile.location.trim() || undefined
		};

		if (userType === 'expert') {
			profileData.expertise = profile.expertise.trim() || undefined;
			profileData.experience = profile.experience.trim() || undefined;
		} else if (userType === 'supplier') {
			profileData.companyName = profile.companyName.trim() || undefined;
			profileData.category = profile.category.trim() || undefined;
			profileData.experience = profile.experience.trim() || undefined;
		}

		try {
			const result = await apiClient.completeProfile(profileData);

			// Update the auth store with the new user data
			// Get current token from store
			let currentToken: string | null = null;
			const unsubscribe = authStore.subscribe((state) => {
				currentToken = state.token;
			});
			unsubscribe();
			authStore._updateAuthData(currentToken, result.user);

			// Redirect to dashboard
			goto('/dashboard');
		} catch (error: any) {
			console.error('Profile completion error:', error);
			if (error instanceof ApiError) {
				errorMessage = error.data?.message || 'An error occurred while completing your profile.';
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			isLoading = false;
		}
	}

	function getRequiredFieldsText(): string {
		switch (userType) {
			case 'customer':
				return 'Please provide your full name. Phone number and location are optional but recommended.';
			case 'expert':
				return 'Please provide your full name and primary expertise. Other fields are optional but recommended.';
			case 'supplier':
				return 'Please provide your company name and main material category. Other fields are optional but recommended.';
			default:
				return '';
		}
	}
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-4 font-sans text-gray-100"
>
	<div class="w-full max-w-lg">
		<div class="mb-6 text-center sm:mb-8">
			<a
				href="/"
				class="text-5xl font-bold text-emerald-400 transition-colors hover:text-emerald-300"
			>
				GEFIFI
			</a>
			<h1 class="mt-2 text-2xl text-sky-300">Complete Your Profile</h1>
			<p class="text-sm text-slate-400">
				Just a few more details to get started as a <span class="text-amber-400 capitalize"
					>{userType}</span
				>
			</p>
		</div>

		<div class="rounded-xl bg-slate-800/70 p-6 shadow-2xl sm:p-8">
			{#if errorMessage}
				<div
					class="mb-6 rounded-md border border-red-500/50 bg-red-500/25 p-3.5 text-sm text-red-200"
					role="alert"
				>
					{errorMessage}
				</div>
			{/if}

			<div class="mb-6 rounded-lg bg-blue-500/10 p-4 text-sm text-blue-300">
				<p>{getRequiredFieldsText()}</p>
			</div>

			<form on:submit|preventDefault={handleCompleteProfile} class="space-y-5">
				{#if userType === 'supplier'}
					<div>
						<label for="companyName" class="mb-1.5 block text-sm font-medium text-sky-300">
							Company Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="companyName"
							bind:value={profile.companyName}
							required={userType === 'supplier'}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="Your company's official name"
						/>
					</div>
				{:else}
					<div>
						<label for="fullName" class="mb-1.5 block text-sm font-medium text-sky-300">
							Full Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="fullName"
							bind:value={profile.fullName}
							required={true}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="Your full name"
						/>
					</div>
				{/if}

				<div>
					<label for="phoneNumber" class="mb-1.5 block text-sm font-medium text-sky-300">
						Phone Number <span class="text-slate-400">(Optional)</span>
					</label>
					<input
						type="tel"
						id="phoneNumber"
						bind:value={profile.phoneNumber}
						disabled={isLoading}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
						placeholder="e.g., +919876543210"
					/>
				</div>

				<div>
					<label for="location" class="mb-1.5 block text-sm font-medium text-sky-300">
						Primary Location (City/Area) <span class="text-slate-400">(Optional)</span>
					</label>
					<input
						type="text"
						id="location"
						bind:value={profile.location}
						disabled={isLoading}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
						placeholder="e.g., Bangalore, Koramangala"
					/>
				</div>

				{#if userType === 'expert'}
					<div>
						<label for="expertise" class="mb-1.5 block text-sm font-medium text-sky-300">
							Primary Expertise <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="expertise"
							bind:value={profile.expertise}
							required={userType === 'expert'}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="e.g., Plumbing, Electrical Design, Masonry"
						/>
					</div>
					<div>
						<label for="experience" class="mb-1.5 block text-sm font-medium text-sky-300">
							Years of Experience <span class="text-slate-400">(Optional)</span>
						</label>
						<input
							type="text"
							id="experience"
							bind:value={profile.experience}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="e.g., 5 years, 10+ years"
						/>
					</div>
				{/if}

				{#if userType === 'supplier'}
					<div>
						<label for="category" class="mb-1.5 block text-sm font-medium text-sky-300">
							Main Material Category <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="category"
							bind:value={profile.category}
							required={userType === 'supplier'}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="e.g., Cement & Steel, Tiles, Paints"
						/>
					</div>
					<div>
						<label for="experienceSupplier" class="mb-1.5 block text-sm font-medium text-sky-300">
							Years in Business <span class="text-slate-400">(Optional)</span>
						</label>
						<input
							type="text"
							id="experienceSupplier"
							bind:value={profile.experience}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="e.g., 15 years"
						/>
					</div>
				{/if}

				<div class="pt-3">
					<button
						type="submit"
						disabled={isLoading}
						class="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-700 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading}
							<svg
								class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
							Completing Profile...
						{:else}
							Complete Profile & Continue
						{/if}
					</button>
				</div>
			</form>
		</div>

		<div class="mt-6 text-center text-sm">
			<p class="text-slate-400">
				Need help?
				<a
					href="mailto:support@gefifi.com"
					class="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
				>
					Contact Support
				</a>
			</p>
		</div>
	</div>
</div>
