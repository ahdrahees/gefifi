// gefifi-2/src/frontend/src/lib/services/realtimeChat.ts

import {
	collection,
	query,
	orderBy,
	limit,
	onSnapshot,
	startAfter,
	where,
	type Unsubscribe,
	doc,
	setDoc,
	deleteDoc,
	serverTimestamp
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Message, Chat } from '$lib/types';

export interface RealtimeChatService {
	// Message listeners
	subscribeToMessages(
		chatId: string,
		callback: (messages: Message[]) => void,
		messageLimit?: number
	): Unsubscribe;

	loadOlderMessages(
		chatId: string,
		lastMessage: Message,
		callback: (olderMessages: Message[]) => void,
		messageLimit?: number
	): Promise<void>;

	// Chat list listeners
	subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void): Unsubscribe;

	// Online presence
	setUserOnline(userId: string): Promise<void>;
	setUserOffline(userId: string): Promise<void>;
	subscribeToUserPresence(
		userId: string,
		callback: (isOnline: boolean, lastSeen?: Date) => void
	): Unsubscribe;

	// Typing indicators
	setTyping(chatId: string, userId: string): Promise<void>;
	clearTyping(chatId: string, userId: string): Promise<void>;
	subscribeToTyping(
		chatId: string,
		currentUserId: string,
		callback: (typingUsers: string[]) => void
	): Unsubscribe;
}

class RealtimeChatServiceImpl implements RealtimeChatService {
	private presenceHeartbeat: NodeJS.Timeout | null = null;

	/**
	 * Subscribe to real-time messages for a specific chat
	 */
	subscribeToMessages(
		chatId: string,
		callback: (messages: Message[]) => void,
		messageLimit: number = 50
	): Unsubscribe {
		const messagesRef = collection(db, `chats/${chatId}/messages`);
		const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(messageLimit));

		return onSnapshot(
			messagesQuery,
			(snapshot) => {
				const messages: Message[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					messages.push({
						id: doc.id,
						...data,
						timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
					} as Message);
				});

				// Reverse to show oldest first (UI expects this order)
				callback(messages.reverse());
			},
			(error) => {
				console.error('[RealtimeChat] Error in message subscription:', error);
				callback([]); // Return empty array on error
			}
		);
	}

	/**
	 * Load older messages for infinite scroll
	 */
	async loadOlderMessages(
		chatId: string,
		lastMessage: Message,
		callback: (olderMessages: Message[]) => void,
		messageLimit: number = 50
	): Promise<void> {
		try {
			const messagesRef = collection(db, `chats/${chatId}/messages`);
			const { getDocs, Timestamp } = await import('firebase/firestore');

			console.log(
				`[RealtimeChat] Loading older messages before: ${lastMessage.id} (${lastMessage.timestamp})`
			);

			// Use string timestamp for comparison since database stores strings
			const lastMessageTimestamp = lastMessage.timestamp;
			console.log(`[RealtimeChat] Using string timestamp for comparison:`, lastMessageTimestamp);

			// Test the timestamp comparison directly
			console.log(`[RealtimeChat] Testing timestamp comparison:`);
			console.log(`[RealtimeChat] Target timestamp (string): ${lastMessage.timestamp}`);
			console.log(`[RealtimeChat] Target timestamp (Firestore):`, lastMessageTimestamp);

			// Test query without the where clause first
			const testQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(5));
			const testSnapshot = await getDocs(testQuery);
			console.log(`[RealtimeChat] Latest 5 messages for comparison:`);
			testSnapshot.forEach((doc, index) => {
				const data = doc.data();
				const docTimestamp = data.timestamp?.toDate?.()?.toISOString() || data.timestamp;
				console.log(`  ${index + 1}. ${doc.id}: ${docTimestamp} (${typeof data.timestamp})`);
			});

			// Query for messages older than the last message using timestamp comparison
			console.log(
				`[RealtimeChat] Executing query: messages where timestamp < ${lastMessage.timestamp}`
			);
			const olderMessagesQuery = query(
				messagesRef,
				orderBy('timestamp', 'desc'),
				where('timestamp', '<', lastMessageTimestamp),
				limit(messageLimit)
			);

			// Also test a simple query to see if there are ANY older messages
			const simpleOlderQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(10));
			const simpleSnapshot = await getDocs(simpleOlderQuery);
			console.log(`[RealtimeChat] Oldest 10 messages in database:`);
			simpleSnapshot.forEach((doc, index) => {
				const data = doc.data();
				const docTimestamp = data.timestamp?.toDate?.()?.toISOString() || data.timestamp;
				const isOlder = new Date(docTimestamp) < new Date(lastMessage.timestamp);
				console.log(`  ${index + 1}. ${docTimestamp} (older than target: ${isOlder})`);
			});

			const snapshot = await getDocs(olderMessagesQuery);

			console.log(
				`[RealtimeChat] Found ${snapshot.size} older messages before ${lastMessage.timestamp}`
			);

			const olderMessages: Message[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				olderMessages.push({
					id: doc.id,
					...data,
					timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
				} as Message);
			});

			// Reverse to maintain chronological order (oldest first)
			callback(olderMessages.reverse());
		} catch (error) {
			console.error('[RealtimeChat] Error loading older messages:', error);
			callback([]);
		}
	}

	/**
	 * Subscribe to user's chat list with real-time updates
	 */
	subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void): Unsubscribe {
		const chatsRef = collection(db, 'chats');
		const userChatsQuery = query(
			chatsRef,
			where('participants', 'array-contains', userId),
			orderBy('updatedAt', 'desc')
		);

		return onSnapshot(
			userChatsQuery,
			async (snapshot) => {
				const chats: Chat[] = [];

				// Process each chat and fetch its last message
				await Promise.all(
					snapshot.docs.map(async (doc) => {
						const data = doc.data();
						const chatId = doc.id;

						// Fetch the last message for this chat
						let lastMessage = null;
						try {
							const messagesRef = collection(db, `chats/${chatId}/messages`);
							const lastMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

							const { getDocs } = await import('firebase/firestore');
							const messageSnapshot = await getDocs(lastMessageQuery);

							if (!messageSnapshot.empty) {
								const messageDoc = messageSnapshot.docs[0];
								const messageData = messageDoc.data();
								lastMessage = {
									id: messageDoc.id,
									content: messageData.content || '',
									timestamp:
										messageData.timestamp?.toDate?.()?.toISOString() || messageData.timestamp,
									senderId: messageData.senderId,
									audioType: messageData.audioType,
									images: messageData.images
								};
							}
						} catch (error) {
							console.error(
								`[RealtimeChat] Error fetching last message for chat ${chatId}:`,
								error
							);
						}

						chats.push({
							id: chatId,
							participants: data.participants || [],
							workRequestId: data.workRequestId,
							materialRequestId: data.materialRequestId,
							createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
							updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
							lastMessage
						} as Chat);
					})
				);

				// Sort chats by updatedAt (most recent first)
				chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

				callback(chats);
			},
			(error) => {
				console.error('[RealtimeChat] Error in chats subscription:', error);
				callback([]);
			}
		);
	}

	/**
	 * Set user as online and start heartbeat
	 */
	async setUserOnline(userId: string): Promise<void> {
		try {
			const presenceRef = doc(db, 'presence', userId);
			await setDoc(
				presenceRef,
				{
					isOnline: true,
					lastSeen: serverTimestamp()
				},
				{ merge: true }
			);

			// Start heartbeat to maintain online status
			this.startPresenceHeartbeat(userId);
		} catch (error) {
			console.error('[RealtimeChat] Error setting user online:', error);
		}
	}

	/**
	 * Set user as offline and stop heartbeat
	 */
	async setUserOffline(userId: string): Promise<void> {
		try {
			if (this.presenceHeartbeat) {
				clearInterval(this.presenceHeartbeat);
				this.presenceHeartbeat = null;
			}

			const presenceRef = doc(db, 'presence', userId);
			await setDoc(
				presenceRef,
				{
					isOnline: false,
					lastSeen: serverTimestamp()
				},
				{ merge: true }
			);
		} catch (error) {
			console.error('[RealtimeChat] Error setting user offline:', error);
		}
	}

	/**
	 * Subscribe to user's online presence
	 */
	subscribeToUserPresence(
		userId: string,
		callback: (isOnline: boolean, lastSeen?: Date) => void
	): Unsubscribe {
		const presenceRef = doc(db, 'presence', userId);

		return onSnapshot(
			presenceRef,
			(doc) => {
				if (doc.exists()) {
					const data = doc.data();
					const lastSeen = data.lastSeen?.toDate?.() || null;
					callback(data.isOnline || false, lastSeen);
				} else {
					callback(false);
				}
			},
			(error) => {
				console.error('[RealtimeChat] Error in presence subscription:', error);
				callback(false);
			}
		);
	}

	/**
	 * Set typing indicator for user in chat
	 */
	async setTyping(chatId: string, userId: string): Promise<void> {
		try {
			const typingRef = doc(db, `chats/${chatId}/typing`, userId);
			await setDoc(typingRef, {
				userId,
				timestamp: serverTimestamp()
			});
		} catch (error) {
			console.error('[RealtimeChat] Error setting typing indicator:', error);
		}
	}

	/**
	 * Clear typing indicator for user in chat
	 */
	async clearTyping(chatId: string, userId: string): Promise<void> {
		try {
			const typingRef = doc(db, `chats/${chatId}/typing`, userId);
			await deleteDoc(typingRef);
		} catch (error) {
			console.error('[RealtimeChat] Error clearing typing indicator:', error);
		}
	}

	/**
	 * Subscribe to typing indicators in a chat
	 */
	subscribeToTyping(
		chatId: string,
		currentUserId: string,
		callback: (typingUsers: string[]) => void
	): Unsubscribe {
		const typingRef = collection(db, `chats/${chatId}/typing`);

		return onSnapshot(
			typingRef,
			(snapshot) => {
				const typingUsers: string[] = [];
				const now = Date.now();

				snapshot.forEach((doc) => {
					const data = doc.data();
					const timestamp = data.timestamp?.toDate?.()?.getTime() || 0;

					// Only consider typing if it's within the last 3 seconds and not current user
					if (now - timestamp < 3000 && data.userId !== currentUserId) {
						typingUsers.push(data.userId);
					}
				});

				callback(typingUsers);
			},
			(error) => {
				console.error('[RealtimeChat] Error in typing subscription:', error);
				callback([]);
			}
		);
	}

	/**
	 * Start heartbeat to maintain online presence
	 */
	private startPresenceHeartbeat(userId: string): void {
		// Clear existing heartbeat
		if (this.presenceHeartbeat) {
			clearInterval(this.presenceHeartbeat);
		}

		// Update presence every 20 seconds
		this.presenceHeartbeat = setInterval(async () => {
			try {
				const presenceRef = doc(db, 'presence', userId);
				await setDoc(
					presenceRef,
					{
						isOnline: true,
						lastSeen: serverTimestamp()
					},
					{ merge: true }
				);
			} catch (error) {
				console.error('[RealtimeChat] Heartbeat error:', error);
			}
		}, 20000);
	}
}

// Export singleton instance
export const realtimeChatService = new RealtimeChatServiceImpl();
