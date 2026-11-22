import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentApprovalCard from './AgentApprovalCard.svelte';
import apiClient from '$lib/api';

vi.mock('$lib/api', () => ({
	default: {
		createWorkRequest: vi.fn(),
		createMaterialRequest: vi.fn(),
		createContract: vi.fn(),
		sendChatMessage: vi.fn(),
		updateQuoteStatus: vi.fn(),
		uploadFile: vi.fn(),
		uploadEntityAttachments: vi.fn()
	}
}));

const approval = {
	id: 'approval-1',
	action: 'work_request' as const,
	title: 'Create work request',
	summary: ['Bathroom leak', 'HSR Layout', 'Plumbing'],
	payload: {
		title: 'Bathroom leak',
		description: 'Leak under the washbasin',
		location: 'HSR Layout',
		category: 'Plumbing',
		images: []
	},
	attachments: [],
	payload_hash: 'abc123'
};

const quoteApproval = {
	id: 'approval-quote',
	action: 'quote_accept' as const,
	title: 'Accept quote',
	summary: ['Bathroom fittings', 'Ganesh', '₹12000'],
	payload: {
		quoteId: 'quote-1',
		quoteTitle: 'Bathroom fittings',
		amount: 12000,
		providerName: 'Ganesh',
		requestId: 'request-1',
		requestType: 'work'
	},
	attachments: [],
	payload_hash: 'def456'
};

describe('AgentApprovalCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		vi.mocked(apiClient.createWorkRequest).mockResolvedValue({
			id: 'request-1',
			status: 'open',
			createdAt: '2026-11-22T00:00:00.000Z'
		});
	});

	it('does not create anything until the human presses Confirm', async () => {
		render(AgentApprovalCard, { approval, artifacts: {} });

		expect(apiClient.createWorkRequest).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Create request' }));

		await waitFor(() => {
			expect(apiClient.createWorkRequest).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Bathroom leak' })
			);
		});
	});

	it('shows the confirmed state after a successful create', async () => {
		render(AgentApprovalCard, { approval, artifacts: {} });

		await fireEvent.click(screen.getByRole('button', { name: 'Create request' }));

		await waitFor(() => {
			expect(screen.getByText('Request created')).toBeTruthy();
		});
	});

	it('accepts a quote only after the human presses Accept', async () => {
		vi.mocked(apiClient.updateQuoteStatus).mockResolvedValue({});

		render(AgentApprovalCard, { approval: quoteApproval, artifacts: {} });

		expect(apiClient.updateQuoteStatus).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Accept quote' }));

		await waitFor(() => {
			expect(apiClient.updateQuoteStatus).toHaveBeenCalledWith('quote-1', 'accepted');
			expect(screen.getByText('Quote accepted')).toBeTruthy();
		});
	});
});
