<!-- gefifi-2/src/frontend/src/routes/auth/login/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import apiClient, { ApiError } from '$lib/api';

	// Get Google Client ID from environment variables
	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage: string | null = null;
	let googleIsLoading = false;

	// --- Google Sign-In Functions ---

	function handleGoogleLogin() {
		if (!GOOGLE_CLIENT_ID) {
			errorMessage = 'Google Client ID is not configured. Cannot perform Google login.';
			console.error(errorMessage);
			return;
		}
		googleIsLoading = true;
		// The actual sign-in is triggered by the Google library's button/prompt,
		// and the result is handled by the 'handleGoogleCredentialResponse' callback.
		// We can use a one-tap prompt for returning users.
		// For a button click, the library's own UI is preferred.
		// We just show a loading state on our button.
	}

	// This function will be called by the Google library after a successful sign-in
	async function handleGoogleCredentialResponse(response: any) {
		googleIsLoading = true;
		errorMessage = null;
		try {
			const result = await apiClient.googleLogin({ googleTokenId: response.credential });

			// On successful login (existing user) or registration, the backend returns a token.
			authStore._updateAuthData(result.token, result.user);
			goto('/dashboard', { replaceState: true });
		} catch (error: any) {
			console.error('Google Sign-In Error:', error);
			if (error instanceof ApiError && error.status === 400) {
				// Handle case where user is new and needs to select a userType
				errorMessage =
					error.data?.message ||
					'This Google account is not yet registered. Please use the registration page.';
				// TODO: In a more advanced flow, you could redirect to register page with pre-filled details.
				// For now, we just inform the user.
			} else if (error instanceof ApiError) {
				errorMessage = error.data?.message || 'An error occurred during Google Sign-In.';
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			googleIsLoading = false;
		}
	}

	// --- Email/Password Login ---
	async function handleLogin() {
		isLoading = true;
		errorMessage = null;
		try {
			await authStore.login({ email, password });
			// authStore's internal logic (via updateAuthData) should set isLoggedIn.
			// A reactive statement in a layout or a +layout.ts load function
			// would typically handle redirection based on isLoggedIn.
			// For now, explicit navigation on success:
			goto('/dashboard');
		} catch (error: any) {
			// The error thrown by authStore.login already has a user-friendly message
			errorMessage = error.message;
			console.error('Login page error:', error);
		} finally {
			isLoading = false;
		}
	}

	// Redirect if already logged in & initialize Google Sign-In
	let unsubscribeAuth: (() => void) | null = null;
	onMount(() => {
		// Set up redirect for already logged-in users
		unsubscribeAuth = authStore.subscribe((state) => {
			if (state.isAuthenticated && !state.isLoading) {
				goto('/dashboard', { replaceState: true });
			}
		});
		if ($authStore.isAuthenticated && !$authStore.isLoading) {
			goto('/dashboard', { replaceState: true });
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

			// Optional: Display one-tap prompt for returning users
			// window.google.accounts.id.prompt();
		} else {
			console.error('Google Client ID not found or Google script not loaded.');
		}

		return () => {
			if (unsubscribeAuth) {
				unsubscribeAuth();
			}
		};
	});
</script>

<div
	class="flex min-h-full flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 px-6 py-12 lg:px-8"
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
			on:submit|preventDefault={handleLogin}
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
				<label for="email" class="mb-1.5 block text-sm font-medium text-sky-300"
					>Email Address</label
				>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
					placeholder="you@example.com"
					disabled={isLoading || googleIsLoading}
				/>
			</div>

			<div>
				<label for="password" class="mb-1.5 block text-sm font-medium text-sky-300">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					class="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-gray-100 transition-colors outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
					placeholder="••••••••"
					disabled={isLoading || googleIsLoading}
				/>
				<!-- <div class="text-right mt-1">
          <a href="/auth/forgot-password" class="text-xs text-sky-400 hover:text-sky-300 hover:underline">Forgot password?</a>
        </div> -->
			</div>

			<div>
				<button
					type="submit"
					disabled={isLoading || googleIsLoading}
					class="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
						Logging in...
					{:else}
						Login
					{/if}
				</button>
			</div>

			<div class="relative flex items-center py-2">
				<div class="flex-grow border-t border-slate-600"></div>
				<span class="mx-4 flex-shrink text-xs text-slate-400 uppercase">Or</span>
				<div class="flex-grow border-t border-slate-600"></div>
			</div>

			<!-- Google Sign-In Button Container -->
			<div id="google-signin-button" class="flex justify-center">
				<!-- The Google library will render its button here. -->
				<!-- We can show a fallback or our own styled button as a placeholder. -->
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
