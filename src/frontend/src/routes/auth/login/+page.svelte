<!-- gefifi-2/src/frontend/src/routes/auth/login/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import apiClient, { ApiError } from '$lib/api';

	// Get Google Client ID from environment variables
	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	let phoneNumber = $state('');
	let otpCode = $state('');
	let otpSent = $state(false);
	let cooldownSeconds = $state(0);
	let timerInterval: any = null;

	let isLoading = $state(false);
	let errorMessage: string | null = $state(null);
	let googleIsLoading = $state(false);

	// Sanitize phone number and OTP inputs reactively
	$effect(() => {
		phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
	});

	$effect(() => {
		otpCode = otpCode.replace(/\D/g, '').slice(0, 6);
	});

	// --- OTP Functions ---
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

	async function handleVerifyAndLogin() {
		isLoading = true;
		errorMessage = null;

		if (!otpCode || otpCode.length !== 6) {
			errorMessage = 'Please enter a valid 6-digit OTP code.';
			isLoading = false;
			return;
		}

		try {
			const result = await authStore.verifyOtp(phoneNumber, otpCode);
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

	// --- Google Sign-In Functions ---

	function handleGoogleLogin() {
		if (!GOOGLE_CLIENT_ID) {
			errorMessage = 'Google Client ID is not configured. Cannot perform Google login.';
			console.error(errorMessage);
			return;
		}
		googleIsLoading = true;
	}

	// This function will be called by the Google library after a successful sign-in
	async function handleGoogleCredentialResponse(response: any) {
		googleIsLoading = true;
		errorMessage = null;
		try {
			const result = await authStore.googleLogin({ googleTokenId: response.credential });
			if (result.isNewUser) {
				goto('/auth/complete-profile', { replaceState: true });
			} else {
				goto('/home', { replaceState: true });
			}
		} catch (error: unknown) {
			console.error('Google Sign-In Error:', error);
			if (error instanceof ApiError && error.status === 400) {
				errorMessage =
					error.data?.message ||
					'This Google account is not yet registered. Please register first.';
			} else if (error instanceof ApiError) {
				errorMessage = error.data?.message || 'An error occurred during Google Sign-In.';
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			googleIsLoading = false;
		}
	}

	// Redirect if already logged in & initialize Google Sign-In
	let unsubscribeAuth: (() => void) | null = null;
	onMount(() => {
		// Set up redirect for already logged-in users
		unsubscribeAuth = authStore.subscribe((state) => {
			if (state.isAuthenticated && !state.isLoading) {
				goto('/home', { replaceState: true });
			}
		});
		if ($authStore.isAuthenticated && !$authStore.isLoading) {
			goto('/home', { replaceState: true });
		}

		// Initialize Google Sign-In
		if (GOOGLE_CLIENT_ID && window.google) {
			window.google.accounts.id.initialize({
				client_id: GOOGLE_CLIENT_ID,
				callback: handleGoogleCredentialResponse
			});

			// Render the Google Sign-In button
			const googleButtonElement = document.getElementById('google-signin-button');
			if (googleButtonElement) {
				window.google.accounts.id.renderButton(googleButtonElement, {
					theme: 'outline',
					size: 'large',
					type: 'standard',
					text: 'signin_with',
					shape: 'rectangular',
					logo_alignment: 'left'
				});
			}
		} else {
			console.error('Google Client ID not found or Google script not loaded.');
		}

		return () => {
			if (unsubscribeAuth) {
				unsubscribeAuth();
			}
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});
</script>

<div
	class="flex min-h-screen flex-col justify-center bg-linear-to-br from-slate-900 via-slate-800 to-gray-900 px-6 py-12 lg:px-8"
>
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<a href="/">
			<img
				class="mx-auto h-16 w-auto"
				src="/images/Gefifi-Logo.png"
				alt="GEFIFI Construction Marketplace"
			/>
		</a>
		<h2 class="mt-6 text-center text-2xl leading-9 font-bold tracking-tight text-sky-300">
			Sign in to your account
		</h2>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				if (otpSent) {
					handleVerifyAndLogin();
				} else {
					handleSendOtp();
				}
			}}
			class="space-y-6 rounded-xl bg-slate-800/70 p-6 shadow-2xl sm:p-8"
		>
			{#if errorMessage}
				<div
					class="rounded-md border border-red-500/50 bg-red-500/25 p-3 text-sm text-red-300"
					role="alert"
				>
					{errorMessage}
				</div>
			{/if}

			<div>
				<label for="phoneNumber" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Phone Number</label
				>
				<div class="mt-2 flex gap-2">
					<input
						type="tel"
						id="phoneNumber"
						bind:value={phoneNumber}
						required
						placeholder="e.g. +919999999999"
						disabled={otpSent || isLoading || googleIsLoading}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
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
					<label for="otpCode" class="mb-1.5 block text-sm font-medium text-sky-300"
						>One-Time Password (OTP)</label
					>
					<input
						type="text"
						id="otpCode"
						inputmode="numeric"
						bind:value={otpCode}
						required
						class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-center text-lg font-mono tracking-widest text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-slate-800 disabled:opacity-60"
						placeholder="Enter 6-digit code"
						disabled={isLoading || googleIsLoading}
					/>
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

			<div>
				{#if !otpSent}
					<button
						type="button"
						onclick={handleSendOtp}
						disabled={isLoading || googleIsLoading || !phoneNumber}
						class="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading}
							Sending OTP...
						{:else}
							Send Verification Code
						{/if}
					</button>
				{:else}
					<button
						type="submit"
						disabled={isLoading || googleIsLoading || !otpCode}
						class="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading}
							Verifying...
						{:else}
							Verify & Login
						{/if}
					</button>
				{/if}
			</div>

			<div class="relative flex items-center py-2">
				<div class="grow border-t border-slate-600"></div>
				<span class="mx-4 shrink text-xs text-slate-400 uppercase">Or</span>
				<div class="grow border-t border-slate-600"></div>
			</div>

			<!-- Google Sign-In Button Container -->
			<div id="google-signin-button" class="flex justify-center">
				<button
					type="button"
					disabled={true}
					class="flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-slate-700 px-6 py-3 font-semibold text-slate-300 opacity-70 shadow-md"
				>
					Loading Google Sign-In...
				</button>
			</div>
		</form>

		<div class="mt-6 text-center text-sm">
			<p class="text-slate-400">
				Don't have an account?
				<a
					href="/auth/register"
					class="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
					>Register here</a
				>
			</p>
			<p class="mt-2 text-slate-500 transition-colors hover:text-slate-400">
				<a href="/" class="hover:underline">&larr; Back to Home</a>
			</p>
		</div>
	</div>
</div>
