<!-- gefifi-2/src/frontend/src/lib/components/FileUpload.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Writable } from 'svelte/store';

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
	export let maxFileSize: number = 25 * 1024 * 1024; // 25MB
	export let multiple: boolean = true;
	export let files: Writable<File[]>;

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

	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function formatBytes(bytes: number, decimals = 2): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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
</script>

<div class="space-y-4">
	<div
		class="relative rounded-lg border-2 border-dashed border-slate-500 bg-slate-800/50 p-6 text-center transition-all duration-200"
		class:border-emerald-500={dragOver}
		class:bg-slate-700={dragOver}
		on:dragover|preventDefault={() => (dragOver = true)}
		on:dragleave|preventDefault={() => (dragOver = false)}
		on:drop|preventDefault={handleDrop}
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
				<p class="text-sm">Supports: Images, PDF, Word, Excel, DWG, DXF (Max 25MB)</p>
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

	{#if $files.length > 0}
		<div class="space-y-3">
			<h3 class="font-semibold text-slate-300">Selected Files:</h3>
			<ul class="space-y-2">
				{#each $files as file, i (i)}
					<li class="flex items-center justify-between rounded-lg bg-slate-700/50 p-3 text-sm">
						<div class="flex items-center space-x-3 overflow-hidden">
							<span class="text-2xl">{getFileIcon(file.name)}</span>
							<div class="flex flex-col overflow-hidden">
								<span class="truncate font-medium text-slate-200" title={file.name}
									>{file.name}</span
								>
								<span class="text-xs text-slate-400">{formatBytes(file.size)}</span>
							</div>
						</div>
						<button
							type="button"
							on:click={() => removeFile(i)}
							class="ml-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
							title="Remove file"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
