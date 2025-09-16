<!-- gefifi-2/src/frontend/src/lib/components/FileUpload.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { writable } from 'svelte/store';

	export let acceptedFileTypes: string[] = [
		'image/jpeg',
		'image/png',
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'.dwg',
		'.dxf'
	];
	export let maxFileSize: number = 30 * 1024 * 1024; // 30MB
	export let multiple: boolean = true;
	export let files: Writable<File[]>;

	// New props for existing attachments
	export let existingAttachments: Array<{
		fileName: string;
		filePath: string;
		fileType: string;
		size: number;
	}> = [];
	export let removedExistingAttachments: Writable<string[]> = writable([]);

	const dispatch = createEventDispatcher();

	let dragOver = false;
	let errors: string[] = [];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			addFiles(Array.from(target.files));
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (event.dataTransfer?.files) {
			addFiles(Array.from(event.dataTransfer.files));
		}
	}

	function addFiles(newFiles: File[]) {
		errors = [];
		const validFiles: File[] = [];

		for (const file of newFiles) {
			if (!validateFileType(file)) {
				errors.push(`Invalid file type: ${file.name}.`);
				continue;
			}
			if (file.size > maxFileSize) {
				errors.push(`File too large: ${file.name}. Max size is ${maxFileSize / 1024 / 1024}MB.`);
				continue;
			}
			validFiles.push(file);
		}

		if (multiple) {
			$files = [...$files, ...validFiles];
		} else {
			$files = validFiles.slice(0, 1);
		}

		dispatch('filesChanged', $files);
	}

	function removeFile(index: number) {
		$files = $files.filter((_, i) => i !== index);
		dispatch('filesChanged', $files);
	}

	function removeExistingAttachment(fileName: string) {
		$removedExistingAttachments = [...$removedExistingAttachments, fileName];
		dispatch('existingAttachmentsChanged', $removedExistingAttachments);
	}

	function restoreExistingAttachment(fileName: string) {
		$removedExistingAttachments = $removedExistingAttachments.filter((name) => name !== fileName);
		dispatch('existingAttachmentsChanged', $removedExistingAttachments);
	}

	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	/**
	 * Gets a more detailed file type description for display
	 */
	function getFileTypeDescription(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'Image';
		if (extension === 'pdf') return 'PDF Document';
		if (['doc', 'docx'].includes(extension)) return 'Word Document';
		if (['xls', 'xlsx'].includes(extension)) return 'Excel Spreadsheet';
		if (extension === 'dwg') return 'AutoCAD Drawing';
		if (extension === 'dxf') return 'DXF Drawing';
		return 'Document';
	}

	/**
	 * Gets color classes for file type badges (matches AttachmentList.svelte)
	 */
	function getFileTypeClasses(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
			return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
		}
		if (extension === 'pdf') return 'bg-red-500/20 text-red-300 border-red-500/30';
		if (['doc', 'docx'].includes(extension))
			return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
		if (['xls', 'xlsx'].includes(extension))
			return 'bg-green-500/20 text-green-300 border-green-500/30';
		if (['dwg', 'dxf'].includes(extension))
			return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
		return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
	}

	/**
	 * Checks if a file should display as a thumbnail image
	 */
	function shouldShowThumbnail(file: File | { fileName: string; fileType: string }): boolean {
		// Show thumbnails for images
		if ('type' in file && file.type.startsWith('image/')) return true;
		if ('fileType' in file && file.fileType.startsWith('image/')) return true;

		// Check by extension for files that might not have correct MIME types
		const fileName = 'name' in file ? file.name : file.fileName;
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
			return true;
		}

		return false;
	}

	/**
	 * Creates a URL for file preview
	 */
	function createFilePreviewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	function formatBytes(bytes: number, decimals = 1): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	function validateFileType(file: File): boolean {
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		// Check both MIME type and file extension for robustness
		return acceptedFileTypes.some((type) => {
			if (type.startsWith('.')) {
				return fileExtension === type;
			}
			return file.type === type;
		});
	}

	// Computed values for display
	$: activeExistingAttachments = existingAttachments.filter(
		(att) => !$removedExistingAttachments.includes(att.fileName)
	);
	$: totalFiles = $files?.length + activeExistingAttachments.length;
</script>

<div class="space-y-4">
	<div
		role="button"
		tabindex="0"
		class="relative rounded-lg border-2 border-dashed border-slate-500 bg-slate-800/50 p-6 text-center transition-all duration-200"
		class:border-emerald-500={dragOver}
		class:bg-slate-700={dragOver}
		on:dragover|preventDefault={() => (dragOver = true)}
		on:dragleave|preventDefault={() => (dragOver = false)}
		on:drop|preventDefault={handleDrop}
		on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				document.getElementById('file-upload')?.click();
			}
		}}
	>
		<label for="file-upload" class="cursor-pointer">
			<div class="flex flex-col items-center justify-center space-y-2 text-slate-400">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-10 w-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
				<p class="text-lg font-semibold">
					Drag & drop files here or <span class="text-emerald-400">browse</span>
				</p>
				<p class="text-sm">Supports: Images, PDF, Word, Excel, DWG, DXF (Max 30MB)</p>
			</div>
			<input
				id="file-upload"
				name="attachments"
				type="file"
				class="hidden"
				{multiple}
				accept={acceptedFileTypes.join(',')}
				on:change={handleFileSelect}
			/>
		</label>
	</div>

	{#if errors.length > 0}
		<div class="rounded-md border border-red-500/50 bg-red-500/10 p-3">
			{#each errors as error, index (index)}
				<p class="text-sm text-red-400">{error}</p>
			{/each}
		</div>
	{/if}

	{#if totalFiles > 0}
		<div class="space-y-4">
			<!-- Header with icon and count -->
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-slate-100">Contract Documents</h3>
				</div>
				<span class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300">
					{totalFiles}
				</span>
			</div>

			<!-- Existing Attachments Section -->
			{#if activeExistingAttachments.length > 0}
				<div class="space-y-3">
					<h4 class="text-sm font-medium text-slate-300">Existing Attachments</h4>
					<div class="grid gap-3">
						{#each activeExistingAttachments as attachment, i (i)}
							<div
								class="group relative overflow-hidden rounded-xl border border-slate-600/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30 p-4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-500/50 hover:from-slate-700/60 hover:to-slate-600/40 hover:shadow-xl"
							>
								<!-- File Icon and Type Badge -->
								<div class="flex items-center gap-4">
									<div class="flex-shrink-0">
										{#if shouldShowThumbnail(attachment)}
											<!-- Image Thumbnail -->
											<div class="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-slate-600/50">
												<img
													src={attachment.filePath}
													alt={attachment.fileName}
													class="h-full w-full object-cover"
													loading="lazy"
													on:error={(e) => {
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
													{getFileIcon(attachment.fileName)}
												</div>
											</div>
										{:else}
											<!-- Regular File Icon -->
											<div
												class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-2xl ring-1 ring-slate-600/50"
											>
												{getFileIcon(attachment.fileName)}
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
												class={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getFileTypeClasses(attachment.fileName)}`}
											>
												{getFileTypeDescription(attachment.fileName)}
											</span>
											<span class="text-xs text-slate-400">
												{formatBytes(attachment.size)}
											</span>
											<span class="text-xs text-blue-400">Existing</span>
										</div>
									</div>

									<!-- Remove Button - Centered -->
									<button
										aria-label="Remove existing attachment"
										type="button"
										on:click={() => removeExistingAttachment(attachment.fileName)}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/10 text-red-400 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-red-600/20 hover:text-red-300 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
										title="Remove existing attachment"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>

								<!-- Subtle hover effect overlay -->
								<div
									class="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-sky-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								></div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Removed Existing Attachments Section -->
			{#if $removedExistingAttachments.length > 0}
				<div class="space-y-3">
					<h4 class="text-sm font-medium text-slate-400">Removed Attachments</h4>
					<div class="grid gap-2">
						{#each $removedExistingAttachments as fileName}
							<div
								class="flex items-center justify-between rounded-lg border border-slate-600/30 bg-slate-800/20 p-3"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-lg"
									>
										{getFileIcon(fileName)}
									</div>
									<span class="text-sm text-slate-400">{fileName}</span>
								</div>
								<button
									aria-label="Restore {fileName}"
									type="button"
									on:click={() => restoreExistingAttachment(fileName)}
									class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-400 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-emerald-600/20 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
									title="Restore attachment"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
										/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- New Files Section -->
			{#if $files.length > 0}
				<div class="space-y-3">
					<h4 class="text-sm font-medium text-slate-300">New Files</h4>
					<div class="grid gap-3">
						{#each $files as file, i (i)}
							<div
								class="group relative overflow-hidden rounded-xl border border-slate-600/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30 p-4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-500/50 hover:from-slate-700/60 hover:to-slate-600/40 hover:shadow-xl"
							>
								<!-- File Icon and Type Badge -->
								<div class="flex items-center gap-4">
									<div class="flex-shrink-0">
										{#if shouldShowThumbnail(file)}
											<!-- Image Thumbnail -->
											<div class="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-slate-600/50">
												<img
													src={createFilePreviewUrl(file)}
													alt={file.name}
													class="h-full w-full object-cover"
													loading="lazy"
													on:error={(e) => {
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
													{getFileIcon(file.name)}
												</div>
											</div>
										{:else}
											<!-- Regular File Icon -->
											<div
												class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-2xl ring-1 ring-slate-600/50"
											>
												{getFileIcon(file.name)}
											</div>
										{/if}
									</div>

									<!-- File Details -->
									<div class="min-w-0 flex-1">
										<h4
											class="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-white"
											title={file.name}
										>
											{file.name}
										</h4>

										<div class="mt-1 flex items-center gap-3">
											<span
												class={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getFileTypeClasses(file.name)}`}
											>
												{getFileTypeDescription(file.name)}
											</span>
											<span class="text-xs text-slate-400">
												{formatBytes(file.size)}
											</span>
											<span class="text-xs text-emerald-400">New</span>
										</div>
									</div>

									<!-- Remove Button - Centered -->
									<button
										aria-label="Remove file"
										type="button"
										on:click={() => removeFile(i)}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/10 text-red-400 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-red-600/20 hover:text-red-300 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
										title="Remove file"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>

								<!-- Subtle hover effect overlay -->
								<div
									class="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-sky-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								></div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
