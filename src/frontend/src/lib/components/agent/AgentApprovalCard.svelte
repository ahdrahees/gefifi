<script lang="ts">
	import type { AgentApproval, ArtifactPart } from '$lib/types/agent-api';
	import apiClient, { ApiError } from '$lib/api';
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
	let claimToken = '';

	const storageKey = () => `gefifi:approval:${approval.id}`;
	const claimStorageKey = () => `gefifi:approval-claim:${approval.id}`;

	function readStoredClaim(): string {
		try {
			return window.localStorage.getItem(claimStorageKey()) ?? '';
		} catch {
			return '';
		}
	}

	function storeClaim(token: string) {
		try {
			window.localStorage.setItem(claimStorageKey(), token);
		} catch {
			// The claim is still valid for this tab; persistence is best-effort.
		}
	}

	function clearStoredClaim() {
		try {
			window.localStorage.removeItem(claimStorageKey());
		} catch {
			// Ignore unavailable storage.
		}
	}

	function readLocalMarker(): {
		href?: string;
		label?: string;
		claimToken?: string;
		pending?: boolean;
	} | null {
		try {
			const saved = window.localStorage.getItem(storageKey());
			if (!saved) return null;
			return JSON.parse(saved) as {
				href?: string;
				label?: string;
				claimToken?: string;
				pending?: boolean;
			};
		} catch {
			return null;
		}
	}

	async function syncCompletion(token: string, href: string, label: string): Promise<boolean> {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				await apiClient.completeAgentApproval(approval.id, token, href, label);
				return true;
			} catch (cause) {
				// A 4xx will not succeed on retry. Network errors and 5xx may.
				if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) {
					return false;
				}
				if (attempt === 2) return false;
				await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
		return false;
	}

	onMount(async () => {
		claimToken = readStoredClaim();
		const saved = readLocalMarker();
		if (saved) {
			doneHref = saved.href ?? '';
			doneLabel = saved.label ?? 'Already confirmed';
			done = true;
		}

		// The server record is shared across browsers/devices. Read it first;
		// a completed record wins over any stale local marker.
		try {
			const record = await apiClient.getAgentApproval(approval.id);
			if (record.status === 'completed') {
				markDone(record.href ?? '', record.label ?? 'Already confirmed', claimToken, false);
				return;
			}
		} catch {
			// 404 means this approval has not been confirmed yet.
		}

		// A previous attempt may have completed the action but failed to sync
		// the completion. Retry with the same claim token; this never reruns
		// the action.
		if (saved?.pending) {
			const token = saved.claimToken || claimToken;
			if (token) {
				const synced = await syncCompletion(token, saved.href ?? '', saved.label ?? 'Done');
				if (synced) {
					markDone(saved.href ?? '', saved.label ?? 'Done', token, false);
				}
			}
		}
	});

	function markDone(href: string, label: string, token = claimToken, pending = false) {
		doneHref = href;
		doneLabel = label;
		done = true;
		if (!pending) {
			clearStoredClaim();
		} else if (token) {
			storeClaim(token);
		}
		try {
			window.localStorage.setItem(
				storageKey(),
				JSON.stringify({ href, label, claimToken: token, pending })
			);
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
		const requested = approval.attachments ?? [];
		const available = Object.keys(artifacts);
		const used: string[] = [];
		const files: File[] = [];

		for (const name of requested) {
			// The agent may guess a filename (image.png / unknown) because the
			// session artifact list can be empty. Fall back to the uploaded
			// artifacts in order before giving up.
			const actual = artifacts[name]
				? name
				: available.find((candidate) => !used.includes(candidate));
			if (!actual) continue;
			const file = artifactToFile(actual);
			if (!file) continue;
			used.push(actual);
			files.push(file);
		}

		return files;
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

	async function runApprovalAction(): Promise<{ href: string; label: string }> {
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
				approvalId: approval.id,
				images: await uploadWorkImages(files)
			} as unknown as WorkRequestPayload;
			const created = await apiClient.createWorkRequest(payload);
			return { href: `/my-requests/${created.id}`, label: 'Request created' };
		}

		if (approval.action === 'material_request') {
			const payload = {
				...approval.payload,
				approvalId: approval.id
			} as unknown as MaterialRequestPayload;
			const created = await apiClient.createMaterialRequest(payload);
			if (files.length > 0) {
				try {
					const form = new FormData();
					files.forEach((file) => form.append('files', file));
					await apiClient.uploadEntityAttachments('material-requests', created.id, form);
				} catch {
					error = 'Request created, but attachments failed. Open it to retry.';
				}
			}
			return { href: `/material-requests/${created.id}`, label: 'Request created' };
		}

		if (approval.action === 'contract') {
			const payload = {
				...approval.payload,
				approvalId: approval.id
			} as unknown as ContractPayload;
			const created = await apiClient.createContract(payload);
			return { href: `/contracts/${created.id}`, label: 'Contract drafted' };
		}

		if (approval.action === 'quote_accept') {
			const quoteId = String(approval.payload.quoteId ?? '');
			await apiClient.updateQuoteStatus(quoteId, 'accepted');
			const requestId = String(approval.payload.requestId ?? '');
			const requestType = String(approval.payload.requestType ?? '');
			if (requestId && requestType === 'material') {
				return { href: `/material-requests/${requestId}`, label: 'Quote accepted' };
			}
			if (requestId) {
				return { href: `/my-requests/${requestId}`, label: 'Quote accepted' };
			}
			return { href: '', label: 'Quote accepted' };
		}

		const chatId = String(approval.payload.chat_id ?? '');
		await apiClient.sendChatMessage(chatId, {
			content: String(approval.payload.content ?? ''),
			// The chat route uses messageId as the document ID, so a retry
			// overwrites the same message instead of posting a duplicate.
			messageId: approval.id
		});
		return { href: `/chat/${chatId}`, label: 'Message sent' };
	}

	async function confirm() {
		submitting = true;
		error = '';
		if (!claimToken) {
			claimToken = crypto.randomUUID();
		}
		let claimed = false;

		try {
			// The backend record is the source of truth. Only one browser or
			// device can claim the card, and a completed record is returned to
			// every later opener instead of running the action again.
			const claim = await apiClient.claimAgentApproval(
				approval.id,
				claimToken,
				approval.action
			);
			if (claim.status === 'completed') {
				markDone(claim.href ?? '', claim.label ?? 'Already confirmed', claimToken, false);
				return;
			}
			claimed = true;
			storeClaim(claimToken);

			const result = await runApprovalAction();
			const synced = await syncCompletion(claimToken, result.href, result.label);
			markDone(result.href, result.label, claimToken, !synced);
			if (!synced) {
				error =
					'The action completed, but its shared status could not be saved. Reload this card before retrying anywhere else.';
			}
		} catch (cause) {
			// A 4xx is a definitive rejection (nothing was created), so the
			// claim can be released for a clean retry. Network errors, 5xx and
			// timeouts may have committed; keep the claim so the idempotency
			// key can resolve the retry instead of creating a duplicate.
			const mayHaveCommitted =
				cause instanceof ApiError
					? cause.status >= 500
					: cause instanceof TypeError;
			if (claimed && !mayHaveCommitted) {
				try {
					await apiClient.releaseAgentApproval(approval.id, claimToken);
					clearStoredClaim();
				} catch {
					// A stale claim expires after two minutes.
				}
			}
			const message = cause instanceof Error ? cause.message : 'Could not complete this action.';
			error = mayHaveCommitted
				? `${message} The action may still have completed; reload this card before retrying.`
				: message;
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
