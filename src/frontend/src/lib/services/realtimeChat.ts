// gefifi-2/src/frontend/src/lib/services/realtimeChat.ts

import {
	collection,
	query,
	orderBy,
	limit,
	onSnapshot,
	startAfter,
	type DocumentSnapshot,
	type Unsubscribe,
	doc,
	setDoc,
	deleteDoc,
	serverTimestamp,
	where,
	type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from '$lib/firebase';
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
		console.log('[RealtimeChat] Setting up message subscription for chat:', chatId);
		console.log(
			'[RealtimeChat] Firebase Auth current user:',
			auth.currentUser?.uid || 'Not authenticated'
		);

		const messagesRef = collection(db, `chats/${chatId}/messages`);
		const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(messageLimit));

		return onSnapshot(
			messagesQuery,
			(snapshot) => {
				console.log('[RealtimeChat] Message snapshot received, count:', snapshot.size);
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
				console.error(
					'[RealtimeChat] Firebase Auth status:',
					auth.currentUser?.uid || 'Not authenticated'
				);
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
			const lastMessageDoc = doc(db, `chats/${chatId}/messages`, lastMessage.id);

			// Get the document snapshot for pagination
			const lastDocSnapshot = await import('firebase/firestore').then(({ getDoc }) =>
				getDoc(lastMessageDoc)
			);

			if (!lastDocSnapshot.exists()) {
				callback([]);
				return;
			}

			const olderMessagesQuery = query(
				messagesRef,
				orderBy('timestamp', 'desc'),
				startAfter(lastDocSnapshot),
				limit(messageLimit)
			);

			const { getDocs } = await import('firebase/firestore');
			const snapshot = await getDocs(olderMessagesQuery);

			const olderMessages: Message[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				olderMessages.push({
					id: doc.id,
					...data,
					timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
				} as Message);
			});

			// Reverse to maintain chronological order
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
			(snapshot) => {
				const chats: Chat[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					chats.push({
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
						updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
					} as Chat);
				});

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
		console.log('[RealtimeChat] Setting user online:', userId);
		console.log(
			'[RealtimeChat] Firebase Auth current user:',
			auth.currentUser?.uid || 'Not authenticated'
		);

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

			console.log('[RealtimeChat] User presence set successfully');
			// Start heartbeat to maintain online status
			this.startPresenceHeartbeat(userId);
		} catch (error) {
			console.error('[RealtimeChat] Error setting user online:', error);
			console.error(
				'[RealtimeChat] Firebase Auth status:',
				auth.currentUser?.uid || 'Not authenticated'
			);
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
