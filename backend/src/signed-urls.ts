import type { NextFunction, Request, Response } from 'express';
import { getSignedAttachmentUrl, toCanonicalStorageUrl } from './file-storage';

const MAX_STRING_LENGTH = 4096;

function mightBeObjectUrl(value: string): boolean {
	if (value.length > MAX_STRING_LENGTH) return false;
	return (
		value.includes('storage.googleapis.com') ||
		/^(attachments|chat-attachments)\/[^/]+\/[^/]+\//.test(value) ||
		/^users\/[^/]+\/avatar\//.test(value) ||
		/^[0-9]+-[a-f0-9]+\.[a-z0-9]{1,10}$/i.test(value)
	);
}

async function rewriteValue(value: unknown): Promise<unknown> {
	if (typeof value === 'string') {
		if (!mightBeObjectUrl(value)) return value;
		try {
			return (await getSignedAttachmentUrl(value)) ?? value;
		} catch (error) {
			console.error('[SignedUrls] Failed to sign attachment URL:', error);
			return value;
		}
	}
	if (Array.isArray(value)) {
		return Promise.all(value.map((item) => rewriteValue(item)));
	}
	if (value && typeof value === 'object') {
		const entries = await Promise.all(
			Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [
				key,
				await rewriteValue(item)
			])
		);
		return Object.fromEntries(entries);
	}
	return value;
}

function normalizeValue(value: unknown): unknown {
	if (typeof value === 'string') {
		if (!mightBeObjectUrl(value)) return value;
		return toCanonicalStorageUrl(value) ?? value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => normalizeValue(item));
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [
				key,
				normalizeValue(item)
			])
		);
	}
	return value;
}

/**
 * Removes signed query strings from storage URLs in JSON mutation bodies.
 * The app stores the stable public URL and signs again when reading.
 */
export function normalizeStorageRequestUrls(req: Request, res: Response, next: NextFunction): void {
	const isJson = req.is('application/json') || req.is('application/x-www-form-urlencoded');
	if (req.method === 'GET' || !req.body || !isJson) {
		next();
		return;
	}
	// The signing endpoint needs the exact keys the client sent so it can
	// return a map keyed by those values.
	if (req.originalUrl.split('?')[0].endsWith('/attachments/sign')) {
		next();
		return;
	}
	req.body = normalizeValue(req.body);
	next();
}

/**
 * Rewrites storage URLs in successful GET responses to short-lived signed
 * URLs. Mutations are skipped so upload responses keep the stable object URLs
 * that the client sends back when creating or editing records.
 */
export function secureResponseUrls(req: Request, res: Response, next: NextFunction): void {
	if (req.method !== 'GET') {
		next();
		return;
	}

	const originalJson = res.json.bind(res);
	let alreadyHandled = false;

	res.json = ((body: unknown) => {
		if (alreadyHandled) return res;
		alreadyHandled = true;
		rewriteValue(body)
			.then((rewritten) => originalJson(rewritten))
			.catch((error) => {
				console.error('[SignedUrls] Failed to rewrite response:', error);
				if (!res.headersSent) {
					originalJson(body);
				} else {
					res.end();
				}
			});
		return res;
	}) as Response['json'];

	next();
}
