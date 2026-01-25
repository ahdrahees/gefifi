import { authStore } from '$lib/stores/auth';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import type { HandleClientError, NavigationEvent } from '@sveltejs/kit';

/**
 * Client-side error handler for SvelteKit.
 * This function is called when an error occurs during client-side navigation or rendering.
 * @type {import('@sveltejs/kit').HandleClientError}
 */
export const handleError: HandleClientError = ({ error, event }) => {
  console.error('[GEFIFI Client Error Hook] An error occurred:', {
    error,
    routeId: event.route.id,
    url: event.url.pathname
  });

  // You can customize the error object returned to your $error.svelte page
  const status = (error as any)?.status || 500;
  let message = 'An unexpected error occurred. Please try refreshing the page.';

  if (error instanceof Error) {
    // For specific known errors, you might want custom messages
    // For example, if it's an ApiError from your API client
    if ((error as any).name === 'ApiError') {
      message = (error as any).data?.message || error.message || 'An API error occurred.';
    } else {
      message = error.message;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  // Example: Send to an error tracking service
  // Sentry.captureException(error, { extra: { event } });

  return {
    message: `Oops! ${message}`,
    status,
    errorId: 'CLIENT_HOOK_ERROR'
  };
};

/*
 * --- Client-Side Route Protection & Auth Redirects ---
 *
 * IMPORTANT SVELTEKIT NOTE:
 * Client-side route protection and redirects based on authentication state are
 * NOT typically handled in `hooks.client.ts` using a general `handle` function
 * for navigation events (unlike `hooks.server.ts`).
 * The `handle` export in `hooks.client.ts` is specifically for `handleFetch`,
 * which intercepts `fetch` requests made from the client-side SvelteKit code.
 *
 * Instead, client-side navigation protection logic should be placed in:
 *
 * 1. Root Layout (`src/routes/+layout.svelte` or `src/routes/+layout.ts`):
 *    - For client-side navigation checks after initial load:
 *      In `+layout.svelte`, use `onMount` to subscribe to the `authStore`.
 *      Inside the subscription, check `currentAuth.isLoggedIn` and `currentAuth.isLoading`.
 *      If `!currentAuth.isLoading`, then you can perform redirects using `goto()`.
 *      Alternatively, use SvelteKit's `beforeNavigate` function from `$app/navigation`
 *      within `+layout.svelte` for more granular control over navigation attempts.
 *
 * 2. `load` Functions (`+layout.ts` or `+page.ts`):
 *    - For protection during initial page load (both server-side and client-side hydration)
 *      and subsequent client-side navigations.
 *    - In a `load` function, you can check authentication status (e.g., from `authStore`
 *      if running on the client, or from session/cookies if on the server via `event.locals`).
 *    - Use `redirect()` from `@sveltejs/kit` to perform redirects within `load` functions.
 *
 *
 * --- EXAMPLE LOGIC (Place in appropriate files like `src/routes/+layout.svelte`) ---
 *
 * This demonstrates how you might implement the checks.
 * This is NOT for `hooks.client.ts` but for a layout file.
 */

/*
// In a root +layout.svelte or (app)/+layout.svelte:

<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state'; // To get current path/route information
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';

  onMount(() => {
    if (browser) {
      const unsubscribe = authStore.subscribe(currentAuth => {
        // Wait for the auth store to finish its initial loading
        if (currentAuth.isLoading) {
          // console.log('[Layout] Auth store is loading, waiting for definitive state...');
          return;
        }

        const currentPath = page.url.pathname;
        const currentRouteId = page.route.id;

        // Determine if the current route is an "app" route (needs protection)
        // This assumes your protected routes are under a group like (app)
        // or you have another way to identify them (e.g., from page.data)
        const isAppRoute = currentRouteId?.includes('(app)'); // Adjust based on your route grouping

        // Auth pages that logged-in users should be redirected away from
        const isAuthRoute = currentRouteId === '/auth/login' || currentRouteId === '/auth/register';

        // console.log(`[Layout Check] Path: ${currentPath}, RouteID: ${currentRouteId}, LoggedIn: ${currentAuth.isLoggedIn}`);

        if (isAppRoute && !currentAuth.isLoggedIn) {
          // console.log(`[Layout] User not logged in, trying to access ${currentPath}. Redirecting to /auth/login.`);
          if (currentPath !== '/auth/login') { // Prevent loop if login is somehow in (app)
            goto('/auth/login', { replaceState: true });
          }
        }

        if (isAuthRoute && currentAuth.isLoggedIn) {
          // console.log(`[Layout] User logged in, trying to access ${currentPath}. Redirecting to /home.`);
          if (currentPath !== '/home') { // Prevent loop if homepage is somehow an auth route
            goto('/home', { replaceState: true });
          }
        }
      });

      // Call loadUserFromStorage if it's not automatically called on store import
      // and needs to be triggered by the layout. (It's currently called on import in auth.ts)
      // authStore.loadUserFromStorage();

      return unsubscribe; // Cleanup subscription on component destroy
    }
  });
</script>

<slot />

*/

// If you need to intercept fetch requests globally (e.g., to add headers, not for navigation):
// export const handleFetch: HandleFetch = async ({ request, fetch }) => {
//   console.log('[Client Hook] handleFetch intercepting:', request.url);
//   // Example: Add a custom header to all outgoing fetch requests from the client
//   // if (request.url.startsWith(API_BASE_URL)) { // Assuming API_BASE_URL is defined
//   //   request.headers.set('X-Custom-Client-Header', 'gefifi-app');
//   // }
//   return fetch(request);
// };
