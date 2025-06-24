<!-- gefifi-2/src/frontend/src/routes/auth/register/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, type RegisterUserData } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/types';
	import apiClient, { ApiError } from '$lib/api';
	import { onMount } from 'svelte';

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	let currentStep = 1; // 1: Account details, 2: Profile details

	// Step 1: Account Details
	let email = '';
	let password = '';
	let confirmPassword = '';
	let userType: 'customer' | 'expert' | 'supplier' = 'customer'; // Default

	// Step 2: Profile Details (common and specific)
	let profile = {
		fullName: '',
		phoneNumber: '',
		location: '', // Common location (city/area)
		avatarUrl: '', // For simplicity, text input for URL for now

		// Expert-specific
		expertise: '',
		experience: '', // Can be used by expert & supplier

		// Supplier-specific
		companyName: '',
		category: '' // e.g., material category
	};

	let isLoading = false;
	let errorMessage: string | null = null;
	let googleIsLoading = false;

	const userTypes = [
		{ value: 'customer' as const, label: 'Customer (Looking for services/materials)' },
		{ value: 'expert' as const, label: 'Expert (Offering construction services)' },
		{ value: 'supplier' as const, label: 'Supplier (Providing construction materials)' }
	];

	function handleNextStep() {
		errorMessage = null;
		if (!email.includes('@') || email.trim().length < 5) {
			errorMessage = 'Please enter a valid email address.';
			return;
		}
		if (password.length < 6) {
			errorMessage = 'Password must be at least 6 characters long.';
			return;
		}
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}
		currentStep = 2;
	}

	async function handleRegister() {
		isLoading = true;
		errorMessage = null;

		const finalProfile: Partial<AuthUser['profile']> = {
			fullName: profile.fullName?.trim() || undefined,
			phoneNumber: profile.phoneNumber?.trim() || undefined,
			location: profile.location?.trim() || undefined,
			// For avatar, if we implement file upload for registration, this would be handled differently.
			// For now, if a URL is manually entered, it's passed.
			avatarUrl: profile.avatarUrl?.trim() || undefined
		};

		if (userType === 'expert') {
			finalProfile.expertise = profile.expertise?.trim() || undefined;
			finalProfile.experience = profile.experience?.trim() || undefined;
			if (!finalProfile.fullName) {
				// Basic validation
				errorMessage = 'Full name is required for Experts.';
				isLoading = false;
				return;
			}
		} else if (userType === 'supplier') {
			finalProfile.companyName = profile.companyName?.trim() || undefined;
			finalProfile.category = profile.category?.trim() || undefined;
			finalProfile.experience = profile.experience?.trim() || undefined;
			if (!finalProfile.companyName) {
				// Basic validation
				errorMessage = 'Company name is required for Suppliers.';
				isLoading = false;
				return;
			}
		}

		const registrationData: RegisterUserData = {
			email,
			password,
			userType,
			profile: finalProfile
		};

		try {
			await authStore.register(registrationData);
			goto('/dashboard');
		} catch (error: any) {
			errorMessage = error.message || 'An unexpected error occurred during registration.';
			console.error('Registration page error:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleCredentialResponse(response: any) {
		googleIsLoading = true;
		errorMessage = null;

		// The userType is selected in Step 1.
		const userTypeForNewUser = userType;
		const profileForNewUser = currentStep === 2 ? profile : {};

		try {
			// Call the backend with the token from Google and the selected userType
			const result = await apiClient.googleLogin({
				googleTokenId: response.credential,
				userTypeForNewGoogleUser: userTypeForNewUser,
				profileForNewGoogleUser: profileForNewUser // Send profile data if already collected
			});

			// On success, the backend returns a token for the new/existing user
			authStore._updateAuthData(result.token, result.user);

			// Check if profile needs completion
			if (result.user.profileCompleted === false) {
				goto('/auth/complete-profile', { replaceState: true });
			} else {
				goto('/dashboard', { replaceState: true });
			}
		} catch (error: any) {
			console.error('Google Sign-In/Registration Error:', error);
			if (error instanceof ApiError) {
				errorMessage =
					error.data?.message || 'An error occurred during Google Sign-In/Registration.';
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			googleIsLoading = false;
		}
	}

	let unsubscribeAuth: (() => void) | null = null;
	onMount(() => {
		// Redirect logic
		const initialAuthState = $authStore;
		if (initialAuthState.isLoggedIn && !initialAuthState.isLoading) {
			goto('/dashboard', { replaceState: true });
		}
		unsubscribeAuth = authStore.subscribe((state) => {
			if (state.isLoggedIn && !state.isLoading) {
				goto('/dashboard', { replaceState: true });
			}
		});

		// Initialize Google Sign-In
		if (GOOGLE_CLIENT_ID && (window as any).google) {
			(window as any).google.accounts.id.initialize({
				client_id: GOOGLE_CLIENT_ID,
				callback: handleGoogleCredentialResponse
			});

			const googleButtonElement = document.getElementById('google-register-button');
			if (googleButtonElement) {
				(window as any).google.accounts.id.renderButton(googleButtonElement, {
					theme: 'outline',
					size: 'large',
					type: 'standard',
					text: 'continue_with', // More appropriate for registration
					shape: 'rectangular',
					logo_alignment: 'left'
				});
			}
		} else {
			console.error('Google Client ID not found or Google script not loaded.');
		}

		return () => {
			if (unsubscribeAuth) unsubscribeAuth();
		};
	});

	let bgstyle =
		"background-image: url('data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e'); background-position: right 0.5rem center; background-size: 1.5em 1.5em;";
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
			<h1 class="mt-2 text-2xl text-sky-300">Create Your Account</h1>
			<p class="text-sm text-slate-400">Join GEFIFI to connect with the best in construction.</p>
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

			<div class="mb-6 flex items-center justify-center space-x-2">
				<button
					class="flex items-center {currentStep === 1
						? 'text-emerald-300'
						: 'text-slate-400 hover:text-slate-200'}"
					on:click={() => (currentStep = 1)}
					disabled={isLoading || googleIsLoading}
					aria-current={currentStep === 1 ? 'step' : undefined}
				>
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full border-2 {currentStep === 1
							? 'border-emerald-400 bg-emerald-500/20'
							: 'border-slate-600 group-hover:border-slate-400'}">1</span
					>
					<span class="ml-2 text-xs sm:text-sm {currentStep === 1 ? 'font-semibold' : ''}"
						>Account</span
					>
				</button>
				<div class="h-px flex-1 {currentStep > 1 ? 'bg-emerald-400' : 'bg-slate-600'} mx-1"></div>
				<button
					class="flex items-center {currentStep === 2
						? 'text-emerald-300'
						: 'text-slate-400 hover:text-slate-200'}"
					on:click={() => {
						if (currentStep === 1) handleNextStep();
						else currentStep = 2;
					}}
					disabled={isLoading ||
						googleIsLoading ||
						(currentStep === 1 && (!email || !password || !confirmPassword))}
					aria-current={currentStep === 2 ? 'step' : undefined}
				>
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full border-2 {currentStep === 2
							? 'border-emerald-400 bg-emerald-500/20'
							: 'border-slate-600 group-hover:border-slate-400'}">2</span
					>
					<span class="ml-2 text-xs sm:text-sm {currentStep === 2 ? 'font-semibold' : ''}"
						>Profile</span
					>
				</button>
			</div>

			{#if currentStep === 1}
				<form on:submit|preventDefault={handleNextStep} class="space-y-5">
					<div>
						<label for="email" class="mb-1.5 block text-sm font-medium text-sky-300"
							>Email Address <span class="text-red-400">*</span></label
						>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							disabled={isLoading || googleIsLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="you@example.com"
						/>
					</div>
					<div>
						<label for="password" class="mb-1.5 block text-sm font-medium text-sky-300"
							>Password <span class="text-red-400">*</span></label
						>
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							minlength="6"
							disabled={isLoading || googleIsLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="Minimum 6 characters"
						/>
					</div>
					<div>
						<label for="confirmPassword" class="mb-1.5 block text-sm font-medium text-sky-300"
							>Confirm Password <span class="text-red-400">*</span></label
						>
						<input
							type="password"
							id="confirmPassword"
							bind:value={confirmPassword}
							required
							minlength="6"
							disabled={isLoading || googleIsLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							placeholder="Re-enter your password"
						/>
					</div>
					<div>
						<label for="userType" class="mb-1.5 block text-sm font-medium text-sky-300"
							>I want to register as a... <span class="text-red-400">*</span></label
						>
						<select
							id="userType"
							bind:value={userType}
							required
							disabled={isLoading || googleIsLoading}
							class="w-full appearance-none rounded-lg border border-slate-600 bg-slate-700/80 bg-right bg-no-repeat px-4 py-2.5 pr-8 text-gray-100 transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
							style={bgstyle}
						>
							{#each userTypes as typeOpt (typeOpt)}
								<option value={typeOpt.value}>{typeOpt.label}</option>
							{/each}
						</select>
					</div>
					<button
						type="submit"
						disabled={isLoading || googleIsLoading}
						class="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						Next: Profile Details &rarr;
					</button>
					<div class="relative flex items-center py-2">
						<div class="flex-grow border-t border-slate-600"></div>
						<span class="mx-4 flex-shrink text-xs text-slate-400 uppercase">Or</span>
						<div class="flex-grow border-t border-slate-600"></div>
					</div>
					<div id="google-register-button" class="flex justify-center">
						<!-- Google will render its button here. We show a placeholder. -->
						<button
							type="button"
							disabled={true}
							class="flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-slate-700 px-6 py-3 font-semibold text-slate-300 opacity-70 shadow-md"
						>
							Loading Google Sign-In...
						</button>
					</div>
				</form>
			{:else if currentStep === 2}
				<form on:submit|preventDefault={handleRegister} class="space-y-5">
					<h2 class="mb-1 text-center text-xl font-semibold text-sky-300">
						Complete Your Profile <span class="text-amber-400 capitalize">({userType})</span>
					</h2>

					{#if userType === 'supplier'}
						<div>
							<label for="companyName" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Company Name <span class="text-red-400">*</span></label
							>
							<input
								type="text"
								id="companyName"
								bind:value={profile.companyName}
								required={true}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="Your company's official name"
							/>
						</div>
					{:else}
						<div>
							<label for="fullName" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Full Name <span class="text-red-400">*</span></label
							>
							<input
								type="text"
								id="fullName"
								bind:value={profile.fullName}
								required={userType === 'customer' || userType === 'expert'}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="Your full name"
							/>
						</div>
					{/if}

					<div>
						<label for="phoneNumber" class="mb-1.5 block text-sm font-medium text-sky-300"
							>Phone Number (Optional)</label
						>
						<input
							type="tel"
							id="phoneNumber"
							bind:value={profile.phoneNumber}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
							placeholder="e.g., +919876543210"
						/>
					</div>

					<div>
						<label for="location" class="mb-1.5 block text-sm font-medium text-sky-300"
							>Primary Location (City/Area, Optional)</label
						>
						<input
							type="text"
							id="location"
							bind:value={profile.location}
							disabled={isLoading}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
							placeholder="e.g., Bangalore, Koramangala"
						/>
					</div>

					{#if userType === 'expert'}
						<div>
							<label for="expertise" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Primary Expertise</label
							>
							<input
								type="text"
								id="expertise"
								bind:value={profile.expertise}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="e.g., Plumbing, Electrical Design"
							/>
						</div>
						<div>
							<label for="experience" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Years of Experience</label
							>
							<input
								type="text"
								id="experience"
								bind:value={profile.experience}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="e.g., 5 years, 10+ years"
							/>
						</div>
					{/if}

					{#if userType === 'supplier'}
						<div>
							<label for="category" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Main Material Category</label
							>
							<input
								type="text"
								id="category"
								bind:value={profile.category}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="e.g., Cement & Steel, Tiles, Paints"
							/>
						</div>
						<div>
							<label for="experienceSupplier" class="mb-1.5 block text-sm font-medium text-sky-300"
								>Years in Business</label
							>
							<input
								type="text"
								id="experienceSupplier"
								bind:value={profile.experience}
								disabled={isLoading}
								class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 placeholder:text-slate-400"
								placeholder="e.g., 15 years"
							/>
						</div>
					{/if}

					<!-- <div>
            <label for="avatarUrl" class="block text-sm font-medium text-sky-300 mb-1.5">Profile Picture URL (Optional)</label>
            <input type="url" id="avatarUrl" bind:value={profile.avatarUrl} disabled={isLoading}
                   class="w-full bg-slate-700/80 border border-slate-600 text-gray-100 px-4 py-2.5 rounded-lg placeholder:text-slate-400" placeholder="https://example.com/avatar.jpg" />
          </div> -->

					<div class="flex flex-col gap-3 pt-3 sm:flex-row">
						<button
							type="button"
							on:click={() => (currentStep = 1)}
							disabled={isLoading}
							class="order-2 flex w-full items-center justify-center rounded-lg bg-slate-600 px-6 py-3 font-semibold text-slate-200 shadow-md transition-colors duration-150 ease-in-out hover:bg-slate-500 sm:order-1 sm:w-auto"
						>
							&larr; Back to Account
						</button>
						<button
							type="submit"
							disabled={isLoading}
							class="order-1 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-700 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
						>
							{#if isLoading}
								<svg
									class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									><circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle><path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path></svg
								>
								Registering Account...
							{:else}
								Complete Registration
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>

		<div class="mt-6 text-center text-sm">
			<p class="text-slate-400">
				Already have an account?
				<a
					href="/auth/login"
					class="font-medium text-emerald-400 hover:text-emerald-300 hover:underline">Login here</a
				>
			</p>
			<p class="mt-2 text-slate-500 transition-colors hover:text-slate-400">
				<a href="/" class="hover:underline">&larr; Back to Home</a>
			</p>
		</div>
	</div>
</div>
