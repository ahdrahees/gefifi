<!-- src/frontend/src/lib/components/ui/PWAInstallPrompt.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	onMount(() => {
		if (!browser) return;

		// Just log PWA capability for debugging, but don't show any prompts
		console.log('[PWA] PWA Install Prompt component loaded - using browser native install only');

		// Listen for app installed event for logging
		window.addEventListener('appinstalled', () => {
			console.log('[PWA] App was installed via browser native method');
		});

		// Don't prevent the default browser install prompt - let browser handle it natively
		window.addEventListener('beforeinstallprompt', (e) => {
			console.log('[PWA] Browser install prompt available - letting browser handle it');
			// Don't prevent default - let browser show its native install UI
		});
	});
</script>

<!-- PWA Install Prompt disabled - using browser native install only -->
<!-- The browser will show its own install prompt when appropriate -->
