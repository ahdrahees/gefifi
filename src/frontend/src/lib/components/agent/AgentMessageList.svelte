<script lang="ts">
	import type { AgentEvent, AgentContent, ArtifactPart } from '$lib/types/agent-api';
	import ImageModal from '$lib/components/chat/ImageModal.svelte';
	import FileAttachment from '$lib/components/chat/FileAttachment.svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

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
			// Assuming inlineData.data is base64
			return `data:${artifact.inlineData.mimeType};base64,${artifact.inlineData.data}`;
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

	function processEventContent(content: AgentContent | null | undefined) {
		const allArtifacts: Array<{ value: string; artifact: ArtifactPart }> = [];
		const allText: string[] = [];

		if (content?.parts) {
			content.parts.forEach((part) => {
				// Skip reasoning/thought parts
				if (part.thought) {
					return;
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
		return { artifacts: allArtifacts, texts: allText };
	}

	// Filter events that have displayable content (text)
	function hasDisplayableContent(event: AgentEvent): boolean {
		if (!event.content?.parts) return false;
		return event.content.parts.some(
			(part) => part.text !== null && part.text !== undefined && !part.thought
		);
	}
</script>

<div class="flex flex-col gap-6 p-4 pb-0">
	{#each events as event, evIndex (event.id ?? evIndex)}
		{#if hasDisplayableContent(event)}
			{@const isUser = event.author === 'user'}
			{@const { artifacts: msgArtifacts, texts: msgTexts } = processEventContent(event.content)}

			<div class="group/msg flex w-full {isUser ? 'justify-end' : 'justify-start'}">
				<div class="flex max-w-[85%] flex-col gap-2 sm:max-w-[75%]">
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
				</div>
			</div>
		{/if}
	{/each}
</div>

<ImageModal show={showImageModal} imageSrc={modalImageSrc} onclose={closeImageModal} />
