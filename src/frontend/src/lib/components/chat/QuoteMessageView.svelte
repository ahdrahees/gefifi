<script lang="ts">
	import type { AuthUser, QuoteMessage } from '$lib/types';
	import { goto } from '$app/navigation';

	// Props
	export let message: QuoteMessage;
	export let currentUser: AuthUser | null = null; // For external reference only

	$: isSender = currentUser?.id === message.senderId;

	// File utilities (same as MessageList)
	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['dwg', 'dxf'].includes(extension)) return '📐';
		return '📁';
	}

	function getFileTypeDescription(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'Image';
		if (extension === 'pdf') return 'PDF Document';
		if (['doc', 'docx'].includes(extension)) return 'Word Document';
		if (['xls', 'xlsx'].includes(extension)) return 'Excel Spreadsheet';
		if (extension === 'dwg') return 'AutoCAD Drawing';
		if (extension === 'dxf') return 'DXF Drawing';
		return 'Document';
	}

	function getFileTypeClasses(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
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

	// Methods
	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleViewQuote() {
		if (message.requestId) {
			goto(`/my-requests/${message.requestId}/quote`);
		}
	}

	function handleViewRequest() {
		if (message.requestId) {
			goto(`/my-requests/${message.requestId}`);
		}
	}

	// Timestamp formatting (same as MessageList)
	const formatTimestamp = (timestamp: string): string =>
		new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<!-- Quote Message Container (styled like regular message) -->
<div
	class="max-w-xs rounded-xl px-3 py-2 shadow-md sm:max-w-md"
	class:rounded-br-none={isSender}
	class:bg-emerald-600={isSender}
	class:text-white={isSender}
	class:rounded-bl-none={!isSender}
	class:bg-slate-700={!isSender}
	class:text-slate-100={!isSender}
>
	<!-- Quote Header with Icon -->
	<div class="mb-2 flex items-center gap-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-4 w-4 flex-shrink-0 text-emerald-400"
		>
			<rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
			<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			<path d="M12 11h4" />
			<path d="M12 16h4" />
			<path d="M8 11h.01" />
			<path d="M8 16h.01" />
		</svg>
		<span class="text-xs font-medium text-emerald-300">Quote</span>
	</div>

	<!-- Quote Content -->
	<div class="space-y-2">
		<!-- Quote Title -->
		<div class="font-medium">{message.quoteTitle || 'Quote'}</div>

		<!-- Quote Amount -->
		{#if message.quoteAmount}
			<div class="text-sm">
				<span class="font-semibold text-emerald-400">
					{formatCurrency(message.quoteAmount, 'INR')}
				</span>
			</div>
		{/if}

		<!-- Quote Validity -->
		{#if message.quoteValidity}
			<div class="text-xs opacity-75">
				Valid until: {formatDate(message.quoteValidity)}
			</div>
		{/if}

		<!-- File Attachments -->
		{#if message.attachments && message.attachments.length > 0}
			<div class="mt-2 space-y-2">
				{#each message.attachments as attachment (attachment.filePath)}
					<div
						class="flex w-full max-w-full items-center gap-2 rounded-lg border border-slate-600/30 bg-slate-800/50 p-2 sm:gap-3 sm:p-3"
					>
						<div class="flex-shrink-0">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-lg sm:h-10 sm:w-10 sm:text-2xl"
							>
								{getFileIcon(attachment.fileName)}
							</div>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
								<span
									class="truncate text-xs font-medium text-slate-200"
									title={attachment.fileName}
									style="max-width: 100px;"
								>
									{attachment.fileName.length > 20
										? `${attachment.fileName.substring(0, 8)}...${attachment.fileName.substring(attachment.fileName.lastIndexOf('.'))}`
										: attachment.fileName}
								</span>
								<span class="text-xs text-slate-400" style="font-size: 10px;">
									{formatBytes(attachment.size)}
								</span>
							</div>
							<div class="mt-1">
								<span
									class={`inline-flex items-center rounded border px-1 py-0.5 text-xs font-medium sm:px-2 ${getFileTypeClasses(attachment.fileName)}`}
									style="font-size: 9px;"
								>
									{getFileTypeDescription(attachment.fileName)}
								</span>
							</div>
						</div>
						<div class="flex-shrink-0">
							{#if isViewableFile(attachment.fileName)}
								<a
									href={attachment.filePath}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 sm:px-3 sm:py-1.5"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
									View
								</a>
							{:else}
								<a
									href={attachment.filePath}
									download={attachment.fileName}
									class="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20 sm:px-3 sm:py-1.5"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									Download
								</a>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Timestamp and Action Buttons Row (like invite message) -->
	<div class="mt-2 flex items-center justify-between gap-2" class:flex-row-reverse={isSender}>
		<!-- Timestamp -->
		<div class="text-xs" class:text-emerald-200={isSender} class:text-slate-400={!isSender}>
			{formatTimestamp(message.timestamp)}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<!-- View Quote Button (blue theme) -->
			<button
				class="group flex items-center gap-1 rounded-lg border border-blue-500/30 bg-slate-800 px-2 py-1 text-xs font-semibold text-blue-300 shadow-lg transition-all duration-200 hover:scale-105 hover:border-blue-400/50 hover:bg-slate-700 hover:shadow-lg hover:shadow-blue-500/20"
				aria-label="View quote details"
				on:click={handleViewQuote}
			>
				<span>View Quote</span>
				<svg
					class="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
			</button>

			<!-- View Request Button (emerald theme like invite message) -->
			<button
				class="group flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-slate-800 px-2 py-1 text-xs font-semibold text-emerald-300 shadow-lg transition-all duration-200 hover:scale-105 hover:border-emerald-400/50 hover:bg-slate-700 hover:shadow-lg hover:shadow-emerald-500/20"
				aria-label="View request details"
				on:click={handleViewRequest}
			>
				<span>View Request</span>
				<svg
					class="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
