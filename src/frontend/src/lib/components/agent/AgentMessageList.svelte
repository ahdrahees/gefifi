<script lang="ts">
	import type { AgentContent, ArtifactPart } from '$lib/types/agent-api';
	import ImageModal from '$lib/components/chat/ImageModal.svelte';
	import FileAttachment from '$lib/components/chat/FileAttachment.svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let content: AgentContent[] = [];
	export let artifacts: Record<string, ArtifactPart> = {};

	// Configure marked
	marked.use({ breaks: true, gfm: true });

	// --- STATE ---
	let showImageModal = false;
	let modalImageSrc = '';

	function openImageModal(src: string) {
		modalImageSrc = src;
		showImageModal = true;
	}

	function closeImageModal() {
		showImageModal = false;
		modalImageSrc = '';
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

	function processMessage(msg: AgentContent) {
		const allArtifacts: Array<{ value: string; artifact: ArtifactPart }> = [];
		const allText: string[] = [];

		if (msg.parts) {
			msg.parts.forEach((part) => {
				if (part.text) {
					const parsed = parseMessageParts(part.text);
					parsed.forEach((p) => {
						if (p.type === 'artifact' && p.artifact) {
							allArtifacts.push({ value: p.value, artifact: p.artifact });
						} else if (p.type === 'text') {
							allText.push(p.value);
						}
					});
				}
			});
		}
		return { artifacts: allArtifacts, texts: allText };
	}
</script>

<div class="flex flex-col gap-6 p-4 pb-0">
	{#each content as msg, i (i)}
		{#if msg.role}
			{@const isUser = msg.role === 'user'}
			{@const { artifacts: msgArtifacts, texts: msgTexts } = processMessage(msg)}

			<div class="flex w-full {isUser ? 'justify-end' : 'justify-start'}">
				<div class="flex max-w-[85%] flex-col gap-2 sm:max-w-[75%]">
					<!-- Render Artifacts First -->
					{#each msgArtifacts as p, i (i)}
						{#if isImageArtifact(p.value)}
							<!-- Image Preview -->
							{@const url = getArtifactUrl(p.artifact)}
							{#if url}
								<button
									class="max-h-[384px] max-w-[384px] overflow-hidden rounded-lg border border-slate-700 bg-slate-800 transition-opacity hover:opacity-90"
									on:click={() => openImageModal(url)}
								>
									<img src={url} alt={p.value} class="h-full w-full object-contain" />
								</button>
							{/if}
						{:else}
							<!-- Document Attachment -->
							<div class="w-full">
								<FileAttachment
									attachment={createAttachmentObject(p.value, p.artifact)}
									on:view={(e) => console.log('View file', e.detail)}
								/>
							</div>
						{/if}
					{/each}

					<!-- Render Text -->
					{#each msgTexts as textPart, i (i)}
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
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>

<ImageModal show={showImageModal} imageSrc={modalImageSrc} on:close={closeImageModal} />
