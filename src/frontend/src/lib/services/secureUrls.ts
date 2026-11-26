import apiClient from '$lib/api';
import type { Message } from '$lib/types';

const CACHE_MS = 50 * 60 * 1000;
const MAX_BATCH = 100;
const cache = new Map<string, { url: string; expiresAt: number }>();

export function isGcsUrl(url: string | undefined): boolean {
	if (!url) return false;
	return (
		url.includes('storage.googleapis.com/') ||
		/^(attachments|chat-attachments)\/[^/]+\/[^/]+\//.test(url) ||
		/^users\/[^/]+\/avatar\//.test(url) ||
		/^[0-9]+-[a-f0-9]+\.[a-z0-9]{1,10}$/i.test(url)
	);
}

/**
 * Resolves storage URLs to short-lived signed URLs. Used for media read
 * directly from Firestore, which never passes through the API response
 * rewriter. Results are cached in memory for the tab.
 */
export async function secureUrls(urls: string[]): Promise<Record<string, string>> {
	const now = Date.now();
	const result: Record<string, string> = {};
	const missing: string[] = [];

	for (const url of new Set(urls.filter(isGcsUrl))) {
		const cached = cache.get(url);
		if (cached && cached.expiresAt > now) {
			result[url] = cached.url;
		} else {
			missing.push(url);
		}
	}

	for (let offset = 0; offset < missing.length; offset += MAX_BATCH) {
		const batch = missing.slice(offset, offset + MAX_BATCH);
		try {
			const response = await apiClient.signAttachmentUrls(batch);
			for (const url of batch) {
				const signed = response.urls?.[url] ?? url;
				result[url] = signed;
				if (signed !== url) {
					cache.set(url, { url: signed, expiresAt: now + CACHE_MS });
				}
			}
		} catch (error) {
			console.error('[SecureUrls] Failed to sign attachment URLs:', error);
			for (const url of batch) result[url] = url;
		}
	}

	return result;
}

export function applySignedUrlsToMessages(
	messages: Message[],
	signed: Record<string, string>
): void {
	for (const message of messages) {
		if (Array.isArray(message.images)) {
			message.images = message.images.map((url) => signed[url] ?? url);
		}
		if (Array.isArray(message.attachments)) {
			message.attachments = message.attachments.map((attachment) => ({
				...attachment,
				filePath: signed[attachment.filePath] ?? attachment.filePath
			}));
		}
	}
}

export async function secureMessageUrls(messages: Message[]): Promise<void> {
	const urls: string[] = [];
	for (const message of messages) {
		if (Array.isArray(message.images)) urls.push(...message.images);
		for (const attachment of message.attachments ?? []) urls.push(attachment.filePath);
	}
	if (!urls.length) return;
	const signed = await secureUrls(urls);
	applySignedUrlsToMessages(messages, signed);
}
