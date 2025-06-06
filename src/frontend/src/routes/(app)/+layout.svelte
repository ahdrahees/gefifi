<!-- gefifi-2/src/frontend/src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser, type AuthState } from '$lib/stores/auth';
	// onMount is not strictly needed here anymore unless for specific onMount logic
	// import { onMount } from 'svelte';

	// Reactive subscription to the auth store
	// currentAuth will have the shape of AuthState from our auth.ts store
	// $: currentAuth = $authStore;
	let currentAuth = $derived($authStore);

	interface NavLink {
		href: string;
		label: string;
		iconKey: keyof typeof icons;
		types: Array<AuthUser['userType'] | 'all'>; // Use AuthUser['userType']
	}

	const navLinks: NavLink[] = $state([
		{ href: '/dashboard', label: 'Dashboard', iconKey: 'dashboard', types: ['all'] },
		{ href: '/chat', label: 'Chat', iconKey: 'chat', types: ['all'] },
		{ href: '/contracts', label: 'Contracts', iconKey: 'contracts', types: ['all'] },
		{
			href: '/customer/create-request',
			label: 'New Request',
			iconKey: 'newRequest',
			types: ['customer']
		}
		// Example of expert/supplier specific links (can be uncommented and icons added if needed)
		// { href: '/expert/work-feed', label: 'Work Feed', iconKey: 'feed', types: ['expert'] },
		// { href: '/supplier/material-requests', label: 'Material Feed', iconKey: 'materials', types: ['supplier'] },
	]);

	async function handleLogout() {
		await authStore.logout();
		// After logout, the authStore state will change, and the UI should react.
		// We also explicitly navigate to ensure the user lands on the login page.
		// A hook might also handle this redirection more globally.
		goto('/auth/login', { replaceState: true });
	}

	let sidebarOpen = $state(false);

	// SVG Icons
	const icons = {
		dashboard: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`,
		chat: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.697-3.697c-.024-.024-.047-.048-.072-.071a11.91 11.91 0 01-6.185-1.347M16.5 9.75L9 14.25m7.5-4.5l-7.5 4.5M3.75 8.511c-.884.284-1.5 1.128-1.5 2.097v4.286c0 1.136.847 2.1 1.98 2.193.34.027-.68.052 1.02.072v3.091l3.697-3.697c.024-.024.047-.048-.072-.071a11.91 11.91 0 016.185-1.347m0-2.489c.331 0 .658.025.973.069a11.909 11.909 0 00-9.054-3.996c-1.756 0-3.404.44-4.84 1.206a11.892 11.892 0 00-6.184 3.99V10.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0020.25 6v1.5a2.25 2.25 0 00-2.25 2.25H15m-1.5-1.5l-7.5 4.5" /></svg>`,
		contracts: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`,
		newRequest: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
		logout: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>`,
		menu: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`,
		close: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
		feed: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>`, // Placeholder
		materials: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V3.75m0 0L10.5 5.25M12 3.75l1.5 1.5" /></svg>` // Placeholder
	};

	// $: filteredNavLinks = navLinks.filter(
	// 	(link) =>
	// 		link.types.includes('all') ||
	// 		(currentAuth.user?.userType && link.types.includes(currentAuth.user.userType))
	// );

	let filteredNavLinks = $derived(
		navLinks.filter(
			(link) =>
				link.types.includes('all') ||
				(currentAuth.user?.userType && link.types.includes(currentAuth.user.userType))
		)
	);

	let { children } = $props(); // Svelte 4 way to get slot content
</script>

<div class="flex h-screen bg-slate-800 font-sans text-gray-100">
	<!-- Sidebar -->
	<aside
		class:translate-x-0={sidebarOpen}
		class:!-translate-x-full={!sidebarOpen}
		class="fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-slate-900 shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0"
	>
		<!-- Logo -->
		<div class="flex h-20 shrink-0 items-center justify-center border-b border-slate-700/50 px-4">
			<a
				href="/dashboard"
				class="text-3xl font-bold text-emerald-400 transition-colors hover:text-emerald-300"
			>
				GEFIFI
			</a>
		</div>

		<!-- Navigation Links -->
		<nav class="flex-grow space-y-2 overflow-y-auto p-4">
			{#if currentAuth.isLoading && !currentAuth.isLoggedIn}
				<!-- Skeleton Loader for Nav when initially loading and not yet logged in -->
				{#each Array(4) as index (index)}
					<div class="mb-2 h-10 animate-pulse rounded-lg bg-slate-700/50"></div>
				{/each}
			{:else if currentAuth.isLoggedIn && currentAuth.user}
				{#each filteredNavLinks as link (link)}
					<a
						href={link.href}
						class="group flex items-center space-x-3 rounded-lg px-3 py-2.5 transition-colors duration-150 ease-in-out
                   {$page.url.pathname.startsWith(link.href) &&
						(link.href !== '/dashboard' || $page.url.pathname === '/dashboard')
							? 'bg-emerald-600 text-white shadow-md'
							: 'text-slate-300 hover:bg-slate-700/50 hover:text-emerald-300'}"
						onclick={() => (sidebarOpen = false)}
						title={link.label}
					>
						{@html icons[link.iconKey]}
						<span class="truncate">{link.label}</span>
					</a>
				{/each}
			{/if}
		</nav>

		<!-- User Profile / Logout -->
		<div class="shrink-0 border-t border-slate-700/50 p-4">
			{#if currentAuth.isLoading && !currentAuth.isLoggedIn}
				<div class="mb-3 flex animate-pulse items-center">
					<div class="mr-3 h-10 w-10 rounded-full bg-slate-700"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-3/4 rounded bg-slate-700"></div>
						<div class="h-2 w-1/2 rounded bg-slate-700"></div>
						<div class="h-2 w-1/3 rounded bg-slate-700"></div>
					</div>
				</div>
				<div class="h-9 animate-pulse rounded-lg bg-slate-700"></div>
			{:else if currentAuth.isLoggedIn && currentAuth.user}
				<div class="mb-3 flex items-center">
					<img
						src={currentAuth.user.profile?.avatarUrl || '/default-avatar.png'}
						alt={currentAuth.user.profile?.fullName || 'User Avatar'}
						class="mr-3 h-10 w-10 shrink-0 rounded-full border-2 border-emerald-500 object-cover"
						loading="lazy"
					/>
					<div class="overflow-hidden">
						<p
							class="truncate text-sm font-semibold text-white"
							title={currentAuth.user.profile?.fullName}
						>
							{currentAuth.user.profile?.fullName || currentAuth.user.email.split('@')[0]}
						</p>
						<p class="truncate text-xs text-slate-400" title={currentAuth.user.email}>
							{currentAuth.user.email}
						</p>
						<p class="text-xs text-amber-400 capitalize">{currentAuth.user.userType}</p>
					</div>
				</div>
				<button
					onclick={handleLogout}
					class="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-in-out hover:bg-red-700"
				>
					{@html icons.logout}
					<span>Logout</span>
				</button>
			{:else}
				<!-- This case should ideally be handled by a route guard redirecting to login -->
				<a
					href="/auth/login"
					class="block w-full rounded-lg bg-emerald-500 px-4 py-2 text-center text-white hover:bg-emerald-600"
				>
					Login to Continue
				</a>
			{/if}
		</div>
	</aside>

	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Mobile Header (for menu toggle) -->
		<header
			class="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between bg-slate-900 p-4 shadow-md md:hidden"
		>
			<a href="/dashboard" class="text-xl font-bold text-emerald-400">GEFIFI</a>
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="-mr-2 p-2 text-slate-300 hover:text-emerald-400"
			>
				{#if sidebarOpen}
					{@html icons.close}
				{:else}
					{@html icons.menu}
				{/if}
			</button>
		</header>

		<!-- Page Content Slot -->
		<main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-800 p-4 sm:p-6 lg:p-8">
			{#if currentAuth.isLoading}
				<div class="flex h-full items-center justify-center">
					<svg
						class="h-8 w-8 animate-spin text-emerald-400"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span class="ml-3 text-slate-300">Loading application state...</span>
				</div>
			{:else if currentAuth.isLoggedIn}
				{@render children()}
			{:else}
				<!-- This content is shown if not logged in.
             A route guard should ideally redirect to /auth/login instead of showing this in-place.
             The authStore.loadUserFromStorage() is called on app init.
             If it completes and isLoggedIn is false, a hook should redirect. -->
				<div class="flex h-full flex-col items-center justify-center text-center">
					<h2 class="mb-3 text-2xl font-semibold text-sky-300">Access Denied</h2>
					<p class="mb-6 max-w-md text-slate-300">
						It seems you're not logged in or your session might have expired. Please log in to
						access your GEFIFI dashboard and features.
					</p>
					<a
						href="/auth/login"
						class="rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-emerald-600 hover:shadow-lg"
					>
						Go to Login
					</a>
				</div>
			{/if}
		</main>
	</div>
</div>

<style lang="postcss">
	/* Optional: Global scrollbar styling for a more consistent dark theme feel */
	/* These are webkit-specific but common */
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	::-webkit-scrollbar-track {
		@apply bg-slate-800; /* Or bg-slate-900 if sidebar is primary scroll context */
	}
	::-webkit-scrollbar-thumb {
		@apply rounded bg-slate-600;
	}
	::-webkit-scrollbar-thumb:hover {
		@apply bg-emerald-500;
	}
</style>
