<script lang="ts">
	import type { AgentApproval, ArtifactPart } from '$lib/types/agent-api';
	import apiClient from '$lib/api';
	import { onMount } from 'svelte';

	interface Props {
		approval: AgentApproval;
		artifacts: Record<string, ArtifactPart>;
	}

	let { approval, artifacts }: Props = $props();

	let submitting = $state(false);
	let done = $state(false);
	let doneHref = $state('');
	let doneLabel = $state('Done');
	let error = $state('');

	const storageKey = () => `gefifi:approval:${approval.id}`;

	onMount(() => {
		const saved = window.localStorage.getItem(storageKey());
		if (!saved) return;
		try {
			const parsed = JSON.parse(saved) as { href?: string; label?: string };
			doneHref = parsed.href ?? '';
			doneLabel = parsed.label ?? 'Already confirmed';
			done = true;
		} catch {
			// Ignore a corrupt local marker; the user can confirm again.
		}
	});

	function markDone(href: string, label: string) {
		doneHref = href;
		doneLabel = label;
		done = true;
		try {
			window.localStorage.setItem(storageKey(), JSON.stringify({ href, label }));
		} catch {
			// Local storage can be unavailable; the server action already succeeded.
		}
	}

	const buttonLabel = $derived.by(() => {
		if (approval.action === 'chat_message') return 'Send message';
		if (approval.action === 'contract') return 'Draft contract';
		if (approval.action === 'quote_accept') return 'Accept quote';
		return 'Create request';
	});

	const preview = $derived.by(() => {
		const payload = approval.payload;
		if (approval.action === 'chat_message') return String(payload.content ?? '');
		if (approval.action === 'work_request' || approval.action === 'material_request') {
			return String(payload.description ?? '');
		}
		if (approval.action === 'contract') return String(payload.workDetails ?? '');
		if (approval.action === 'quote_accept') {
			return 'This accepts the selected quote, rejects the other quotes for the request, and marks it contracted.';
		}
		return '';
	});

	// Chat cards already repeat the message in the summary list; only render the
	// preview when it adds information.
	const showPreview = $derived(preview.length > 0 && !approval.summary.includes(preview));

	function artifactToFile(name: string): File | null {
		const part = artifacts[name];
		const inline = part?.inlineData;
		if (!inline?.data) return null;
		const mimeType = inline.mimeType || 'application/octet-stream';
		let base64 = inline.data.replace(/-/g, '+').replace(/_/g, '/');
		while (base64.length % 4) base64 += '=';
		const binary = atob(base64);
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		return new File([bytes], name, { type: mimeType });
	}

	function attachmentFiles(): File[] {
		return (approval.attachments ?? [])
			.map((name) => artifactToFile(name))
			.filter((file): file is File => file !== null);
	}

	async function uploadWorkImages(files: File[]): Promise<string[]> {
		const paths: string[] = [];
		for (const file of files) {
			const form = new FormData();
			form.append('file', file);
			const uploaded = await apiClient.uploadFile(form);
			paths.push(uploaded.filePath);
		}
		return paths;
	}

	type WorkRequestPayload = Parameters<typeof apiClient.createWorkRequest>[0];
	type MaterialRequestPayload = Parameters<typeof apiClient.createMaterialRequest>[0];
	type ContractPayload = Parameters<typeof apiClient.createContract>[0];

	async function confirm() {
		submitting = true;
		error = '';
		try {
			const files = attachmentFiles();
			const expectedAttachments = approval.attachments?.length ?? 0;
			if (files.length < expectedAttachments) {
				throw new Error(
					'Some chat attachments are no longer available. Ask the agent to resend the draft.'
				);
			}

			if (approval.action === 'work_request') {
				const payload = {
					...approval.payload,
					images: await uploadWorkImages(files)
				} as unknown as WorkRequestPayload;
				const created = await apiClient.createWorkRequest(payload);
				markDone(`/my-requests/${created.id}`, 'Request created');
			} else if (approval.action === 'material_request') {
				const payload = { ...approval.payload } as unknown as MaterialRequestPayload;
				const created = await apiClient.createMaterialRequest(payload);
				markDone(`/material-requests/${created.id}`, 'Request created');
				if (files.length > 0) {
					try {
						const form = new FormData();
						files.forEach((file) => form.append('files', file));
						await apiClient.uploadEntityAttachments('material-requests', created.id, form);
					} catch {
						error = 'Request created, but attachments failed. Open it to retry.';
					}
				}
			} else if (approval.action === 'contract') {
				const payload = { ...approval.payload } as unknown as ContractPayload;
				const created = await apiClient.createContract(payload);
				markDone(`/contracts/${created.id}`, 'Contract drafted');
			} else if (approval.action === 'quote_accept') {
				const quoteId = String(approval.payload.quoteId ?? '');
				await apiClient.updateQuoteStatus(quoteId, 'accepted');
				const requestId = String(approval.payload.requestId ?? '');
				const requestType = String(approval.payload.requestType ?? '');
				if (requestId && requestType === 'material') {
					markDone(`/material-requests/${requestId}`, 'Quote accepted');
				} else if (requestId) {
					markDone(`/my-requests/${requestId}`, 'Quote accepted');
				} else {
					markDone('', 'Quote accepted');
				}
			} else {
				const chatId = String(approval.payload.chat_id ?? '');
				await apiClient.sendChatMessage(chatId, {
					content: String(approval.payload.content ?? '')
				});
				markDone(`/chat/${chatId}`, 'Message sent');
			}
			done = true;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not complete this action.';
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="w-full max-w-xl overflow-hidden rounded-xl border border-emerald-500/25 bg-slate-800/90 shadow-lg"
>
	<div class="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
		<span
			class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-300"
		>
			✓
		</span>
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold text-slate-100">{approval.title}</p>
			<p class="text-[11px] text-slate-400">
				{done ? 'Completed' : 'Agent draft · your confirmation required'}
			</p>
		</div>
	</div>

	<div class="space-y-2 px-4 py-3">
		{#if approval.summary.length > 0}
			<ul class="space-y-1 text-sm text-slate-200">
				{#each approval.summary as item, index (index)}
					<li class="flex gap-2">
						<span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400"></span>
						<span class="break-words">{item}</span>
					</li>
				{/each}
			</ul>
		{/if}

		{#if showPreview}
			<p class="line-clamp-3 text-xs whitespace-pre-wrap text-slate-400">{preview}</p>
		{/if}

		{#if approval.attachments && approval.attachments.length > 0}
			<p class="text-xs text-slate-400">
				{approval.attachments.length} attachment{approval.attachments.length === 1 ? '' : 's'} from the
				chat will be attached.
			</p>
		{/if}

		<p class="truncate font-mono text-[10px] text-slate-500">
			draft {approval.payload_hash.slice(0, 12)}
		</p>

		{#if error}
			<p class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
				{error}
			</p>
		{/if}

		{#if done}
			<div
				class="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2"
			>
				<p class="text-sm text-emerald-200">{doneLabel}</p>
				{#if doneHref}
					<button
						type="button"
						class="text-xs font-medium text-emerald-300 underline"
						onclick={() => (window.location.href = doneHref)}
					>
						Open
					</button>
				{/if}
			</div>
		{:else}
			<button
				type="button"
				onclick={confirm}
				disabled={submitting}
				class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? 'Working…' : buttonLabel}
			</button>
		{/if}
	</div>
</div>
