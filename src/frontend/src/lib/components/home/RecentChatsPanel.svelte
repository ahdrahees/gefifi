<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';

	export let recentChats: Array<{
		id: string;
		displayName?: string;
		updatedAt: string;
		avatarUrl?: string;
		lastMessageSnippet?: string;
		otherUserProfile?: {
			id: string;
			email: string;
			userType: string;
			profile?: {
				fullName?: string;
				companyName?: string;
				expertise?: string;
				category?: string;
				location?: string;
				avatarUrl?: string;
			};
		};
	}> = [];

	function formatLastSeen(dateString: string) {
		if (!dateString) return '';
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function getUserTypeDisplay(userType: string): { label: string; color: string; bgColor: string } {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			case 'admin':
				return { label: 'Admin', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}
</script>

<section class="flex flex-1 flex-col rounded-lg bg-slate-700/40 p-5 shadow-md">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-sky-400">Recent Chats ({recentChats.length})</h2>
		<a href="/chat" class="text-sm text-emerald-400 underline hover:text-emerald-300"
			>Open chat inbox</a
		>
	</div>

	{#if recentChats && recentChats.length > 0}
		<div
			class="scrollable-content flex-1 space-y-2 overflow-y-auto pr-1"
			style="max-height: 22rem;"
		>
			{#each recentChats.slice(0, 5) as chat (chat.id)}
				<a
					href={`/chat/${chat.id}`}
					class="group block rounded-xl border border-slate-600/40 bg-slate-700/40 p-3 transition-all hover:bg-slate-600/40"
					title={`Chat with ${chat.displayName || 'user'}`}
				>
					<div class="flex items-center gap-3">
						<Avatar url={chat.avatarUrl} size="sm" name={chat.displayName} />
						<div class="min-w-0 flex-1">
							<div class="mb-0.5 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<p class="truncate font-medium text-emerald-300 group-hover:text-emerald-200">
										{chat.displayName || 'Unknown User'}
									</p>
									{#if chat.otherUserProfile}
										{@const info = getUserTypeDisplay(chat.otherUserProfile.userType)}
										<span
											class="hidden items-center rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex {info.color} {info.bgColor}"
										>
											{info.label}
										</span>
									{/if}
								</div>
								<span class="flex-shrink-0 text-xs text-slate-500"
									>{formatLastSeen(chat.updatedAt)}</span
								>
							</div>

							{#if chat.otherUserProfile?.profile}
								<div class="mb-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
									{#if chat.otherUserProfile.userType === 'expert' && chat.otherUserProfile.profile.expertise}
										<span class="truncate">{chat.otherUserProfile.profile.expertise}</span>
									{:else if chat.otherUserProfile.userType === 'supplier' && chat.otherUserProfile.profile.category}
										<span class="truncate">{chat.otherUserProfile.profile.category}</span>
									{/if}
									{#if chat.otherUserProfile.profile.location}
										<span class="truncate">{chat.otherUserProfile.profile.location}</span>
									{/if}
								</div>
							{/if}
							<p class="line-clamp-1 text-xs text-slate-400">{chat.lastMessageSnippet}</p>
						</div>
					</div>
				</a>
			{/each}

			{#if recentChats.length > 5}
				<!-- Allow scrolling for additional items -->
				{#each recentChats.slice(5) as chat (chat.id)}
					<a
						href={`/chat/${chat.id}`}
						class="group block rounded-xl border border-slate-600/40 bg-slate-700/40 p-3 transition-all hover:bg-slate-600/40"
						title={`Chat with ${chat.displayName || 'user'}`}
					>
						<div class="flex items-center gap-3">
							<Avatar url={chat.avatarUrl} size="sm" name={chat.displayName} />
							<div class="min-w-0 flex-1">
								<div class="mb-0.5 flex items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<p class="truncate font-medium text-emerald-300 group-hover:text-emerald-200">
											{chat.displayName || 'Unknown User'}
										</p>
										{#if chat.otherUserProfile}
											{@const info2 = getUserTypeDisplay(chat.otherUserProfile.userType)}
											<span
												class="hidden items-center rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex {info2.color} {info2.bgColor}"
											>
												{info2.label}
											</span>
										{/if}
									</div>
									<span class="flex-shrink-0 text-xs text-slate-500"
										>{formatLastSeen(chat.updatedAt)}</span
									>
								</div>
								<p class="line-clamp-1 text-xs text-slate-400">{chat.lastMessageSnippet}</p>
							</div>
						</div>
					</a>
				{/each}
			{/if}
		</div>
	{:else}
		<p class="text-slate-400">No recent chats to display.</p>
	{/if}
</section>

<style>
	/* Beautiful custom scrollbar matching your dark theme */
	.scrollable-content::-webkit-scrollbar {
		width: 8px;
		height: 8px;
		background-color: transparent;
	}
	.scrollable-content::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.6); /* slate-800/60 */
		border-radius: 9999px;
		margin: 4px;
	}
	.scrollable-content::-webkit-scrollbar-thumb {
		background: linear-gradient(
			135deg,
			rgba(16, 185, 129, 0.6),
			rgba(5, 150, 105, 0.8)
		); /* emerald gradient */
		border-radius: 9999px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		transition: all 0.2s ease;
	}
	.scrollable-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 1));
		border-color: rgba(16, 185, 129, 0.4);
		transform: scale(1.1);
	}
	.scrollable-content::-webkit-scrollbar-corner {
		background: transparent;
	}
	/* Firefox */
	.scrollable-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(16, 185, 129, 0.6) rgba(30, 41, 59, 0.6);
		color-scheme: dark;
	}
</style>
