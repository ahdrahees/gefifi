<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import apiClient from '$lib/api';
	import Avatar from '$lib/components/Avatar.svelte';

	let currentUser = $state<AuthUser | null>(null);
	let token: string | null = null;
	let isLoading = $state(true);
	let isEditing = $state(false);
	let isSaving = $state(false);
	let saveMessage = $state('');

	// Form data for editing
	let profileData = $state({
		// Common fields
		fullName: '',
		phoneNumber: '',
		location: '',
		// Expert fields
		expertise: '',
		experience: '',
		// Supplier fields
		companyName: '',
		category: ''
		// Note: avatar is only added when user actually selects a new file
	});

	// Avatar preview
	let avatarPreview: string | null = $state(null);

	authStore.subscribe((auth) => {
		currentUser = auth.user;
		token = auth.token;
	});

	onMount(async () => {
		if (currentUser) {
			await loadUserProfile();
		}
		isLoading = false;
	});

	async function loadUserProfile() {
		if (!currentUser || !token) return;

		try {
			const response = await fetch('/api/users/me/profile', {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const userData = await response.json();
				// Pre-fill form data
				profileData = {
					fullName: userData.profile?.fullName || '',
					phoneNumber: userData.profile?.phoneNumber || '',
					location: userData.profile?.location || '',
					expertise: userData.profile?.expertise || '',
					experience: userData.profile?.experience || '',
					companyName: userData.profile?.companyName || '',
					category: userData.profile?.category || ''
				};
			}
		} catch (error) {
			console.error('Error loading user profile:', error);
		}
	}

	async function handleSave() {
		if (!currentUser || !token) return;

		isSaving = true;
		saveMessage = '';

		try {
			// Create a clean copy of profile data without avatar if no new file was selected
			const dataToSend = { ...profileData };

			// Only include avatar if user actually selected a new file
			if (!(dataToSend as any).avatar || !((dataToSend as any).avatar instanceof File)) {
				delete (dataToSend as any).avatar;
			}

			// Only include fields that have actually changed
			const originalData = {
				fullName: currentUser.profile?.fullName || '',
				phoneNumber: currentUser.profile?.phoneNumber || '',
				location: currentUser.profile?.location || '',
				expertise: currentUser.profile?.expertise || '',
				experience: currentUser.profile?.experience || '',
				companyName: currentUser.profile?.companyName || '',
				category: currentUser.profile?.category || ''
			};

			// Remove unchanged fields to avoid unnecessary updates
			Object.keys(dataToSend).forEach((key) => {
				if (
					dataToSend[key as keyof typeof dataToSend] ===
					originalData[key as keyof typeof originalData]
				) {
					delete dataToSend[key as keyof typeof dataToSend];
				}
			});

			// Only proceed if there are actual changes or a new avatar
			if (Object.keys(dataToSend).length === 0 && !(dataToSend as any).avatar) {
				saveMessage = 'No changes to save.';
				isSaving = false;
				return;
			}

			const { user: updatedUser } = await apiClient.updateUserProfile(dataToSend);

			// Update the auth store with the new user data
			authStore.update((state) => ({
				...state,
				user: updatedUser
			}));

			saveMessage = 'Profile updated successfully!';
			isEditing = false;
			avatarPreview = null; // Clear preview

			// Clear success message after 3 seconds
			setTimeout(() => {
				saveMessage = '';
			}, 3000);
		} catch (error: unknown) {
			console.error('Profile update error:', error);
			saveMessage = error instanceof Error ? error.message : 'Failed to update profile.';
		} finally {
			isSaving = false;
		}
	}

	function handleAvatarChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file type
			const allowedTypes = [
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/gif',
				'image/webp',
				'image/svg+xml'
			];
			if (!allowedTypes.includes(file.type)) {
				saveMessage = 'Please select a valid image file (JPG, PNG, GIF, WebP, SVG).';
				return;
			}

			// Validate file size (2MB)
			if (file.size > 2 * 1024 * 1024) {
				saveMessage = 'File size must be less than 2MB.';
				return;
			}

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);

			// Add avatar to profile data only when user selects a new file
			(profileData as any).avatar = file;
			saveMessage = ''; // Clear any previous errors
		}
	}

	function startEditing() {
		// Pre-fill form data with current user data
		profileData = {
			fullName: currentUser?.profile?.fullName || '',
			phoneNumber: currentUser?.profile?.phoneNumber || '',
			location: currentUser?.profile?.location || '',
			expertise: currentUser?.profile?.expertise || '',
			experience: currentUser?.profile?.experience || '',
			companyName: currentUser?.profile?.companyName || '',
			category: currentUser?.profile?.category || ''
		};

		isEditing = true;
		saveMessage = '';
	}

	function cancelEditing() {
		isEditing = false;
		saveMessage = '';
		avatarPreview = null;
		// Clear any avatar that might have been added
		if ((profileData as any).avatar) {
			delete (profileData as any).avatar;
		}
		// Reset form data to original values
		profileData = {
			fullName: '',
			phoneNumber: '',
			location: '',
			expertise: '',
			experience: '',
			companyName: '',
			category: ''
		};
	}

	function getDisplayName() {
		if (currentUser?.userType === 'supplier') {
			return currentUser?.profile?.companyName || currentUser?.email?.split('@')[0];
		}
		return currentUser?.profile?.fullName || currentUser?.email?.split('@')[0];
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

{#if isLoading}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
			></div>
			<p class="text-slate-400">Loading profile...</p>
		</div>
	</div>
{:else if currentUser}
	<div class="min-h-screen bg-slate-900 p-6">
		<!-- Header with Edit Button -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-white">Profile</h1>
				<p class="text-slate-400">Manage your account information</p>
			</div>
			{#if !isEditing}
				<button
					onclick={startEditing}
					class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
					Edit Profile
				</button>
			{:else}
				<div class="flex gap-3">
					<button
						onclick={cancelEditing}
						class="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800"
					>
						Cancel
					</button>
					<button
						onclick={handleSave}
						disabled={isSaving}
						class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
					>
						{#if isSaving}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
							Saving...
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Save Changes
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- Success/Error Message -->
		{#if saveMessage}
			<div
				class="mb-6 rounded-lg p-4 {saveMessage.includes('successfully')
					? 'bg-emerald-900/50 text-emerald-300'
					: 'bg-red-900/50 text-red-300'}"
			>
				{saveMessage}
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Main Profile Section -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Profile Overview Card -->
				<div
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="flex items-start gap-4">
						<!-- Avatar Section -->
						<div class="relative">
							{#if isEditing}
								<!-- Edit Mode: Avatar with Upload Overlay -->
								<div class="relative">
									<Avatar
										url={avatarPreview || currentUser.profile?.avatarUrl}
										name={getDisplayName()}
										size="xl"
									/>
									<!-- Upload Overlay -->
									<label
										for="avatar-upload"
										class="absolute inset-0 m-0.5 flex w-16 cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
									>
										<svg
											class="h-8 w-8 text-white"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									</label>
									<input
										id="avatar-upload"
										type="file"
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
										class="hidden"
										onchange={handleAvatarChange}
									/>
								</div>
								<p class="mt-2 text-center text-xs text-slate-400">Click to upload new picture</p>
							{:else}
								<!-- Display Mode: Static Avatar -->
								<Avatar url={currentUser.profile?.avatarUrl} name={getDisplayName()} size="xl" />
							{/if}
						</div>

						<!-- User Info -->
						<div class="flex-1">
							<h2 class="text-2xl font-bold text-white">{getDisplayName()}</h2>
							<p class="text-slate-400">{currentUser.email || currentUser.phoneNumber || 'Not provided'}</p>
							<div class="mt-3 flex flex-wrap gap-2">
								<span
									class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 uppercase"
								>
									{currentUser.userType}
								</span>
								<span class="rounded-full bg-slate-600/50 px-3 py-1 text-xs text-slate-300">
									Member since {formatDate(currentUser.createdAt)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Profile Information Card -->
				<div
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-blue-500/20 p-2">
							<svg
								class="h-5 w-5 text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-blue-300">Personal Information</h3>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<!-- Display Name -->
						<div>
							<label for="fullName" class="block text-sm font-medium text-slate-400"
								>Display Name</label
							>
							{#if isEditing}
								<input
									id="fullName"
									type="text"
									bind:value={profileData.fullName}
									class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
									placeholder="Enter your full name"
								/>
							{:else}
								<p class="mt-1 text-white">{currentUser.profile?.fullName || 'Not set'}</p>
							{/if}
						</div>

						<!-- Phone Number -->
						<div>
							<label for="phoneNumber" class="block text-sm font-medium text-slate-400"
								>Phone Number</label
							>
							{#if isEditing}
								<input
									id="phoneNumber"
									type="tel"
									bind:value={profileData.phoneNumber}
									class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
									placeholder="Enter your phone number"
								/>
							{:else}
								<p class="mt-1 text-white">{currentUser.profile?.phoneNumber || 'Not set'}</p>
							{/if}
						</div>

						<!-- Location -->
						<div>
							<label for="location" class="block text-sm font-medium text-slate-400">Location</label
							>
							{#if isEditing}
								<input
									id="location"
									type="text"
									bind:value={profileData.location}
									class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
									placeholder="Enter your location"
								/>
							{:else}
								<p class="mt-1 text-white">{currentUser.profile?.location || 'Not set'}</p>
							{/if}
						</div>

						<!-- User Type Specific Fields -->
						{#if currentUser.userType === 'expert'}
							<div>
								<label for="expertise" class="block text-sm font-medium text-slate-400"
									>Expertise</label
								>
								{#if isEditing}
									<input
										id="expertise"
										type="text"
										bind:value={profileData.expertise}
										class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
										placeholder="Enter your expertise"
									/>
								{:else}
									<p class="mt-1 text-white">{currentUser.profile?.expertise || 'Not set'}</p>
								{/if}
							</div>
							<div>
								<label for="experience" class="block text-sm font-medium text-slate-400"
									>Experience</label
								>
								{#if isEditing}
									<input
										id="experience"
										type="text"
										bind:value={profileData.experience}
										class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
										placeholder="Enter your experience"
									/>
								{:else}
									<p class="mt-1 text-white">{currentUser.profile?.experience || 'Not set'}</p>
								{/if}
							</div>
						{:else if currentUser.userType === 'supplier'}
							<div>
								<label for="companyName" class="block text-sm font-medium text-slate-400"
									>Company Name</label
								>
								{#if isEditing}
									<input
										id="companyName"
										type="text"
										bind:value={profileData.companyName}
										class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
										placeholder="Enter your company name"
									/>
								{:else}
									<p class="mt-1 text-white">{currentUser.profile?.companyName || 'Not set'}</p>
								{/if}
							</div>
							<div>
								<label for="category" class="block text-sm font-medium text-slate-400"
									>Category</label
								>
								{#if isEditing}
									<input
										id="category"
										type="text"
										bind:value={profileData.category}
										class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
										placeholder="Enter your category"
									/>
								{:else}
									<p class="mt-1 text-white">{currentUser.profile?.category || 'Not set'}</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Account Information Card -->
				<div
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-amber-500/20 p-2">
							<svg
								class="h-5 w-5 text-amber-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-amber-300">Account Details</h3>
					</div>

					<div class="space-y-3">
						<div>
							<label class="block text-sm font-medium text-slate-400">User ID</label>
							<p class="mt-1 font-mono text-xs text-slate-300">{currentUser.id}</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-400">Last Updated</label>
							<p class="mt-1 text-white">{formatDate(currentUser.updatedAt)}</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-400">Status</label>
							<span
								class="mt-1 inline-flex rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300"
							>
								Active
							</span>
						</div>
					</div>
				</div>

				<!-- Quick Actions Card -->
				<div
					class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-5 w-5 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-bold text-emerald-300">Quick Actions</h3>
					</div>

					<div class="space-y-3">
						<a
							href="/home"
							class="flex items-center gap-3 rounded-lg bg-slate-700/50 p-3 text-white transition-colors hover:bg-slate-600/50"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
							Back to Home
						</a>
						{#if currentUser.userType === 'customer'}
							<a
								href="/customer/create-request"
								class="flex items-center gap-3 rounded-lg bg-slate-700/50 p-3 text-white transition-colors hover:bg-slate-600/50"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								Create New Request
							</a>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<p class="text-slate-400">Please log in to view your profile.</p>
		</div>
	</div>
{/if}
