<!-- gefifi-2/src/frontend/src/lib/components/AttachmentList.svelte -->
<script lang="ts">
	// This interface should ideally match the one in `src/lib/types.ts`
	// For component reusability, we define the expected shape here.
	interface Attachment {
		fileName: string;
		filePath: string; // Public URL to the file in GCS
		fileType: string; // MIME type
		size: number;
	}

	interface Props {
		attachments?: Attachment[];
	}

	let { attachments = [] }: Props = $props();

	/**
	 * Determines an appropriate icon for a file based on its MIME type or name.
	 */
	function getFileIcon(fileType: string, fileName: string): string {
		if (fileType.startsWith('image/')) return '🖼️';
		if (fileType === 'application/pdf') return '📄';
		if (fileType.includes('word')) return '📝';
		if (fileType.includes('excel') || fileType.includes('spreadsheetml')) return '📊';

		// Fallback for file types that might not have a standard MIME type sent by the browser
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	/**
	 * Gets a more detailed file type description for display
	 */
	function getFileTypeDescription(fileType: string, fileName: string): string {
		if (fileType.startsWith('image/')) return 'Image';
		if (fileType === 'application/pdf') return 'PDF Document';
		if (fileType.includes('word')) return 'Word Document';
		if (fileType.includes('excel') || fileType.includes('spreadsheetml'))
			return 'Excel Spreadsheet';

		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (extension === 'dwg') return 'AutoCAD Drawing';
		if (extension === 'dxf') return 'DXF Drawing';
		return 'Document';
	}

	/**
	 * Formats a file size in bytes into a human-readable string.
	 */
	function formatBytes(bytes: number, decimals = 1): string {
		if (!bytes || bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	/**
	 * Checks if a file can be viewed directly in most modern browsers.
	 */
	function isViewable(fileType: string, fileName: string): boolean {
		// Images are viewable
		if (fileType.startsWith('image/')) return true;

		// PDFs are viewable
		if (fileType === 'application/pdf') return true;

		// Some browsers can handle plain text files
		if (fileType.startsWith('text/')) return true;

		// Check by extension for files that might not have correct MIME types
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'txt'].includes(extension)) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if a file should display as a thumbnail image
	 */
	function shouldShowThumbnail(fileType: string, fileName: string): boolean {
		// Show thumbnails for images
		if (fileType.startsWith('image/')) return true;

		// Check by extension for files that might not have correct MIME types
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
			return true;
		}

		return false;
	}

	/**
	 * Gets the appropriate CSS classes for the file type indicator
	 */
	function getFileTypeClasses(fileType: string, fileName: string): string {
		if (fileType.startsWith('image/'))
			return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
		if (fileType === 'application/pdf') return 'bg-red-500/20 text-red-300 border-red-500/30';
		if (fileType.includes('word')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
		if (fileType.includes('excel') || fileType.includes('spreadsheetml'))
			return 'bg-green-500/20 text-green-300 border-green-500/30';

		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['dwg', 'dxf'].includes(extension))
			return 'bg-orange-500/20 text-orange-300 border-orange-500/30';

		return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
	}
</script>

{#if attachments && attachments.length > 0}
	<div class="space-y-4">
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-slate-200">
				Attachments
				<span
					class="ml-2 inline-flex items-center rounded-full bg-slate-600/50 px-2 py-0.5 text-xs font-medium text-slate-300"
				>
					{attachments.length}
				</span>
			</h3>
		</div>

		<div class="grid gap-3">
			{#each attachments as attachment, index (index)}
				{#if isViewable(attachment.fileType, attachment.fileName)}
					<!-- Viewable files - click to view in new tab -->
					<a
						href={attachment.filePath}
						target="_blank"
						rel="noopener noreferrer"
						class="group relative block cursor-pointer overflow-hidden rounded-xl border border-slate-600/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30 p-4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-slate-500/50 hover:from-slate-700/60 hover:to-slate-600/40 hover:shadow-xl"
						aria-label="View {attachment.fileName} in new tab"
					>
						<!-- File Icon and Type Badge -->
						<div class="flex items-start gap-4">
							<div class="shrink-0">
								{#if shouldShowThumbnail(attachment.fileType, attachment.fileName)}
									<!-- Image Thumbnail -->
									<div class="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-slate-600/50">
										<img
											src={attachment.filePath}
											alt={attachment.fileName}
											class="h-full w-full object-cover"
											loading="lazy"
											onerror={(e) => {
												// Fallback to icon if image fails to load
												const img = e.target as HTMLImageElement;
												if (img) {
													img.style.display = 'none';
													const fallback = img.nextElementSibling as HTMLElement;
													if (fallback) {
														fallback.style.display = 'flex';
													}
												}
											}}
										/>
										<!-- Fallback icon (hidden by default) -->
										<div
											class="hidden h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-2xl ring-1 ring-slate-600/50"
										>
											{getFileIcon(attachment.fileType, attachment.fileName)}
										</div>
									</div>
								{:else}
									<!-- Regular File Icon -->
									<div
										class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-2xl ring-1 ring-slate-600/50"
									>
										{getFileIcon(attachment.fileType, attachment.fileName)}
									</div>
								{/if}
							</div>

							<!-- File Details -->
							<div class="min-w-0 flex-1">
								<h4
									class="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-white"
									title={attachment.fileName}
								>
									{attachment.fileName}
								</h4>

								<div class="mt-1 flex items-center gap-3">
									<span
										class={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getFileTypeClasses(attachment.fileType, attachment.fileName)}`}
									>
										{getFileTypeDescription(attachment.fileType, attachment.fileName)}
									</span>
									<span class="text-xs text-slate-400">
										{formatBytes(attachment.size)}
									</span>
								</div>
							</div>
						</div>

						<!-- Subtle hover effect overlay -->
						<div
							class="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-sky-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						></div>
					</a>
				{:else}
					<!-- Non-viewable files - click to download (no new tab) -->
					<a
						href={attachment.filePath}
						download={attachment.fileName}
						class="group relative block cursor-pointer overflow-hidden rounded-xl border border-slate-600/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30 p-4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-slate-500/50 hover:from-slate-700/60 hover:to-slate-600/40 hover:shadow-xl"
						aria-label="Download {attachment.fileName}"
					>
						<!-- File Icon and Type Badge -->
						<div class="flex items-start gap-4">
							<div class="shrink-0">
								<!-- Regular File Icon -->
								<div
									class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-2xl ring-1 ring-slate-600/50"
								>
									{getFileIcon(attachment.fileType, attachment.fileName)}
								</div>
							</div>

							<!-- File Details -->
							<div class="min-w-0 flex-1">
								<h4
									class="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-white"
									title={attachment.fileName}
								>
									{attachment.fileName}
								</h4>

								<div class="mt-1 flex items-center gap-3">
									<span
										class={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getFileTypeClasses(attachment.fileType, attachment.fileName)}`}
									>
										{getFileTypeDescription(attachment.fileType, attachment.fileName)}
									</span>
									<span class="text-xs text-slate-400">
										{formatBytes(attachment.size)}
									</span>
								</div>
							</div>
						</div>

						<!-- Subtle hover effect overlay -->
						<div
							class="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/5 to-blue-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						></div>
					</a>
				{/if}
			{/each}
		</div>
	</div>
{/if}
