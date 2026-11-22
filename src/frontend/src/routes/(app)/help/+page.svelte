<!-- gefifi-2/src/frontend/src/routes/(app)/help/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { helpContentMap, type HelpSection } from '$lib/components/help/HelpContent';
	import HelpSectionComponent from '$lib/components/help/HelpSection.svelte';

	// State
	let currentUser: AuthUser | null = $state(null);
	let searchQuery = $state('');
	let selectedLanguage = $state('en');
	let filteredSections: HelpSection[] = $state([]);
	let isLoading = false;

	// Language support
	const languages = [
		{ code: 'en', name: 'English', nativeName: 'English' },
		{ code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
		{ code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
		{ code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' }
	];

	// Subscribe to auth store
	authStore.subscribe((auth) => {
		currentUser = auth.user;
	});

	// Search functionality
	function searchHelpContent(query: string) {
		const sections =
			helpContentMap[selectedLanguage as keyof typeof helpContentMap]?.sections || [];

		if (!query.trim()) {
			filteredSections = sections.filter((section: HelpSection) =>
				currentUser ? section.userTypes.includes(currentUser.userType) : true
			);
			return;
		}

		const searchTerms = query.toLowerCase().split(' ');
		filteredSections = sections.filter((section: HelpSection) => {
			if (currentUser && !section.userTypes.includes(currentUser.userType)) {
				return false;
			}

			const searchableText = `${section.title} ${section.content}`.toLowerCase();
			return searchTerms.every((term) => searchableText.includes(term));
		});
	}

	// Expand/collapse sections
	function toggleSection(sectionId: string) {
		const section = filteredSections.find((s) => s.id === sectionId);
		if (section) {
			section.expanded = !section.expanded;
			filteredSections = [...filteredSections];
		}
	}

	// Feedback functions
	function handleFeedback(detail: { sectionId: string; helpful: boolean }) {
		const { sectionId, helpful } = detail;

		// Show confirmation
		const button = document.querySelector(`[data-feedback="${sectionId}"]`);
		if (button) {
			button.textContent = helpful ? '✓ Helpful' : '✓ Not Helpful';
			setTimeout(() => {
				button.textContent = 'Was this helpful?';
			}, 2000);
		}
	}

	// Initialize on mount
	onMount(() => {
		// Initialize with empty search to show all sections
		searchHelpContent('');
	});

	// User type display
	function getUserTypeDisplay(userType: string) {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}
</script>

<svelte:head>
	<title>Help & Support - GEFIFI</title>
	<meta name="description" content="Comprehensive help guide for GEFIFI construction platform" />
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<header class="text-center">
		<div class="mb-4 flex justify-center">
			<div class="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 p-4">
				<svg
					class="h-12 w-12 text-emerald-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
		</div>
		<h1 class="text-4xl font-bold text-emerald-400">Help & Support</h1>
		<p class="mt-3 text-xl text-slate-300">Everything you need to know about using GEFIFI</p>
		{#if currentUser}
			<div class="mt-4 flex justify-center">
				<span
					class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium {getUserTypeDisplay(
						currentUser.userType
					).bgColor} {getUserTypeDisplay(currentUser.userType).color}"
				>
					<div class="h-2 w-2 rounded-full bg-current"></div>
					{getUserTypeDisplay(currentUser.userType).label} Guide
				</span>
			</div>
		{/if}
	</header>

	<!-- Language Selector & Search -->
	<div class="mx-auto max-w-2xl space-y-4">
		<!-- Language Selector -->
		<div class="flex justify-center">
			<div class="flex rounded-lg bg-slate-700/50 p-1">
				{#each languages as language (language.name)}
					<button
						onclick={() => {
							selectedLanguage = language.code;
							searchHelpContent(searchQuery);
						}}
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {selectedLanguage ===
						language.code
							? 'bg-emerald-500 text-white'
							: 'text-slate-300 hover:bg-slate-600/50 hover:text-white'}"
					>
						{language.nativeName}
					</button>
				{/each}
			</div>
		</div>

		<!-- Search Bar -->
		<div class="relative">
			<div class="absolute inset-y-0 left-0 flex items-center pl-3">
				<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				oninput={(event) => searchHelpContent((event.currentTarget as HTMLInputElement).value)}
				placeholder="Search help topics..."
				class="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-4 pr-4 pl-10 text-white placeholder-slate-400 backdrop-blur-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
			/>
		</div>
	</div>

	<!-- Quick Actions for User Type -->
	{#if currentUser}
		<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if currentUser.userType === 'customer'}
				<a
					href="/customer/create-request"
					class="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-6 w-6 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-emerald-300">Create Request</h3>
							<p class="text-sm text-slate-400">Post a new work or material request</p>
						</div>
					</div>
				</a>
				<a
					href="/find-professionals"
					class="group rounded-xl border border-sky-500/30 bg-sky-500/10 p-6 transition-all hover:border-sky-500/50 hover:bg-sky-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-sky-500/20 p-2">
							<svg
								class="h-6 w-6 text-sky-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-sky-300">Find Professionals</h3>
							<p class="text-sm text-slate-400">Browse experts and suppliers</p>
						</div>
					</div>
				</a>
			{:else if currentUser.userType === 'expert'}
				<a
					href="/home"
					class="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-6 w-6 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2M8 6V4m0 2v2a2 2 0 002 2m8-4a2 2 0 012 2v2"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-emerald-300">Browse Work Requests</h3>
							<p class="text-sm text-slate-400">Find projects matching your expertise</p>
						</div>
					</div>
				</a>
			{:else if currentUser.userType === 'supplier'}
				<a
					href="/home"
					class="group rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-purple-500/20 p-2">
							<svg
								class="h-6 w-6 text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-purple-300">Browse Material Requests</h3>
							<p class="text-sm text-slate-400">Find supply opportunities</p>
						</div>
					</div>
				</a>
			{/if}
			<a
				href="/chat"
				class="group rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 transition-all hover:border-amber-500/50 hover:bg-amber-500/20"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-amber-500/20 p-2">
						<svg
							class="h-6 w-6 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-amber-300">My Chats</h3>
						<p class="text-sm text-slate-400">View conversations</p>
					</div>
				</div>
			</a>
		</section>
	{/if}

	<!-- Help Sections -->
	<main class="space-y-6">
		{#if isLoading}
			<div class="flex h-32 items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
				></div>
				<span class="ml-3 text-slate-300">Loading help content...</span>
			</div>
		{:else if filteredSections.length === 0}
			<div class="rounded-xl border border-slate-600/30 bg-slate-800/40 p-8 text-center">
				<svg
					class="mx-auto h-12 w-12 text-slate-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-semibold text-slate-300">No help topics found</h3>
				<p class="mt-2 text-slate-400">Try adjusting your search terms or browse all topics.</p>
				<button
					onclick={() => {
						searchQuery = '';
					}}
					class="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
				>
					Show All Topics
				</button>
			</div>
		{:else}
			{#each filteredSections as section (section.id)}
				<HelpSectionComponent
					{section}
					onToggle={(id) => toggleSection(id)}
					onFeedback={(detail) => handleFeedback(detail)}
				/>
			{/each}
		{/if}
	</main>

	<!-- Contact Support Section -->
	<section
		id="contact-support"
		class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center"
	>
		<div class="mx-auto max-w-md">
			<div class="mb-4 flex justify-center">
				<div class="rounded-2xl bg-amber-500/20 p-3">
					<svg class="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>
			<h2 class="text-2xl font-bold text-amber-300">Still Need Help?</h2>
			<p class="mt-3 text-amber-200/80">
				Can't find what you're looking for? Our support team is here to help you.
			</p>
			<div class="mt-6 space-y-3">
				<a
					href="mailto:support@gefifi.com?subject=GEFIFI%20support"
					class="flex w-full items-center justify-center gap-3 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
					Email Support
				</a>
				<p class="text-sm text-amber-200/60">Response time: Usually within 2-4 hours</p>
			</div>
		</div>
	</section>
</div>
