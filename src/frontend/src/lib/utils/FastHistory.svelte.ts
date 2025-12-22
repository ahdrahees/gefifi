/**
 * Example Usage:
 *
 * ```typescript
 * const history = new FastHistory<string>();
 *
 * // 1. Add items (Huge list)
 * // This is extremely fast, even with millions of items.
 * history.add("First Event");
 * history.add("Second Event");
 * history.add("Latest Event");
 *
 * // 2. Display them (Looping)
 * // This prints: "Latest Event", "Second Event", "First Event"
 * for (const item of history.iterator()) {
 *   console.log(item);
 * }
 *
 * // 3. Access specific index
 * // 0 is always the newest item
 * console.log(history.get(0)); // Output: "Latest Event"
 * ```
 */
export class FastHistory<T> {
	// We store items in insertion order (Oldest -> Newest)
	// This keeps the array operations O(1)
	private _data: T[] = $state([]);

	/**
	 * Adds an item to the "top" of the history logically.
	 * Internally, it appends to the end for performance.
	 * Time Complexity: O(1)
	 */
	add(item: T): void {
		this._data.push(item);
	}

	/**
	 * Gets an item based on its logical position (0 is the newest).
	 * @param index The logical index (position) of the item to retrieve (0, 1, 2, ...).
	 * @returns The item of type T, or undefined if the index is out of bounds.
	 */
	get(index: number): T | undefined {
		// We map the logical index (0, 1, 2, ...) to the physical index
		// starting from the end of the array.
		const realIndex = this._data.length - 1 - index;

		// Check bounds before accessing
		if (realIndex < 0 || realIndex >= this._data.length) {
			return undefined;
		}

		return this._data[realIndex];
	}

	/**
	 * Returns a generator to iterate from Newest -> Oldest
	 * efficiently without creating a new array.
	 */
	iterator(): Generator<T> {
		return this[Symbol.iterator]();
	}

	/**
	 * Allows direct iteration (e.g. for (const x of history)) newest first.
	 */
	*[Symbol.iterator](): Generator<T> {
		for (let i = this._data.length - 1; i >= 0; i--) {
			yield this._data[i];
		}
	}

	// /**
	//  * Returns a generator to iterate from Newest -> Oldest
	//  * efficiently without creating a new array.
	//  */
	// *iterator(): Generator<T> {
	// 	for (let i = this._data.length - 1; i >= 0; i--) {
	// 		yield this._data[i];
	// 	}
	// }

	get length(): number {
		return this._data.length;
	}
}
