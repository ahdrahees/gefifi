import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';

vi.mock('$lib/stores/auth', () => ({
	authStore: {
		subscribe: (run: (value: unknown) => void) => {
			run({
				isAuthenticated: true,
				user: { id: 'user-1' },
				token: 'test-token',
				error: null,
				isLoading: false
			});
			return () => undefined;
		}
	}
}));

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('agent approval API auth', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse({ status: 'claimed' }))
		);
	});

	it('sends the bearer token when claiming an approval', async () => {
		await apiClient.claimAgentApproval('approval-1', 'claim-token-1', 'work_request');

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
	});

	it('sends the bearer token when completing an approval', async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ status: 'completed' }));

		await apiClient.completeAgentApproval('approval-1', 'claim-token-1', '/home', 'Done');

		const fetchMock = vi.mocked(fetch);
		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
	});

	it('sends the bearer token when releasing an approval', async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ released: true }));

		await apiClient.releaseAgentApproval('approval-1', 'claim-token-1');

		const fetchMock = vi.mocked(fetch);
		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
	});
});
