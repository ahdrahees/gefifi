import { beforeEach, describe, expect, it } from 'vitest';
import { sessionEventsState, updateSessionEventsState } from './agent.svelte';

const approvalEvent = {
	id: 'event-approval',
	invocationId: 'inv-1',
	author: 'customer_agent',
	content: {
		parts: [
			{
				functionResponse: {
					id: 'call-1',
					name: 'create_expert_request',
					response: { approval: { id: 'approval-1', title: 'Create work request' } }
				}
			}
		]
	}
};

describe('agent event merge', () => {
	beforeEach(() => {
		sessionEventsState['session-1'] = [];
	});

	it('keeps the approval function response when the final text arrives', () => {
		updateSessionEventsState('session-1', approvalEvent as any);
		updateSessionEventsState('session-1', {
			id: 'event-text',
			invocationId: 'inv-1',
			author: 'customer_agent',
			partial: false,
			content: { parts: [{ text: 'Review the card and press Confirm.' }] }
		} as any);

		const events = sessionEventsState['session-1'];
		expect(events).toHaveLength(2);
		expect(events[0].content?.parts?.some((part) => part.functionResponse)).toBe(true);
		expect(events[1].content?.parts?.some((part) => part.text === 'Review the card and press Confirm.')).toBe(true);
	});

	it('does not lose the approval response when streaming partial text', () => {
		updateSessionEventsState('session-1', approvalEvent as any);
		updateSessionEventsState('session-1', {
			id: 'event-text',
			invocationId: 'inv-1',
			author: 'customer_agent',
			partial: true,
			content: { parts: [{ text: 'Review' }] }
		} as any);
		updateSessionEventsState('session-1', {
			id: 'event-text',
			invocationId: 'inv-1',
			author: 'customer_agent',
			partial: false,
			content: { parts: [{ text: 'Review the card.' }] }
		} as any);

		const events = sessionEventsState['session-1'];
		expect(events).toHaveLength(2);
		expect(events[0].content?.parts?.some((part) => part.functionResponse)).toBe(true);
		expect(
			events[1].content?.parts?.filter((part) => part.text).map((part) => part.text)
		).toEqual(['Review the card.']);
	});
});
