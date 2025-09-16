<!-- gefifi-2/src/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css'; // Import global styles, including Tailwind base
	import { onMount } from 'svelte';
	// import { page } from '$app/stores'; // To get current path information
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let { children } = $props();

	onMount(() => {
		// The onMount ensures this logic only runs on the client-side.
		// The `ssr = false` export further ensures that the initial render path
		// for this layout (and its children) is client-side dominant for this logic.

		// The authStore automatically calls loadUserFromStorage on import if in browser.
		// We subscribe to changes in the auth state to react to login/logout or initial load completion.
		const unsubscribe = authStore.subscribe((currentAuth) => {
			// Wait for the auth store to finish its initial loading attempt
			if (currentAuth.isLoading) {
				// console.log('[RootLayout] Auth store is loading, waiting...');
				return;
			}

			const currentPath = $derived(page.url.pathname);
			const isLoggedIn = currentAuth.isAuthenticated;

			// Define routes that require authentication
			// These are typically routes that fall under the (app) layout group.
			const protectedAppRoutePatterns = [
				'/home', // Matches /home and /home/*
				'/chat', // Matches /chat and /chat/*
				'/contracts', // Matches /contracts and /contracts/*
				'/customer/create-request' // Specific customer route
				// Add more top-level paths of your protected (app) routes
			];

			// Define authentication pages (login, register)
			const authPages = ['/auth/login', '/auth/register'];

			// Check if currentPath starts with any of the protectedAppRoutePatterns
			const isAccessingProtectedAppRoute = protectedAppRoutePatterns.some((route) =>
				currentPath.startsWith(route)
			);

			// Debug log (optional)
			// console.log(`[RootLayout Client] Path: ${currentPath}, LoggedIn: ${isLoggedIn}, IsAppRoute: ${isAccessingProtectedAppRoute}, StoreLoading: ${currentAuth.isLoading}`);

			if (isAccessingProtectedAppRoute && !isLoggedIn) {
				// console.log(`[RootLayout Client] User not logged in, trying to access protected route ${currentPath}. Redirecting to /auth/login.`);
				if (!authPages.includes(currentPath)) {
					goto('/auth/login', { replaceState: true });
				}
			}

			if (authPages.includes(currentPath) && isLoggedIn) {
				// console.log(`[RootLayout Client] User logged in, trying to access auth page ${currentPath}. Redirecting to /home.`);
				if (currentPath !== '/home') {
					// Prevent loop if already on homepage
					goto('/home', { replaceState: true });
				}
			}
		});

		// Cleanup subscription when the layout component is destroyed
		return () => {
			unsubscribe();
		};
	});
</script>

{@render children()}

<!--
  Global elements like a universal toast/notification system could go here,
  outside of specific layouts like (app)/+layout.svelte.
  The primary purpose of this root layout for this app is global styles and route protection.
  With `ssr = false`, this entire layout and its children will be client-side rendered.
-->
