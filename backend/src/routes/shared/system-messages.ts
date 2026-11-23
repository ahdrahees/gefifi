import crypto from 'crypto';
import { FirestoreCollection } from '../../data';
import { Chat, Message } from '../../interfaces';

const chatsDB = new FirestoreCollection<Chat>('chats');

// --- Helper: Send System Message to a Chat ---
export async function sendSystemMessage(
	participant1Id: string,
	participant2Id: string,
	messageContent: string,
	entityIds?: {
		contractId?: string;
		ExpertRequestId?: string;
		MaterialRequestId?: string;
		workRequestId?: string;
		materialRequestId?: string;
	}
) {
	try {
		const allChats = await chatsDB.getAll();
		const participantChats = allChats.filter(
			(chat: Chat) =>
				chat.participants.length === 2 &&
				chat.participants.includes(participant1Id) &&
				chat.participants.includes(participant2Id)
		);
		// Prefer the conversation attached to this specific request. Multiple
		// chats can exist between the same two people.
		const requestChat = participantChats.find(
			(chat: Chat) =>
				(entityIds?.workRequestId && chat.workRequestId === entityIds.workRequestId) ||
				(entityIds?.materialRequestId && chat.materialRequestId === entityIds.materialRequestId)
		);
		const relevantChat = requestChat ?? participantChats[0];

		if (relevantChat) {
			const now = new Date().toISOString();
			const messageId = crypto.randomUUID();
			const definedEntityIds = Object.fromEntries(
				Object.entries(entityIds ?? {}).filter(([, value]) => value !== undefined)
			);
			const notificationMessage: Message = {
				id: messageId,
				senderId: 'system',
				content: `[System] ${messageContent}`,
				timestamp: now,
				...definedEntityIds // Firestore rejects undefined field values
			};
			await chatsDB.createInSubcollection(relevantChat.id, 'messages', notificationMessage);
			await chatsDB.update(relevantChat.id, { updatedAt: now });
			console.log(`[System Message] Sent notification to chat ${relevantChat.id}`);
		} else {
			console.warn(
				`[System Message] Could not find a chat between ${participant1Id} and ${participant2Id} to send notification.`
			);
		}
	} catch (error) {
		console.error('[System Message] Failed to send chat notification:', error);
	}
}
