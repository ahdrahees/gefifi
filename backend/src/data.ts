// gefifi-2/backend/src/data.ts
import { Firestore } from '@google-cloud/firestore';
import type { User, WorkRequest, Chat, Contract, MaterialRequest } from './interfaces';

// --- Lazy Initializer for Firestore Client ---

let firestore: Firestore | null = null;

/**
 * Gets a singleton instance of the Firestore client.
 * Initializes the client on the first call.
 * This "lazy initialization" is crucial for environments like Cloud Run
 * where the application might start before environment variables are fully available.
 * @returns The Firestore client instance.
 */
function getFirestoreClient(): Firestore {
	if (!firestore) {
		console.log('[Firestore] Client not initialized. Creating new instance...');

		const options: { projectId?: string; host?: string; port?: number; ssl?: boolean } = {
			projectId: process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
		};

		// If running in a development environment and the Firestore emulator host is set,
		// connect to the emulator instead of the production database.
		if (process.env.NODE_ENV !== 'production' && process.env.FIRESTORE_EMULATOR_HOST) {
			const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
			const port = parseInt(portStr, 10);

			options.host = host;
			options.port = port;
			options.ssl = false; // Use http for emulator connection

			console.log(`[Firestore] Connecting to Firestore Emulator at ${host}:${port}`);
		}

		firestore = new Firestore(options);
		console.log('[Firestore] Client instance created successfully.');
	}
	return firestore;
}

// Define collection names for type safety and easy management.
const COLLECTIONS = {
	USERS: 'users',
	WORK_REQUESTS: 'workRequests',
	MATERIAL_REQUESTS: 'materialRequests',
	CHATS: 'chats',
	MESSAGES: 'messages',
	CONTRACTS: 'contracts'
};

// Generic type for our data items, ensuring they all have an ID.
export interface Identifiable {
	id: string;
}

/**
 * A generic class for handling CRUD operations for a specific Firestore collection.
 * This replaces the SimpleDB class and provides a consistent API for data access.
 */
export class FirestoreCollection<T extends Identifiable> {
	private collectionName: string;

	constructor(collectionName: string) {
		this.collectionName = collectionName;
		// No client initialization here anymore.
	}

	/**
	 * Lazily gets the Firestore collection reference.
	 */
	private get collection() {
		return getFirestoreClient().collection(this.collectionName);
	}

	/**
	 * Creates a new document in a subcollection.
	 * @param parentDocId The ID of the parent document
	 * @param subcollectionName The name of the subcollection
	 * @param item The data to create. Must include a unique 'id' property.
	 * @returns A promise that resolves to the created item.
	 */
	public async createInSubcollection<S extends Identifiable>(
		parentDocId: string,
		subcollectionName: string,
		item: S
	): Promise<S> {
		if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
			throw new Error('Item must have a non-empty string id to be created.');
		}
		const docRef = this.collection.doc(parentDocId).collection(subcollectionName).doc(item.id);
		await docRef.set(item);
		return item;
	}

	/**
	 * Retrieves all documents from a subcollection.
	 * @param parentDocId The ID of the parent document
	 * @param subcollectionName The name of the subcollection
	 * @returns A promise that resolves to an array of all documents in the subcollection.
	 */
	public async getAllFromSubcollection<S extends Identifiable>(
		parentDocId: string,
		subcollectionName: string
	): Promise<S[]> {
		const snapshot = await this.collection.doc(parentDocId).collection(subcollectionName).get();
		if (snapshot.empty) {
			return [];
		}
		return snapshot.docs.map((doc) => doc.data() as S);
	}

	/**
	 * Finds a document by its unique ID in a subcollection.
	 * @param parentDocId The ID of the parent document
	 * @param subcollectionName The name of the subcollection
	 * @param id The ID of the document to find.
	 * @returns A promise that resolves to the document data, or undefined if not found.
	 */
	public async findByIdInSubcollection<S extends Identifiable>(
		parentDocId: string,
		subcollectionName: string,
		id: string
	): Promise<S | undefined> {
		const docRef = this.collection.doc(parentDocId).collection(subcollectionName).doc(id);
		const doc = await docRef.get();
		if (!doc.exists) {
			return undefined;
		}
		return doc.data() as S;
	}

	/**
	 * Retrieves all documents from the collection.
	 * @returns A promise that resolves to an array of all documents.
	 */
	public async getAll(): Promise<T[]> {
		const snapshot = await this.collection.get();
		if (snapshot.empty) {
			return [];
		}
		return snapshot.docs.map((doc) => doc.data() as T);
	}

	/**
	 * Finds a document by its unique ID.
	 * @param id The ID of the document to find.
	 * @returns A promise that resolves to the document data, or undefined if not found.
	 */
	public async findById(id: string): Promise<T | undefined> {
		const docRef = this.collection.doc(id);
		const doc = await docRef.get();
		if (!doc.exists) {
			return undefined;
		}
		return doc.data() as T;
	}

	/**
	 * Fetches multiple documents by their unique IDs.
	 * Firestore's `in` query is limited to 30 items per query. This handles larger arrays by batching.
	 * @param ids An array of document IDs to fetch.
	 * @returns A promise that resolves to an array of found documents.
	 */
	public async getByIds(ids: string[]): Promise<T[]> {
		if (!ids || ids.length === 0) {
			return [];
		}

		// Firestore 'in' query limit is 30. We chunk the requests to handle any size array.
		const chunks: string[][] = [];
		for (let i = 0; i < ids.length; i += 30) {
			chunks.push(ids.slice(i, i + 30));
		}

		const results: T[] = [];
		for (const chunk of chunks) {
			if (chunk.length > 0) {
				const snapshot = await this.collection.where('id', 'in', chunk).get();
				if (!snapshot.empty) {
					snapshot.docs.forEach((doc) => {
						results.push(doc.data() as T);
					});
				}
			}
		}

		return results;
	}

	/**
	 * Creates a new document in the collection. The item's ID will be used as the document ID.
	 * @param item The data to create. Must include a unique 'id' property.
	 * @returns A promise that resolves to the created item.
	 */
	public async create(item: T): Promise<T> {
		if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
			throw new Error('Item must have a non-empty string id to be created.');
		}
		const docRef = this.collection.doc(item.id);
		await docRef.set(item);
		return item;
	}

	/**
	 * Updates a document with new data.
	 * @param id The ID of the document to update.
	 * @param dataToUpdate A partial object containing the fields to update.
	 * @returns A promise that resolves to the updated document data, or null if not found.
	 */
	public async update(id: string, dataToUpdate: Partial<Omit<T, 'id'>>): Promise<T | null> {
		const docRef = this.collection.doc(id);
		const doc = await docRef.get();

		if (!doc.exists) {
			return null; // Item not found
		}

		// The 'merge: true' option ensures we only update the fields provided
		// and don't overwrite the entire document.
		await docRef.set(dataToUpdate, { merge: true });

		// Return the full, updated document
		const updatedDoc = await docRef.get();
		return updatedDoc.data() as T;
	}

	/**
	 * Deletes a document from the collection by its ID.
	 * @param id The ID of the document to delete.
	 * @returns A promise that resolves to true if deletion was successful, false if not found.
	 */
	public async delete(id: string): Promise<boolean> {
		const docRef = this.collection.doc(id);
		const doc = await docRef.get();

		if (!doc.exists) {
			return false; // Item not found
		}
		await docRef.delete();
		return true;
	}
}

// Export pre-configured instances for each collection with their specific types.
// This provides type safety when using these handlers throughout the application.
export const usersDB = new FirestoreCollection<User>(COLLECTIONS.USERS);
export const workRequestsDB = new FirestoreCollection<WorkRequest>(COLLECTIONS.WORK_REQUESTS);
export const materialRequestsDB = new FirestoreCollection<MaterialRequest>(
	COLLECTIONS.MATERIAL_REQUESTS
);
export const chatsDB = new FirestoreCollection<Chat>(COLLECTIONS.CHATS);
// messagesDB removed - messages are now stored in subcollections under chats
export const contractsDB = new FirestoreCollection<Contract>(COLLECTIONS.CONTRACTS);

console.log('[Firestore] Data handlers configured with lazy initialization.');
