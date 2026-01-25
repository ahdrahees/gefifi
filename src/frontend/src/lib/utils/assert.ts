export class NullishError extends Error {}

/**
 * Asserts that the value is not null or undefined.
 *
 * @param value - The value to check.
 * @param message - The error message to throw if the value is null or undefined.
 * @throws {NullishError} If the value is null or undefined.
 */
export const assertNonNullish: <T>(
	value: T,
	message?: string
) => asserts value is NonNullable<T> = <T>(value: T, message?: string): void => {
	if (value === null || value === undefined) {
		throw new NullishError(message);
	}
};

/**
 * Asserts that the condition is truthy.
 *
 * @param condition - The condition to check.
 * @param message - The error message to throw if the condition is falsy.
 * @throws {Error} If the condition is falsy.
 */
export const assert: (condition: unknown, message?: string) => asserts condition = (
	condition: unknown,
	message?: string
): void => {
	if (!condition) {
		throw new Error(message ?? 'Assertion failed');
	}
};
