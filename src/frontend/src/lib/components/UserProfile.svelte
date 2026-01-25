<!-- gefifi-2/src/frontend/src/lib/components/UserProfile.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { API_BASE_URL } from '$lib/config';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	type UserProfileData = {
		id: string;
		email: string;
		userType: 'customer' | 'expert' | 'supplier' | 'admin' | string;
		profile?: {
			fullName?: string;
			companyName?: string;
			avatarUrl?: string;
			location?: string;
		};
	};

	let user: UserProfileData | null = $state(null);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let token: string | null = null;

	const unsubscribe = authStore.subscribe((auth) => {
		token = auth.token;
	});

	async function fetchUser() {
		if (!userId) {
			errorMessage = 'User ID is required.';
			isLoading = false;
			return;
		}
		if (!token) {
			// This can happen on initial load, so we'll wait a moment for the store to update.
			setTimeout(() => {
				if (token) fetchUser();
				else {
					errorMessage = 'Authentication token not available.';
					isLoading = false;
				}
			}, 200);
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: `User not found or error fetching data.` }));
				throw new Error(errorData.message);
			}

			user = await response.json();
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
			console.error(`Failed to fetch profile for user ${userId}:`, err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchUser();
		return () => {
			unsubscribe();
		};
	});
</script>

<div class="user-profile-container">
	{#if isLoading}
		<div class="flex animate-pulse items-center space-x-2">
			<div class="h-10 w-10 rounded-full bg-slate-700"></div>
			<div class="flex-1 space-y-2">
				<div class="h-3 w-3/4 rounded bg-slate-700"></div>
				<div class="h-2 w-1/2 rounded bg-slate-700"></div>
			</div>
		</div>
	{:else if errorMessage}
		<div class="rounded border border-red-500/20 bg-red-900/20 p-2 text-sm text-red-400/80">
			<p class="font-semibold">Error</p>
			<p class="text-xs">{errorMessage}</p>
		</div>
	{:else if user}
		<div class="flex items-center gap-3">
			<!-- <a href={`/user/${user.id}`} class="shrink-0"> -->
			<img
				src={user.profile?.avatarUrl || '/images/default-avatar.png'}
				alt="User Avatar"
				class="h-11 w-11 shrink-0 rounded-full border-2 border-slate-500 object-cover transition-all hover:border-emerald-500"
			/>
			<!-- </a> -->
			<div class="overflow-hidden">
				<!-- <a href={`/user/${user.id}`} class="hover:underline"> -->
				<p class="truncate font-bold text-slate-100">
					{user.profile?.companyName || user.profile?.fullName || 'Unnamed User'}
				</p>
				<!-- </a> -->
				<p class="truncate text-sm text-emerald-400 capitalize">{user.userType}</p>
			</div>
		</div>
	{/if}
</div>
