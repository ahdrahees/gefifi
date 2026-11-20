<script lang="ts">
	import type {
		AgentEvent,
		AgentContent,
		AgentContentPart,
		ArtifactPart,
		AgentApproval
	} from '$lib/types/agent-api';
	import ImageModal from '$lib/components/chat/ImageModal.svelte';
	import FileAttachment from '$lib/components/chat/FileAttachment.svelte';
	import AgentApprovalCard from './AgentApprovalCard.svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { buildChatDirectory, describeToolCall } from './toolLabels';

	interface Props {
		events: AgentEvent[];
		artifacts: Record<string, ArtifactPart>;
		isGenerating?: boolean;
	}

	let { events, artifacts, isGenerating = false }: Props = $props();

	// Configure marked
	marked.use({ breaks: true, gfm: true });

	// --- STATE ---
	let showImageModal = $state(false);
	let modalImageSrc = $state('');

	function openImageModal(src: string) {
		modalImageSrc = src;
		showImageModal = true;
	}

	function closeImageModal() {
		showImageModal = false;
		modalImageSrc = '';
	}

	let copiedText = $state('');

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedText = text;
			setTimeout(() => {
				if (copiedText === text) copiedText = '';
			}, 2000);
		});
	}

	// Artifact Helper
	// Pattern: [Uploaded Artifact: "filename"]
	const ARTIFACT_REGEX = /\[Uploaded Artifact: "([^"]+)"\]/g;

	function parseMessageParts(text: string) {
		const parts: Array<{ type: 'text' | 'artifact'; value: string; artifact?: ArtifactPart }> = [];
		let lastIndex = 0;
		let match;

		while ((match = ARTIFACT_REGEX.exec(text)) !== null) {
			// Add preceding text
			if (match.index > lastIndex) {
				const textPart = text.substring(lastIndex, match.index).trim();
				if (textPart) parts.push({ type: 'text', value: textPart });
			}

			// Add artifact
			const artifactName = match[1];
			const artifact = artifacts[artifactName];
			parts.push({
				type: 'artifact',
				value: artifactName,
				artifact
			});

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < text.length) {
			const textPart = text.substring(lastIndex).trim();
			if (textPart) parts.push({ type: 'text', value: textPart });
		}

		return parts;
	}

	function isImageArtifact(name: string): boolean {
		const ext = name.split('.').pop()?.toLowerCase() || '';
		return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
	}

	function getArtifactUrl(artifact: ArtifactPart): string | null {
		// If inlineData exists (Blob)
		if (artifact.inlineData && artifact.inlineData.data) {
			// Convert URL-safe base64 (base64url) to standard base64 if needed
			let base64Data = artifact.inlineData.data.replace(/-/g, '+').replace(/_/g, '/');
			while (base64Data.length % 4) {
				base64Data += '=';
			}
			return `data:${artifact.inlineData.mimeType};base64,${base64Data}`;
		}
		return null;
	}

	function createAttachmentObject(name: string, artifact: ArtifactPart) {
		// Create a synthetic attachment object for FileAttachment component
		return {
			fileName: name,
			filePath: getArtifactUrl(artifact) || '#', // Should be a valid URL/Base64
			size: 0 // We might not know size from ArtifactPart unless decoded
		};
	}

	function renderMarkdown(text: string): string {
		try {
			const html = marked.parse(text) as string;
			return DOMPurify.sanitize(html);
		} catch (e) {
			console.error('Markdown rendering error', e);
			return text;
		}
	}

	function getApproval(part: AgentContentPart): AgentApproval | null {
		const response = part.functionResponse?.response;
		const candidate =
			response?.approval ?? (response as Record<string, any> | undefined)?.result?.approval;
		return candidate && typeof candidate === 'object' ? (candidate as AgentApproval) : null;
	}

	function processEventContent(content: AgentContent | null | undefined) {
		const allArtifacts: Array<{ value: string; artifact: ArtifactPart }> = [];
		const allText: string[] = [];
		const allApprovals: AgentApproval[] = [];

		if (content?.parts) {
			content.parts.forEach((part) => {
				// Skip reasoning/thought parts
				if (part.thought) {
					return;
				}

				const approval = getApproval(part);
				if (approval) {
					allApprovals.push(approval);
				}

				// Only process text parts (skip functionCall, functionResponse, etc.)
				if (part.text) {
					const parsed = parseMessageParts(part.text);
					parsed.forEach((p) => {
						if (p.type === 'artifact' && p.artifact) {
							allArtifacts.push({ value: p.value, artifact: p.artifact });
						} else {
							// For text parts OR artifacts with missing data, at least show the label
							allText.push(p.value);
						}
					});
				}
			});
		}
		return { artifacts: allArtifacts, texts: allText, approvals: allApprovals };
	}

	// Filter events that have displayable content (text or an approval card)
	function hasDisplayableContent(event: AgentEvent): boolean {
		if (!event.content?.parts) return false;
		return event.content.parts.some(
			(part) =>
				(!part.thought && part.text !== null && part.text !== undefined) ||
				getApproval(part) !== null
		);
	}

	// Reasoning/thought parts are streamed live (partial chunks) while the
	// visible answer only arrives with the final event. Surfacing them in a
	// collapsed block keeps the chat visibly updating instead of showing a
	// bare loading state for the whole turn.
	function hasThoughtContent(event: AgentEvent): boolean {
		if (!event.content?.parts) return false;
		return event.content.parts.some(
			(part) => part.thought && part.text !== null && part.text !== undefined
		);
	}

	function getThoughtText(event: AgentEvent): string {
		if (!event.content?.parts) return '';
		return event.content.parts
			.filter((part) => part.thought && part.text)
			.map((part) => part.text as string)
			.join('');
	}

	// Tool usage: model events carry completed functionCall parts (name + full
	// args arrive with the final, non-partial event), and each tool execution
	// echoes back as a separate functionResponse event whose id matches the
	// call id. Surfacing both shows what the agent actually did.
	function hasToolActivity(event: AgentEvent): boolean {
		if (!event.content?.parts) return false;
		return event.content.parts.some((part) => part.functionCall != null);
	}

	interface ToolCallInfo {
		callId: string | null;
		name: string;
		label: string;
		argsText: string | null;
	}

	function getToolCalls(
		event: AgentEvent,
		chatDirectory: Map<string, string[]>,
		responsesByCallId: Map<string, { response: Record<string, unknown> }>
	): ToolCallInfo[] {
		if (!event.content?.parts) return [];
		return event.content.parts
			.filter((part) => part.functionCall != null)
			.map((part) => {
				const call = part.functionCall!;
				const args =
					call.args && typeof call.args === 'object'
						? (call.args as Record<string, unknown>)
						: null;
				let argsText: string | null = null;
				try {
					argsText = args ? JSON.stringify(args) : null;
				} catch {
					argsText = null;
				}
				if (argsText && argsText.length > 1000) {
					argsText = argsText.slice(0, 1000) + '… (truncated)';
				}
				const response = (call.id && responsesByCallId.get(call.id)?.response) || null;
				return {
					callId: call.id ?? null,
					name: call.name,
					label: describeToolCall(call.name, args, response, chatDirectory),
					argsText
				};
			});
	}

	interface ToolResultInfo {
		status: string | null;
		summary: string | null;
	}

	function summarizeToolResult(response: Record<string, unknown>): ToolResultInfo {
		const status =
			typeof response.status === 'string' && response.status ? response.status : null;
		let message =
			(typeof response.error_message === 'string' && response.error_message) ||
			(typeof response.message === 'string' && response.message) ||
			null;
		// A plain "...retrieved/updated successfully" says nothing the success
		// badge doesn't already say — hide it to avoid stating success twice.
		if (message && status === 'success' && /successfully\.?\s*$/i.test(message)) {
			message = null;
		}
		return {
			status,
			summary:
				message && message.length > 300 ? message.slice(0, 300) + '… (truncated)' : message
		};
	}

	// Index of functionResponse events by their call id, so each result
	// renders under its tool call instead of as a separate chat bubble.
	let toolResponsesByCallId = $derived.by(() => {
		const map = new Map<string, { response: Record<string, unknown> }>();
		for (const evt of events) {
			for (const part of evt.content?.parts ?? []) {
				const fr = part.functionResponse;
				if (fr?.id) {
					map.set(fr.id, { response: fr.response ?? {} });
				}
			}
		}
		return map;
	});

	let toolResultsByCallId = $derived.by(() => {
		const map = new Map<string, ToolResultInfo>();
		for (const [callId, { response }] of toolResponsesByCallId) {
			map.set(callId, summarizeToolResult(response));
		}
		return map;
	});

	let chatDirectory = $derived.by(() => buildChatDirectory(events));

	// Index of the latest event carrying thought content. Its block auto-opens
	// while generating so progress is visible live; older ones stay collapsed.
	let lastThinkingIndex = $derived.by(() => {
		for (let i = events.length - 1; i >= 0; i--) {
			if (events[i].author !== 'user' && hasThoughtContent(events[i])) return i;
		}
		return -1;
	});
</script>

<div class="flex flex-col gap-6 p-4 pb-0">
	{#each events as event, evIndex (event.id ?? evIndex)}
		{#if hasDisplayableContent(event) || hasThoughtContent(event) || hasToolActivity(event)}
			{@const isUser = event.author === 'user'}
			{@const { artifacts: msgArtifacts, texts: msgTexts, approvals: msgApprovals } = processEventContent(event.content)}
			{@const thoughtText =
				!isUser && hasThoughtContent(event) ? getThoughtText(event) : ''}
			{@const toolCalls =
				!isUser ? getToolCalls(event, chatDirectory, toolResponsesByCallId) : []}

			<div class="group/msg flex w-full {isUser ? 'justify-end' : 'justify-start'}">
				<div class="flex max-w-[85%] flex-col gap-2 sm:max-w-[75%]">
					<!-- Reasoning stream: visible while the model thinks, collapsed afterwards -->
					{#if thoughtText}
						{@const thinkingLive = isGenerating && evIndex === lastThinkingIndex}
						<details open={thinkingLive} class="max-w-full">
							<summary
								class="cursor-pointer text-xs text-slate-400 select-none hover:text-slate-300"
							>
								{thinkingLive ? 'Thinking…' : 'Thought process'}
							</summary>
							<div
								class="mt-1 max-h-48 overflow-y-auto rounded-lg bg-slate-800/70 px-3 py-2 text-xs whitespace-pre-wrap text-slate-300"
							>
								{thoughtText}
							</div>
						</details>
					{/if}

					<!-- Approval cards from gated agent tools -->
					{#each msgApprovals as approval (approval.id)}
						<AgentApprovalCard {approval} {artifacts} />
					{/each}

					<!-- Render Artifacts First -->
					{#each msgArtifacts as p, artIndex (artIndex)}
						{#if isImageArtifact(p.value)}
							<!-- Image Preview -->
							{@const url = getArtifactUrl(p.artifact)}
							{#if url}
								<button
									class="max-h-[384px] max-w-[384px] overflow-hidden rounded-lg border border-slate-700 bg-slate-800 transition-opacity hover:opacity-90"
									onclick={() => openImageModal(url)}
								>
									<img src={url} alt={p.value} class="h-full w-full object-contain" />
								</button>
							{/if}
						{:else}
							<!-- Document Attachment -->
							<div class="w-full">
								<FileAttachment
									attachment={createAttachmentObject(p.value, p.artifact)}
									onView={(e) => console.log('View file', e)}
								/>
							</div>
						{/if}
					{/each}

					<!-- Render Text -->
					{#each msgTexts as textPart, textIndex (textIndex)}
						<div class="group/bubble relative flex items-end">
							<div
								class="prose prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-slate-900 prose-pre:p-2 max-w-none rounded-xl px-4 py-2 break-words shadow-sm"
								class:bg-emerald-600={isUser}
								class:text-white={isUser}
								class:prose-invert={true}
								class:rounded-br-none={isUser}
								class:bg-slate-700={!isUser}
								class:text-slate-100={!isUser}
								class:rounded-bl-none={!isUser}
							>
								{@html renderMarkdown(textPart)}
								{#if !isUser && isGenerating && evIndex === events.length - 1 && textIndex === msgTexts.length - 1}
									<span
										class="ml-1 inline-block h-4 w-1.5 animate-pulse bg-emerald-400 align-middle"
									></span>
								{/if}
							</div>

							<!-- Copy Button -->
							<button
								onclick={() => copyToClipboard(textPart)}
								class="absolute bottom-1 flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/80 text-slate-400 opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 group-hover/msg:opacity-100 hover:border-slate-500/40 hover:bg-slate-700 hover:text-slate-200 focus:outline-none active:scale-90"
								class:left-[-2rem]={isUser}
								class:right-[-2rem]={!isUser}
								title="Copy message"
								aria-label="Copy message"
							>
								{#if copiedText === textPart}
									<!-- Checkmark -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-3.5 w-3.5 text-emerald-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2.5"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4.5 12.75l6 6 9-13.5"
										/>
									</svg>
								{:else}
									<!-- Copy -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="lucide lucide-copy-icon lucide-copy"
										><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
											d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
										/></svg
									>
								{/if}
							</button>
						</div>
					{/each}

					<!-- Tool activity: completed function calls with their results -->
					{#if toolCalls.length > 0}
						<details class="max-w-full">
							<summary
								class="cursor-pointer text-xs text-slate-400 select-none hover:text-slate-300"
							>
								Tool activity ({toolCalls.length})
							</summary>
							<div class="mt-1 flex flex-col gap-1.5">
								{#each toolCalls as tc (tc.callId ?? tc.name)}
									{@const result = tc.callId ? toolResultsByCallId.get(tc.callId) : undefined}
									<div
										class="rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2 text-xs"
									>
										<div class="flex items-center gap-2">
											<span class="break-all text-slate-100">{tc.label}</span>
											{#if result?.status}
												<span
													class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
													class:bg-emerald-900={result.status === 'success'}
													class:text-emerald-300={result.status === 'success'}
													class:bg-red-900={result.status === 'error'}
													class:text-red-300={result.status === 'error'}
													class:bg-slate-700={result.status !== 'success' &&
														result.status !== 'error'}
													class:text-slate-300={result.status !== 'success' &&
														result.status !== 'error'}
												>
													{result.status}
												</span>
											{:else}
												<span
													class="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300"
												>
													pending
												</span>
											{/if}
										</div>
										{#if result?.summary}
											<div class="mt-1 break-words text-slate-300">{result.summary}</div>
										{/if}
										<details>
											<summary
												class="mt-1 cursor-pointer text-[11px] text-slate-500 select-none hover:text-slate-300"
											>
												Details
											</summary>
											<div class="mt-1 font-mono text-[11px] break-all text-slate-500">
												{tc.name}
											</div>
											{#if tc.argsText}
												<pre
													class="mt-1 max-h-32 overflow-auto rounded bg-slate-900/70 p-2 font-mono text-[11px] whitespace-pre-wrap text-slate-300"
													>{tc.argsText}</pre
												>
											{/if}
										</details>
									</div>
								{/each}
							</div>
						</details>
					{/if}
				</div>
			</div>
		{/if}
	{/each}
</div>

<ImageModal show={showImageModal} imageSrc={modalImageSrc} onclose={closeImageModal} />
