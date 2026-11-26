import { describe, expect, it } from 'bun:test';

process.env.GCS_BUCKET_NAME = 'test-bucket';

const { extractMainBucketObjectPath } = await import('./file-storage');

describe('extractMainBucketObjectPath', () => {
	it('extracts paths from public URLs', () => {
		expect(
			extractMainBucketObjectPath(
				'https://storage.googleapis.com/test-bucket/attachments/contracts/abc/file.pdf'
			)
		).toBe('attachments/contracts/abc/file.pdf');
	});

	it('extracts paths from signed URLs, ignoring query parameters', () => {
		expect(
			extractMainBucketObjectPath(
				'https://storage.googleapis.com/test-bucket/chat-attachments/chat-1/message-1/file.pdf?X-Goog-Signature=abc'
			)
		).toBe('chat-attachments/chat-1/message-1/file.pdf');
	});

	it('accepts known relative paths', () => {
		expect(extractMainBucketObjectPath('attachments/work-requests/abc/file.png')).toBe(
			'attachments/work-requests/abc/file.png'
		);
		expect(extractMainBucketObjectPath('users/user-1/avatar/file.png')).toBe(
			'users/user-1/avatar/file.png'
		);
	});

	it('does not treat ordinary prose as a storage path', () => {
		expect(extractMainBucketObjectPath('users/guide')).toBeNull();
		expect(extractMainBucketObjectPath('attachments/only-two-parts')).toBeNull();
	});

	it('ignores other buckets and hosts', () => {
		expect(
			extractMainBucketObjectPath('https://storage.googleapis.com/other-bucket/file.pdf')
		).toBeNull();
		expect(extractMainBucketObjectPath('https://example.com/test-bucket/file.pdf')).toBeNull();
	});
});
