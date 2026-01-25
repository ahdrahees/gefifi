<script lang="ts">
	interface Props {
		attachment: {
			fileName: string;
			filePath: string;
			size: number;
		};
		onView?: (detail: { filePath: string; fileName: string }) => void;
	}

	let { attachment, onView }: Props = $props();

	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function formatBytes(bytes: number, decimals = 1): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	function isViewableFile(fileName: string): boolean {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(extension);
	}

	function handleView() {
		onView?.({ filePath: attachment.filePath, fileName: attachment.fileName });
	}
</script>

<div
	class="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-lg"
>
	<!-- Icon -->
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50 text-xl transition-transform group-hover:scale-105"
	>
		{getFileIcon(attachment.fileName)}
	</div>

	<!-- Info -->
	<div class="min-w-0 flex-1 flex-col justify-center">
		<h4 class="truncate text-sm font-medium text-slate-200" title={attachment.fileName}>
			{attachment.fileName}
		</h4>
		<div class="flex items-center gap-2 text-xs text-slate-400">
			<span>{formatBytes(attachment.size)}</span>
			<!-- Optional: Add type badge if needed, but keeping it minimal as requested -->
		</div>
	</div>

	<!-- Action -->
	<div class="shrink-0">
		{#if isViewableFile(attachment.fileName)}
			<button
				onclick={handleView}
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-500 hover:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
				aria-label="View file"
				title="View"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					/>
				</svg>
			</button>
		{:else}
			<a
				href={attachment.filePath}
				download={attachment.fileName}
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-all hover:bg-sky-500 hover:text-white focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
				aria-label="Download file"
				title="Download"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
			</a>
		{/if}
	</div>
</div>
