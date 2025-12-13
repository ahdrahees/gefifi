<script lang="ts">
	/** The error message to display. Bind this to clear from child. */
	export let message: string = '';

	function dismiss() {
		message = '';
	}
</script>

{#if message}
	<div
		class="absolute top-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-xl backdrop-blur-md transition-all"
		role="alert"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-5 w-5 shrink-0 text-red-400"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fill-rule="evenodd"
				d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
				clip-rule="evenodd"
			/>
		</svg>
		<span class="flex-1 font-medium">{message}</span>
		<button
			class="rounded-lg p-1 hover:bg-red-500/20 active:bg-red-500/30"
			on:click={dismiss}
			aria-label="Dismiss error"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>
{/if}
