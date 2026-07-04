<!-- gefifi-2/src/frontend/src/routes/auth/register/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/state';

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	let selectedUserType: 'customer' | 'expert' | 'supplier' | null = $state(null);

	// Form State
	let phoneNumber = $state('');
	let otpCode = $state('');
	let otpSent = $state(false);
	let cooldownSeconds = $state(0);
	let timerInterval: any = null;

	let isLoading = $state(false);
	let errorMessage: string | null = $state(null);
	let googleIsLoading = false;
	let isAlreadySelected = $state(false);

	// Sanitize phone number and OTP inputs reactively
	$effect(() => {
		phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
	});

	$effect(() => {
		otpCode = otpCode.replace(/\D/g, '').slice(0, 6);
	});

	const userTypes = [
		{
			value: 'customer' as const,
			label: 'Customer',
			description: 'I need to find professionals or source materials for a project.'
		},
		{
			value: 'expert' as const,
			label: 'Expert',
			description: 'I offer professional construction services and want to find work.'
		},
		{
			value: 'supplier' as const,
			label: 'Supplier',
			description: 'I provide construction materials and want to connect with customers.'
		}
	];

	function selectUserType(type: 'customer' | 'expert' | 'supplier') {
		selectedUserType = type;
		errorMessage = null; // Clear error when a selection is made
	}

	function startCooldown(seconds: number = 60) {
		cooldownSeconds = seconds;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (cooldownSeconds > 0) {
				cooldownSeconds--;
			} else {
				clearInterval(timerInterval);
			}
		}, 1000);
	}

	function formatPhoneNumber(input: string): string {
		const cleaned = input.trim().replace(/[^\d+]/g, '');
		if (cleaned.startsWith('+')) {
			return cleaned;
		}
		if (cleaned.startsWith('91') && cleaned.length === 12) {
			return '+' + cleaned;
		}
		if (cleaned.length === 10) {
			return '+91' + cleaned;
		}
		return '+91' + cleaned;
	}

	async function handleSendOtp() {
		isLoading = true;
		errorMessage = null;

		if (!selectedUserType) {
			errorMessage = 'Please select a user type to continue.';
			isLoading = false;
			return;
		}

		phoneNumber = formatPhoneNumber(phoneNumber);

		const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
		if (!PHONE_REGEX.test(phoneNumber)) {
			errorMessage = 'Please enter a valid E.164 phone number (e.g. +919999999999). If using another country code, prepend it with + (e.g. +1).';
			isLoading = false;
			return;
		}

		try {
			const res = await authStore.sendOtp(phoneNumber);
			if (res.success) {
				otpSent = true;
				startCooldown(60);
			} else {
				errorMessage = res.message;
				if (res.cooldownRemaining) {
					startCooldown(res.cooldownRemaining);
				}
			}
		} catch (error: any) {
			errorMessage = error.message || 'Failed to send OTP.';
		} finally {
			isLoading = false;
		}
	}

	async function handleVerifyAndRegister() {
		isLoading = true;
		errorMessage = null;

		if (!otpCode || otpCode.length !== 6) {
			errorMessage = 'Please enter a valid 6-digit OTP code.';
			isLoading = false;
			return;
		}

		if (!selectedUserType) {
			errorMessage = 'Please select a user type to continue.';
			isLoading = false;
			return;
		}

		try {
			const result = await authStore.verifyOtp(phoneNumber, otpCode, selectedUserType);
			if (result.isNewUser) {
				goto('/auth/complete-profile', { replaceState: true });
			} else {
				goto('/home', { replaceState: true });
			}
		} catch (error: any) {
			errorMessage = error.message || 'Verification failed. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleCredentialResponse(response: any) {
		googleIsLoading = true;
		errorMessage = null;

		if (!selectedUserType) {
			errorMessage =
				'Please select your user type (Customer, Expert, or Supplier) before using Google Sign-In.';
			googleIsLoading = false;
			return;
		}

		try {
			const result = await authStore.googleLogin({
				googleTokenId: response.credential,
				userTypeForNewUser: selectedUserType
			});

			if (result.isNewUser) {
				goto('/auth/complete-profile', { replaceState: true });
			} else {
				goto('/home', { replaceState: true });
			}
		} catch (error: unknown) {
			errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
		} finally {
			googleIsLoading = false;
		}
	}

	let unsubscribeAuth: (() => void) | null = null;
	onMount(() => {
		const initialAuthState = get(authStore);
		if (initialAuthState.isAuthenticated && !initialAuthState.isLoading) {
			goto('/home', { replaceState: true });
		}
		unsubscribeAuth = authStore.subscribe((state) => {
			if (state.isAuthenticated && !state.isLoading) {
				goto('/home', { replaceState: true });
			}
		});

		// get user type from URL query parameter
		selectedUserType =
			(page.url.searchParams.get('type') as 'customer' | 'expert' | 'supplier') || null;

		// if user type is already selected from the landing page and sent via URL query parameter, hide the user type selection
		if (selectedUserType !== null) {
			isAlreadySelected = true;
		}

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
					text: 'continue_with',
					shape: 'rectangular',
					logo_alignment: 'left'
				});
			}
		} else {
			console.error('Google Client ID not found or Google script not loaded.');
		}

		return () => {
			if (unsubscribeAuth) unsubscribeAuth();
			if (timerInterval) clearInterval(timerInterval);
		};
	});
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-4 font-sans text-gray-100"
>
	<div class="w-full max-w-lg">
		<div class="mb-6 text-center sm:mb-8">
			<a href="/">
				<img src="/images/Gefifi-Logo.png" alt="GEFIFI Logo" class="mx-auto h-16 w-auto" />
			</a>
			<h1 class="mt-4 text-2xl text-sky-300">Create Your Account</h1>
			<p class="text-sm text-slate-400">
				{#if !selectedUserType}
					First, tell us who you are.
				{:else}
					Now, let's create your login credentials.
				{/if}
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

			{#if !isAlreadySelected}
				<div class="mb-6 space-y-4">
					<h3 class="text-center font-semibold text-slate-300">I am a...</h3>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{#each userTypes as type (type.value)}
							<button
								onclick={() => selectUserType(type.value)}
								class="flex flex-col items-center rounded-lg border-2 p-4 text-center transition-all duration-200 ease-in-out {selectedUserType ===
								type.value
									? 'border-emerald-500 bg-emerald-500/20 shadow-lg'
									: 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700'}"
							>
								<span class="text-lg font-bold text-slate-100">{type.label}</span>
								<span class="mt-1 text-xs text-slate-400">{type.description}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- This div will now always exist but will be hidden until a user type is selected -->
			<div class:hidden={!selectedUserType} class="mt-6">
				<div id="google-register-button" class="flex justify-center" data-text="signup_with"></div>

				<div
					class="my-6 flex items-center before:flex-1 before:border-t before:border-slate-600 after:flex-1 after:border-t after:border-slate-600"
				>
					<p class="mx-4 text-center text-sm font-semibold">OR</p>
				</div>

				<form
					class="space-y-6"
					onsubmit={(e) => {
						e.preventDefault();
						if (otpSent) {
							handleVerifyAndRegister();
						} else {
							handleSendOtp();
						}
					}}
				>
					<div>
						<label for="phoneNumber" class="block text-sm leading-6 font-medium text-slate-300"
							>Phone Number</label
						>
						<div class="mt-2 flex gap-2">
							<input
								id="phoneNumber"
								name="phoneNumber"
								type="tel"
								autocomplete="tel"
								required
								placeholder="e.g. +919999999999"
								disabled={otpSent || isLoading}
								bind:value={phoneNumber}
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 px-3 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset disabled:opacity-60"
							/>
							{#if otpSent}
								<button
									type="button"
									onclick={() => { otpSent = false; otpCode = ''; }}
									class="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600"
								>
									Change
								</button>
							{/if}
						</div>
					</div>

					{#if otpSent}
						<div>
							<label for="otpCode" class="block text-sm leading-6 font-medium text-slate-300"
								>One-Time Password (OTP)</label
							>
							<div class="mt-2">
								<input
									id="otpCode"
									name="otpCode"
									type="text"
									inputmode="numeric"
									required
									placeholder="Enter 6-digit code"
									disabled={isLoading}
									bind:value={otpCode}
									class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 px-3 text-center text-lg font-mono tracking-widest text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
								/>
							</div>
							<p class="mt-2 text-xs text-slate-400">
								{#if cooldownSeconds > 0}
									Resend OTP in {cooldownSeconds}s
								{:else}
									<button
										type="button"
										onclick={handleSendOtp}
										class="text-emerald-400 underline hover:text-emerald-300"
									>
										Resend OTP
									</button>
								{/if}
							</p>
						</div>
					{/if}

					<div class="pt-4">
						{#if !otpSent}
							<button
								type="button"
								onclick={handleSendOtp}
								disabled={isLoading || !phoneNumber}
								class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
							>
								{#if isLoading}
									<span>Sending OTP...</span>
								{:else}
									Send Verification Code
								{/if}
							</button>
						{:else}
							<button
								type="submit"
								disabled={isLoading || !otpCode}
								class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
							>
								{#if isLoading}
									<span>Verifying...</span>
								{:else}
									Verify & Create Account
								{/if}
							</button>
						{/if}
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
