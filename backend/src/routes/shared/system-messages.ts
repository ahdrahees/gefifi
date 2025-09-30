import crypto from 'crypto';
import { FirestoreCollection } from '../../data';
import { Chat, Message } from '../../interfaces';

const chatsDB = new FirestoreCollection<Chat>('chats');

// --- Helper: Send System Message to a Chat ---
export async function sendSystemMessage(
    participant1Id: string,
    participant2Id: string,
    messageContent: string,
    entityIds?: { contractId?: string; ExpertRequestId?: string; MaterialRequestId?: string }
) {
    try {
        const allChats = await chatsDB.getAll();
        const relevantChat = allChats.find(
            (chat: Chat) =>
                chat.participants.length === 2 &&
                chat.participants.includes(participant1Id) &&
                chat.participants.includes(participant2Id)
        );

        if (relevantChat) {
            const now = new Date().toISOString();
            const messageId = crypto.randomUUID();
            const notificationMessage: Message = {
                id: messageId,
                senderId: 'system',
                content: `[System] ${messageContent}`,
                timestamp: now,
                ...entityIds // Spread the optional entity IDs
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
