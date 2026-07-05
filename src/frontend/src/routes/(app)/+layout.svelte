<!-- gefifi-2/src/frontend/src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import PWAInstallPrompt from '$lib/components/ui/PWAInstallPrompt.svelte';
	import AgentChatFAB from '$lib/components/agent/AgentChatFAB.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	console.log('[Debug] (app)/+layout.svelte script is executing.');

	let currentAuth = $derived($authStore);

	let showAgentFAB = $derived(
		currentAuth.isAuthenticated &&
		currentAuth.user?.userType === 'customer' &&
		page.url.pathname !== '/home' &&
		!page.url.pathname.startsWith('/agent')
	);

	interface NavLink {
		href: string;
		label: string;
		iconKey: keyof typeof icons;
		types: Array<AuthUser['userType'] | 'all'>;
	}

	const navLinks: NavLink[] = [
		{ href: '/home', label: 'Home', iconKey: 'home', types: ['all'] },
		{ href: '/my-requests', label: 'My Requests', iconKey: 'activeProjects', types: ['all'] },
		{
			href: '/customer/create-request',
			label: 'New Request',
			iconKey: 'newRequest',
			types: ['customer']
		},
		{
			href: '/find-professionals',
			label: 'Find Professionals',
			iconKey: 'findProfessionals',
			types: ['customer']
		},
		{ href: '/chat', label: 'Chat', iconKey: 'chat', types: ['all'] },
		{ href: '/contracts', label: 'Contracts', iconKey: 'contracts', types: ['all'] },
		{ href: '/agent', label: 'Agent', iconKey: 'agent', types: ['customer'] },
		{ href: '/help', label: 'Help', iconKey: 'help', types: ['all'] }
	];

	async function handleLogout() {
		if (window.google?.accounts?.id) {
			window.google.accounts.id.cancel();
		}
		await authStore.logout();
		goto('/auth/login', { replaceState: true });
	}

	let sidebarOpen: boolean = $state(true);

	onMount(() => {
		console.log('[Debug] (app)/+layout.svelte has mounted.');
		sidebarOpen = window.innerWidth >= 1024;
	});

	const icons = {
		home: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-5 h-5'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' /></svg>`,
		activeProjects: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-construction-icon lucide-construction"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`,
		findProfessionals: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-5 h-5'><path stroke-linecap='round' stroke-linejoin='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' /></svg>`,
		chat: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`,
		contracts: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-5 h-5'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' /></svg>`,
		newRequest: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-5 h-5'><path stroke-linecap='round' stroke-linejoin='round' d='M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>`,
		logout: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-5 h-5'><path stroke-linecap='round' stroke-linejoin='round' d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75' /></svg>`,
		menu: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-6 h-6'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' /></svg>`,
		close: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-6 h-6'><path stroke-linecap='round' stroke-linejoin='round' d='M6 18L18 6M6 6l12 12' /></svg>`,
		help: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-question-mark-icon lucide-circle-question-mark"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
		agent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brain-icon lucide-brain"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg>`
	};

	// More direct computation of navItemsToRender
	let navItemsToRender = $derived(
		$authStore.isAuthenticated && $authStore.user
			? navLinks.filter(
					(link) => link.types.includes('all') || link.types.includes($authStore.user!.userType)
				)
			: []
	);
</script>

<svelte:window onresize={() => (sidebarOpen = window.innerWidth >= 1024)} />

<div class="flex h-screen bg-slate-800 font-sans text-gray-100">
	<!-- Sidebar -->
	<aside
		class:translate-x-0={sidebarOpen}
		class:!-translate-x-full={!sidebarOpen}
		class="fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-slate-900 shadow-lg transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:translate-x-0"
	>
		<div class="flex h-20 shrink-0 items-center justify-center border-b border-slate-700/50 px-4">
			<a href="/home">
				<img src="/images/Gefifi-Logo.png" alt="GEFIFI Logo" class="h-10 w-auto" />
			</a>
		</div>

		<nav class="flex-grow space-y-2 overflow-y-auto p-4">
			{#if currentAuth.isLoading}
				{#each Array(4) as _, id (id)}
					<div class="h-10 animate-pulse rounded-lg bg-slate-700/50"></div>
				{/each}
			{:else if currentAuth.isAuthenticated}
				{#each navItemsToRender as link (link.href)}
					<a
						href={link.href}
						class="group flex items-center space-x-3 rounded-lg px-3 py-2.5 transition-colors duration-150
						{page.url.pathname.startsWith(link.href) && (link.href !== '/home' || page.url.pathname === '/home')
							? 'bg-emerald-600 text-white shadow-md'
							: 'text-slate-300 hover:bg-slate-700/50 hover:text-emerald-300'}"
						onclick={() => {
							if (window.innerWidth < 1024) sidebarOpen = false;
						}}
						title={link.label}
					>
						{@html icons[link.iconKey]}
						<span class="truncate">{link.label}</span>
					</a>
				{/each}
			{:else}
				<p class="px-3 py-2.5 text-sm text-slate-500">Please log in to see navigation.</p>
			{/if}
		</nav>

		<div class="shrink-0 border-t border-slate-700/50 p-4">
			{#if currentAuth.isLoading}
				<!-- Loading Skeleton -->
				<div class="flex animate-pulse items-center">
					<div class="mr-3 h-10 w-10 rounded-full bg-slate-700"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-3/4 rounded bg-slate-700"></div>
						<div class="h-2 w-1/2 rounded bg-slate-700"></div>
					</div>
				</div>
			{:else if currentAuth.isAuthenticated && currentAuth.user}
				<!-- User Info -->
				<a
					href="/profile"
					class="mb-3 flex items-center rounded-lg p-2 transition-colors hover:bg-slate-700/50"
				>
					<img
						src={currentAuth.user.profile?.avatarUrl || '/images/default-avatar.png'}
						alt="User Avatar"
						class="mr-3 h-10 w-10 shrink-0 rounded-full border-2 border-emerald-500 object-cover"
					/>
					<div class="overflow-hidden">
						<p class="truncate text-sm font-semibold text-white">
							{currentAuth.user.profile?.companyName ||
								currentAuth.user.profile?.fullName ||
								'User'}
						</p>
						<p class="truncate text-xs text-slate-400">
							{currentAuth.user.email || currentAuth.user.phoneNumber || ''}
						</p>
						<p class="text-xs text-amber-400 capitalize">{currentAuth.user.userType}</p>
					</div>
				</a>
				<button
					onclick={handleLogout}
					class="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
				>
					{@html icons.logout}
					<span>Logout</span>
				</button>
			{:else}
				<!-- Login Button -->
				<a
					href="/auth/login"
					class="block w-full rounded-lg bg-emerald-500 px-4 py-2 text-center text-white hover:bg-emerald-600"
				>
					Login
				</a>
			{/if}
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<header
			class="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between bg-slate-900 p-4 shadow-md lg:hidden"
		>
			<a href="/home">
				<img src="/images/Gefifi-Logo.png" alt="GEFIFI Logo" class="h-9 w-auto" />
			</a>
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="p-2 text-slate-300 hover:text-emerald-400"
			>
				{@html sidebarOpen ? icons.close : icons.menu}
			</button>
		</header>

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
					<span class="ml-3 text-slate-300">Loading application...</span>
				</div>
			{:else if currentAuth.isAuthenticated}
				{@render children?.()}
			{:else}
				<div class="flex h-full flex-col items-center justify-center text-center">
					<h2 class="mb-3 text-2xl font-semibold text-sky-300">Access Denied</h2>
					<p class="mb-6 max-w-md text-slate-300">Please log in to access GEFIFI app.</p>
					<a
						href="/auth/login"
						class="rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-emerald-600"
					>
						Go to Login
					</a>
				</div>
			{/if}
		</main>
	</div>
</div>

{#if showAgentFAB}
	<AgentChatFAB />
{/if}

<!-- PWA Install Prompt -->
<PWAInstallPrompt />

<style lang="postcss">
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	::-webkit-scrollbar-track {
		@reference bg-slate-800;
	}
	::-webkit-scrollbar-thumb {
		@reference rounded bg-slate-600;
	}
	::-webkit-scrollbar-thumb:hover {
		@reference bg-emerald-500;
	}
</style>
