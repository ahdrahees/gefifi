<!-- gefifi-2/src/frontend/src/lib/components/chat/DateSeparator.svelte -->
<script lang="ts">
	interface Props {
		timestamp: string;
	}

	let { timestamp }: Props = $props();

	const formatDateSeparator = (ts: string): string => {
		const date = new Date(ts);
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		}
		if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		}
		// Check if it was this year. If not, show the year.
		if (date.getFullYear() === today.getFullYear()) {
			return date.toLocaleDateString([], {
				month: 'long',
				day: 'numeric'
			});
		}
		return date.toLocaleDateString([], {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	};
</script>

<div class="flex justify-center py-2">
	<span
		class="rounded-full bg-slate-700/80 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur-sm"
	>
		{formatDateSeparator(timestamp)}
	</span>
</div>
