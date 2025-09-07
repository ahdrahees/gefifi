<!-- gefifi-2/src/frontend/src/lib/components/chat/SystemMessage.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Message } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let message: Message;

	function handleClick() {
		if (message.contractId) {
			goto(`/contracts/${message.contractId}`);
		} else if (message.ExpertRequestId) {
			goto(`/my-requests/${message.ExpertRequestId}`);
		} else if (message.MaterialRequestId) {
			goto(`/my-requests/${message.MaterialRequestId}`);
		}
	}

	const parseAndSanitize = (content: string): string => {
		if (typeof window !== 'undefined') {
			// Ensure links open in a new tab and are secure
			const rawHtml = marked.parse(content, { gfm: true, breaks: true }) as string;
			const sanitized = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
			// Post-process to add target="_blank" to all links
			const doc = new DOMParser().parseFromString(sanitized, 'text/html');
			doc.querySelectorAll('a').forEach((a) => {
				a.setAttribute('target', '_blank');
				a.setAttribute('rel', 'noopener noreferrer');
			});
			return doc.body.innerHTML;
		}
		return content; // Fallback for SSR
	};

	const formatTimestamp = (timestamp: string): string =>
		new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<div class="flex flex-col items-center justify-center py-2">
	{#if message.contractId || message.ExpertRequestId || message.MaterialRequestId}
		<!-- Clickable System Message -->
		<button
			class="group flex cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-700/50 px-2 py-1 transition-all duration-200 hover:bg-slate-600/20 hover:text-slate-200 sm:px-4 sm:py-2"
			aria-label="Clickable system message, press to view details"
			on:click={handleClick}
		>
			<svg
				class="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>

			<div class="flex flex-col items-center">
				<span class="text-left text-[11px] text-slate-400 transition-colors sm:text-xs">
					{@html parseAndSanitize(message.content)}
				</span>
			</div>

			<!-- Small indicator for clickable messages -->
			<svg
				class="h-3 w-3 text-slate-500 opacity-0 transition-colors group-hover:text-emerald-400 group-hover:opacity-100"
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
			<span
				class="mt-1 text-[9px] text-slate-500 transition-colors group-hover:text-slate-400 sm:text-[10px]"
			>
				{formatTimestamp(message.timestamp)}
			</span>
		</button>
	{:else}
		<!-- Non-clickable System Message -->
		<div class="flex items-center justify-center gap-2 rounded-full bg-slate-700/50 px-4 py-2">
			<svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>

			<span class="text-[11px] text-slate-400 sm:text-xs">
				{@html parseAndSanitize(message.content)}
			</span>
			<span class="mt-1 text-[9px] text-slate-500 sm:text-[10px]">
				{formatTimestamp(message.timestamp)}
			</span>
		</div>
	{/if}
</div>
