<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	interface Props {
		isSidebarOpen: boolean;
		onToggleSidebar: () => void;
	}

	let { isSidebarOpen, onToggleSidebar }: Props = $props();

	let isNewChatPage = $derived(page.url.pathname === '/agent');

	async function handleNewChat() {
		if (!isNewChatPage) {
			await goto('/agent');
		}
	}
</script>

<div class="fixed top-20 right-4 z-50">
	<div
		class="flex items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-900/60 p-1 shadow-2xl backdrop-blur-xl"
	>
		<!-- Plus Button (New Chat) -->
		<button
			onclick={handleNewChat}
			disabled={isNewChatPage}
			class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 {isNewChatPage
				? 'cursor-not-allowed text-slate-600 opacity-40'
				: 'hover:bg-white/15 hover:text-white'}"
			aria-label="New Chat"
			title="New Chat"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
		</button>

		<!-- Divider -->
		<div class="h-4 w-px bg-slate-700/50"></div>

		<!-- Sidebar Toggle Button -->
		<button
			onclick={onToggleSidebar}
			class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/15 hover:text-white"
			aria-label="Toggle Sessions Sidebar"
			title="History"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="M15 3v18" />
				<path d="m10 15-3-3 3-3" />
			</svg>
		</button>
	</div>
</div>
