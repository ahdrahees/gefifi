<!-- gefifi-2/src/frontend/src/routes/auth/login/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth'; // Assuming AuthUser is also exported or not needed directly here
  import apiClient, { ApiError } from '$lib/api'; 

  let email = '';
  let password = '';
  let isLoading = false;
  let errorMessage: string | null = null;
  let googleIsLoading = false;

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
      console.error("Login page error:", error);
    } finally {
      isLoading = false;
    }
  }

  async function handleGoogleLogin() {
    googleIsLoading = true;
    errorMessage = null;
    try {
      // For a real Google Sign-In, you'd use the Google Sign-In library client-side
      // to get the googleTokenId.
      // Then pass that googleTokenId to your backend.
      // For this demo, we'll use the mock flow defined in the backend.
      const mockGoogleUserData = {
        email: `guser${Date.now().toString().slice(-6)}@example.com`, // Unique email for new mock users
        googleId: `google${Date.now()}`, // Unique googleId
        name: 'Mock Google User',
        userType: 'customer', // Default userType for new Google users, or prompt on frontend
        profile: { 
            fullName: 'Mock Google User',
            // Using one of the cat images as a placeholder avatar from static folder
            avatarUrl: '/hero/Tabby Cat Construction Worker.png' 
        }
      };
      
      // Call the apiClient's googleLogin method, which POSTs to /api/auth/google
      const response = await apiClient.googleLogin({ mockGoogleUser: mockGoogleUserData });
      
      // Update the authStore with the user and token from the backend response
      // The `_updateAuthData` is an internal helper, normally you'd rely on login/register actions.
      // But for Google flow where backend handles user creation/retrieval, this direct update is okay.
      authStore._updateAuthData(response.token, response.user);

      goto('/dashboard');
    } catch (error: any) {
       if (error instanceof ApiError) {
        errorMessage = error.data?.message || error.message || 'Google login failed. Please try again.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred during Google login.';
      }
      console.error("Google Login page error:", error);
    } finally {
      googleIsLoading = false;
    }
  }

  // Redirect if already logged in
  let unsubscribeAuth: (() => void) | null = null;
  import { onMount } from 'svelte';
  onMount(() => {
    unsubscribeAuth = authStore.subscribe(state => {
      if (state.isLoggedIn && !state.isLoading) {
        // Check !state.isLoading to prevent redirect during initial auth check
        goto('/dashboard', { replaceState: true });
      }
    });
    // Ensure we don't redirect prematurely if still loading auth state
    const initialAuthState = $authStore;
    if(initialAuthState.isLoggedIn && !initialAuthState.isLoading) {
        goto('/dashboard', { replaceState: true });
    }

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  });

</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <a href="/" class="text-5xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
        GEFIFI
      </a>
      <h1 class="text-2xl text-sky-300 mt-2">Welcome Back!</h1>
      <p class="text-slate-400 text-sm">Login to continue your construction journey.</p>
    </div>

    <form on:submit|preventDefault={handleLogin} class="bg-slate-800/70 shadow-2xl rounded-xl p-6 sm:p-8 space-y-6">
      {#if errorMessage}
        <div class="p-3 rounded-md text-sm bg-red-500/25 text-red-300 border border-red-500/50" role="alert">
          {errorMessage}
        </div>
      {/if}

      <div>
        <label for="email" class="block text-sm font-medium text-sky-300 mb-1.5">Email Address</label>
        <input 
          type="email" 
          id="email" 
          bind:value={email} 
          required 
          class="w-full bg-slate-700/80 border border-slate-600 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
          placeholder="you@example.com"
          disabled={isLoading || googleIsLoading}
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-sky-300 mb-1.5">Password</label>
        <input 
          type="password" 
          id="password" 
          bind:value={password} 
          required 
          class="w-full bg-slate-700/80 border border-slate-600 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
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
          class="w-full flex justify-center items-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
          {:else}
            Login
          {/if}
        </button>
      </div>

      <div class="relative flex py-2 items-center">
        <div class="flex-grow border-t border-slate-600"></div>
        <span class="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or</span>
        <div class="flex-grow border-t border-slate-600"></div>
      </div>

      <div>
        <button 
          type="button" 
          on:click={handleGoogleLogin}
          disabled={isLoading || googleIsLoading}
          class="w-full flex justify-center items-center bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {#if googleIsLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          {:else}
            <!-- Simple Google Icon Placeholder -->
            <svg class="mr-2 -ml-1 w-4 h-4" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Login with Google
          {/if}
        </button>
      </div>
    </form>

    <div class="mt-6 text-center text-sm">
      <p class="text-slate-400">
        Don't have an account? 
        <a href="/auth/register" class="font-medium text-emerald-400 hover:text-emerald-300 hover:underline">Register here</a>
      </p>
      <p class="mt-2 text-slate-500 hover:text-slate-400 transition-colors">
        <a href="/" class="hover:underline">&larr; Back to Home</a>
      </p>
    </div>
  </div>
</div>