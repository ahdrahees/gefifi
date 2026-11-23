import { describe, expect, test } from 'bun:test';
import { validateContractTerms } from './contracts';

describe('validateContractTerms', () => {
	test('accepts valid terms', () => {
		expect(
			validateContractTerms({
				totalAmount: 5000,
				advanceAmount: 1000,
				startDate: '2026-12-01',
				expectedCompletionDate: '2026-12-31',
				contractDate: '2026-11-23'
			})
		).toBeNull();
	});

	test('rejects advance above total', () => {
		expect(validateContractTerms({ totalAmount: 1000, advanceAmount: 5000 })).toBe(
			'Advance amount cannot be greater than the total amount.'
		);
	});

	test('rejects negative amounts', () => {
		expect(validateContractTerms({ totalAmount: -1 })).toBe(
			'Total amount must be a non-negative number.'
		);
		expect(validateContractTerms({ advanceAmount: -1 })).toBe(
			'Advance amount must be a non-negative number.'
		);
	});

	test('rejects completion before start', () => {
		expect(
			validateContractTerms({
				startDate: '2026-12-31',
				expectedCompletionDate: '2026-11-01'
			})
		).toBe('Expected completion date cannot be before the start date.');
	});

	test('rejects invalid dates', () => {
		expect(validateContractTerms({ startDate: 'not-a-date' })).toBe(
			'Start date must be a valid date.'
		);
	});
});
