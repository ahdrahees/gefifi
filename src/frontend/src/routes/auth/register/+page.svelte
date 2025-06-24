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
		// No need to send profile data from here anymore, it will be collected on the next page
		// const profileForNewUser = currentStep === 2 ? profile : {};

		try {
			// Call the new googleLogin method from the authStore
			const result = await authStore.googleLogin({
				googleTokenId: response.credential,
				userTypeForNewUser: userTypeForNewUser
			});

			// On success, the store is already updated. Now, redirect based on isNewUser.
			if (result.isNewUser) {
				goto('/auth/complete-profile', { replaceState: true });
			} else {
				goto('/dashboard', { replaceState: true });
			}
		} catch (error: any) {
			console.error('Google Sign-In/Registration Error:', error);
			errorMessage = error.message || 'An unexpected error occurred.';
		} finally {
			googleIsLoading = false;
		}
	}

	let unsubscribeAuth: (() => void) | null = null;
	onMount(() => {
		// Redirect logic
		const initialAuthState = $authStore;
		if (initialAuthState.isAuthenticated && !initialAuthState.isLoading) {
			goto('/dashboard', { replaceState: true });
		}
		unsubscribeAuth = authStore.subscribe((state) => {
			if (state.isAuthenticated && !state.isLoading) {
				goto('/dashboard', { replaceState: true });
			}
		});

		// Initialize Google Sign-In
		if (GOOGLE_CLIENT_ID && window.google) {
			window.google.accounts.id.initialize({
				client_id: GOOGLE_CLIENT_ID,
				callback: handleGoogleCredentialResponse
			});

			const googleButtonElement = document.getElementById('google-register-button');
			if (googleButtonElement) {
				window.google.accounts.id.renderButton(googleButtonElement, {
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
					class="group flex items-center {currentStep === 1
						? 'text-emerald-300'
						: 'text-slate-400 hover:text-slate-200'}"
					on:click={() => (currentStep = 1)}
					disabled={isLoading || googleIsLoading}
					aria-current={currentStep === 1 ? 'step' : undefined}
				>
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full border-2 {currentStep === 1
							? 'border-emerald-400 bg-emerald-500/20'
							: 'border-slate-600 group-hover:border-slate-400'}"
					>
						1
					</span>
					<span class="ml-2 text-xs font-semibold sm:text-sm">Account</span>
				</button>
				<div class="h-px flex-1 {currentStep > 1 ? 'bg-emerald-400' : 'bg-slate-600'} mx-1"></div>
				<button
					class="group flex items-center {currentStep === 2
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
							: 'border-slate-600 group-hover:border-slate-400'}"
					>
						2
					</span>
					<span class="ml-2 text-xs font-semibold sm:text-sm">Profile</span>
				</button>
			</div>

			<!-- STEP 1: ACCOUNT DETAILS (Email, Password, UserType) -->
			<div class:hidden={currentStep !== 1}>
				<form
					class="space-y-6"
					on:submit|preventDefault={() => {
						handleNextStep();
					}}
				>
					<div>
						<label for="email" class="block text-sm leading-6 font-medium text-slate-300"
							>Email address</label
						>
						<div class="mt-2">
							<input
								id="email"
								name="email"
								type="email"
								autocomplete="email"
								required
								bind:value={email}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="block text-sm leading-6 font-medium text-slate-300"
							>Password</label
						>
						<div class="mt-2">
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="new-password"
								required
								minlength="6"
								bind:value={password}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm leading-6 font-medium text-slate-300"
							>Confirm Password</label
						>
						<div class="mt-2">
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autocomplete="new-password"
								required
								bind:value={confirmPassword}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label for="userType" class="block text-sm leading-6 font-medium text-slate-300"
							>I am a...</label
						>
						<div class="mt-2">
							<select
								id="userType"
								name="userType"
								bind:value={userType}
								required
								class="block w-full appearance-none rounded-lg border-0 bg-slate-700/50 py-2.5 pr-10 pl-3 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								style={bgstyle}
							>
								{#each userTypes as type}
									<option value={type.value}>{type.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex items-center justify-between">
						<div class="text-sm">
							<a href="/auth/login" class="font-semibold text-emerald-400 hover:text-emerald-300"
								>Already have an account?</a
							>
						</div>
					</div>

					<div>
						<button
							type="submit"
							class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm leading-6 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
							disabled={!email || !password || !confirmPassword}
						>
							Next: Profile Details
						</button>
					</div>
				</form>
				<div
					class="my-6 flex items-center before:flex-1 before:border-t before:border-slate-600 before:content-[''] after:flex-1 after:border-t after:border-slate-600 after:content-['']"
				>
					<p class="mx-4 mb-0 text-center text-sm font-semibold">OR</p>
				</div>
				<div id="google-register-button" class="flex justify-center" data-text="signup_with"></div>
			</div>

			<!-- STEP 2: PROFILE DETAILS (Based on UserType) -->
			<div class:hidden={currentStep !== 2}>
				<form class="space-y-6" on:submit|preventDefault={handleRegister}>
					<!-- Fields for Customer -->
					{#if userType === 'customer' || userType === 'expert'}
						<div>
							<label for="fullName" class="block text-sm leading-6 font-medium text-slate-300"
								>Full Name</label
							>
							<div class="mt-2">
								<input
									id="fullName"
									name="fullName"
									type="text"
									required={userType !== 'customer'}
									bind:value={profile.fullName}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Fields for Supplier -->
					{#if userType === 'supplier'}
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
									bind:value={profile.companyName}
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
									bind:value={profile.category}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Fields for Expert -->
					{#if userType === 'expert'}
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
									bind:value={profile.expertise}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Shared fields for Expert & Supplier -->
					{#if userType === 'expert' || userType === 'supplier'}
						<div>
							<label for="experience" class="block text-sm leading-6 font-medium text-slate-300"
								>{userType === 'expert' ? 'Years of Experience' : 'Years in Business'}</label
							>
							<div class="mt-2">
								<input
									id="experience"
									name="experience"
									type="text"
									required
									bind:value={profile.experience}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
					{/if}

					<!-- Optional fields for all -->
					<div>
						<label for="phone" class="block text-sm leading-6 font-medium text-slate-300"
							>Phone Number <span class="text-xs text-slate-400">(Optional)</span></label
						>
						<div class="mt-2">
							<input
								id="phone"
								name="phone"
								type="tel"
								bind:value={profile.phoneNumber}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label for="location" class="block text-sm leading-6 font-medium text-slate-300"
							>Primary Location <span class="text-xs text-slate-400">(Optional)</span></label
						>
						<div class="mt-2">
							<input
								id="location"
								name="location"
								type="text"
								placeholder="e.g., Mumbai, Maharashtra"
								bind:value={profile.location}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset placeholder:text-gray-400 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

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
								<span>Processing...</span>
							{:else}
								Create Account
							{/if}
						</button>
					</div>
				</form>
			</div>
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
