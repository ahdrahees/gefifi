<!-- gefifi-2/src/frontend/src/routes/auth/register/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	let selectedUserType: 'customer' | 'expert' | 'supplier' | null = null;

	// Form State
	let email = '';
	let password = '';
	let confirmPassword = '';

	let isLoading = false;
	let errorMessage: string | null = null;
	let googleIsLoading = false;
	let isAlreadySelected = false;

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

	async function handleRegister() {
		isLoading = true;
		errorMessage = null;

		if (!selectedUserType) {
			errorMessage = 'Please select a user type to continue.';
			isLoading = false;
			return;
		}
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			isLoading = false;
			return;
		}

		try {
			await authStore.register({
				email,
				password,
				userType: selectedUserType,
				profile: {} // Profile is now collected on the complete-profile page
			});
			goto('/home');
		} catch (error: any) {
			errorMessage = error.message || 'An unexpected error occurred during registration.';
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
		} catch (error: any) {
			errorMessage = error.message || 'An unexpected error occurred.';
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
			($page.url.searchParams.get('type') as 'customer' | 'expert' | 'supplier') || null;

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
								on:click={() => selectUserType(type.value)}
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

				<form class="space-y-6" on:submit|preventDefault={handleRegister}>
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
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
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
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
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
								class="block w-full rounded-lg border-0 bg-slate-700/50 py-2.5 text-gray-100 shadow-sm ring-1 ring-slate-600 ring-inset focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
							/>
						</div>
					</div>

					<div class="pt-4">
						<button
							type="submit"
							disabled={isLoading}
							class="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
						>
							{#if isLoading}
								<span>Creating Account...</span>
							{:else}
								Create Account & Continue
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
