/**
 * Represents a fixed-size circular buffer (or ring buffer).
 * Elements are added to the buffer, and when the buffer is full,
 * the oldest element is overwritten.
 *
 * It implements the `Iterable` interface, allowing it to be used
 * directly in `for...of` loops, iterating from the newest to the oldest element.
 *
 * @example
 * ```typescript
 * // Create a history that can hold exactly 3 items
 * const history = new CircularBuffer<string>(3);
 *
 * // Add items
 * history.add("Event 1 (Oldest)");
 * history.add("Event 2");
 * history.add("Event 3 (Newest)"); // Buffer is now full: [E1, E2, E3]
 *
 * // Add a 4th item - this overwrites "Event 1"
 * history.add("Event 4 (Latest)"); // Buffer is now: [E4, E2, E3]
 *
 * // Display (Newest to Oldest)
 * // The [Symbol.iterator] allows direct use in a loop:
 * for (const item of history) {
 *   console.log(item);
 * }
 * // Output:
 * // Event 4 (Latest)
 * // Event 3 (Newest)
 * // Event 2
 * ```
 */
class CircularBuffer<T> implements Iterable<T> {
    private data: T[];
    private head: number = 0; // Index of the oldest element
    private tail: number = 0; // Index where the next element will be placed
    private capacity: number;
    private currentSize: number = 0;

    constructor(capacity: number) {
        if (capacity < 1) throw new Error("Capacity must be at least 1.");
        this.capacity = capacity;
        this.data = new Array(capacity);
    }

    /**
     * Adds an item to the history. Overwrites the oldest item if full.
     * Time Complexity: O(1)
     */
    add(item: T): void {
        this.data[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;

        if (this.currentSize < this.capacity) {
            this.currentSize++;
        } else {
            // When full, the tail advancement means the head must also advance,
            // effectively throwing away the oldest element.
            this.head = this.tail;
        }
    }

    /**
     * Creates an iterator to display items from NEWEST to OLDEST.
     * Time Complexity: O(N) for iteration (visiting N items), but no memory copy.
     */
    *[Symbol.iterator](): Generator<T> {
        if (this.currentSize === 0) {
            return;
        }

        // Start from the index just before the tail (the newest item)
        let i = (this.tail - 1 + this.capacity) % this.capacity;
        let count = 0;

        while (count < this.currentSize) {
            yield this.data[i];

            // Move backwards, wrapping around if necessary
            i = (i - 1 + this.capacity) % this.capacity;
            count++;
        }
    }

    get size(): number {
        return this.currentSize;
    }
}


