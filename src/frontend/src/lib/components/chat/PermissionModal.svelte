<!-- gefifi-2/src/frontend/src/lib/components/chat/PermissionModal.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
	on:click|self={() => dispatch('close')}
	role="dialog"
	aria-modal="true"
	aria-labelledby="permission-modal-title"
>
	<div
		in:fly={{ y: -20, duration: 300 }}
		out:fly={{ y: 20, duration: 300 }}
		class="w-full max-w-md rounded-xl border border-slate-700/80 bg-slate-800 p-6 text-center shadow-2xl"
	>
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
			<svg class="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
				></path>
			</svg>
		</div>

		<h1 id="permission-modal-title" class="mb-2 text-2xl font-bold text-slate-100">
			Allow Microphone Access
		</h1>
		<p class="mb-6 text-slate-300">
			To record voice messages, the app needs access to your microphone. Click the microphone icon
			in your browser's address bar and choose "Allow".
		</p>
		<button
			on:click={() => dispatch('close')}
			class="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
		>
			OK, got it
		</button>
	</div>
</div>
