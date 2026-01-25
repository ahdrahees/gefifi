export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export type JsonArray = JsonValue[];

/**
 * Represents a JSON object, which is a collection of key-value pairs.
 * @example
 * ```
 * const example: JsonObject = {
 * 	name: 'Alice',
 * 	age: 30,
 * 	active: true,
 * 	details: {
 * 		hobbies: ['reading', 'traveling'],
 * 		location: null
 * 	},
 * 	friends: [
 * 		{
 * 			name: 'Bob',
 * 			age: 25,
 * 			active: false
 * 		},
 * 		null
 * 	]
 * };
 * ```
 */
export type JsonObject = { [key: string]: JsonValue };
