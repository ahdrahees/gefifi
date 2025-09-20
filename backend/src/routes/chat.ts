import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { Chat, Message, User, WorkRequest, MaterialRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { getSignedAudioUrl } from '../file-storage';
import { chatFileUpload } from './shared/middleware';
import crypto from 'crypto';

// Initialize databases
const chatsDB = new FirestoreCollection<Chat>('chats');
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');

const router = Router();

// --- Chat Endpoints ---
router.get('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const allChats = await chatsDB.getAll();
        const userChats = allChats.filter((chat: Chat) => chat.participants.includes(user.id));

        // Enrich each chat with its last message
        const enrichedChats = await Promise.all(
            userChats.map(async (chat) => {
                const messages = await chatsDB.getAllFromSubcollection<Message>(chat.id, 'messages');

                let lastMessage = null;
                if (messages.length > 0) {
                    // Sort messages by timestamp descending to find the most recent one
                    messages.sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    const latestMessage = messages[0];
                    lastMessage = {
                        id: latestMessage.id,
                        content: latestMessage.content,
                        timestamp: latestMessage.timestamp,
                        senderId: latestMessage.senderId
                    };
                }

                return {
                    ...chat,
                    lastMessage: lastMessage
                };
            })
        );

        enrichedChats.sort(
            (a: any, b: any) =>
                new Date(b.updatedAt || b.createdAt).getTime() -
                new Date(a.updatedAt || a.createdAt).getTime()
        );

        res.status(200).json(enrichedChats);
    } catch (error: unknown) {
        console.error('Error fetching user chats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch chats.', error: errorMessage });
    }
});

router.post('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const { participantIds, workRequestId, initialMessageContent } = req.body;

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res
                .status(400)
                .json({ message: 'Participant IDs array is required and must not be empty.' });
        }
        const allParticipantIds = [...new Set([user.id, ...participantIds])].sort();
        if (allParticipantIds.length < 2) {
            return res.status(400).json({ message: 'A chat requires at least two unique participants.' });
        }
        for (const pId of allParticipantIds) {
            const participantUser = await usersDB.findById(pId);
            if (!participantUser || !participantUser.isActive) {
                return res
                    .status(404)
                    .json({ message: `Participant with ID ${pId} not found or is inactive.` });
            }
        }
        const allChats = await chatsDB.getAll();
        const existingChat = allChats.find(
            (c: Chat) =>
                c.participants.length === allParticipantIds.length &&
                c.participants.every((p: string) => allParticipantIds.includes(p)) &&
                c.workRequestId === workRequestId
        );
        if (existingChat) {
            return res.status(200).json({
                message: 'Chat with these participants (and work request, if specified) already exists.',
                chat: existingChat
            });
        }
        const now = new Date().toISOString();
        const chatId = crypto.randomUUID();
        const newChatData: Chat = {
            id: chatId,
            participants: allParticipantIds,
            workRequestId: workRequestId,
            createdAt: now,
            updatedAt: now
        };
        const createdChat = await chatsDB.create(newChatData);
        if (
            initialMessageContent &&
            typeof initialMessageContent === 'string' &&
            initialMessageContent.trim() !== ''
        ) {
            const messageId = crypto.randomUUID();
            const initialMessage: Message = {
                id: messageId,
                senderId: user.id,
                content: initialMessageContent,
                timestamp: now
            };
            await chatsDB.createInSubcollection(createdChat.id, 'messages', initialMessage);
        }
        res.status(201).json(createdChat);
    } catch (error: unknown) {
        console.error('Error creating chat:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to create chat.', error: errorMessage });
    }
});

// --- GET Chat by ID ---
router.get('/chat/:chatId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const chatId = req.params.chatId;

        const chat = await chatsDB.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        if (!chat.participants.includes(user.id)) {
            return res
                .status(403)
                .json({ message: 'Forbidden. You are not a participant of this chat.' });
        }

        res.status(200).json(chat);
    } catch (error: unknown) {
        console.error(`Error fetching chat ${req.params.chatId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch chat details.', error: errorMessage });
    }
});

router.post(
    '/chat/:chatId/messages',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const chatId = req.params.chatId;
            // Destructure content, images, attachments, and voice message data from request body
            const {
                content,
                images,
                attachments,
                audioType,
                audioUrl,
                audioDuration,
                messageId
            }: {
                content?: string;
                images?: string[];
                attachments?: Array<{
                    fileName: string;
                    filePath: string;
                    fileType: string;
                    size: number;
                }>;
                audioType?: 'voice';
                audioUrl?: string;
                audioDuration?: number;
                messageId?: string;
            } = req.body;

            // Validate that either content, images, attachments, or voice message are provided and correctly formatted
            const hasValidContent = content && typeof content === 'string' && content.trim() !== '';
            const hasValidImages =
                images &&
                Array.isArray(images) &&
                images.length > 0 &&
                images.every((img: string) => typeof img === 'string');
            const hasValidAttachments =
                attachments &&
                Array.isArray(attachments) &&
                attachments.length > 0 &&
                attachments.every((att: any) =>
                    att &&
                    typeof att.fileName === 'string' &&
                    typeof att.filePath === 'string' &&
                    typeof att.fileType === 'string' &&
                    typeof att.size === 'number'
                );
            const hasValidVoiceMessage =
                audioType === 'voice' &&
                audioUrl &&
                typeof audioUrl === 'string' &&
                audioUrl.trim() !== '' &&
                audioDuration &&
                typeof audioDuration === 'number' &&
                audioDuration > 0;

            if (!hasValidContent && !hasValidImages && !hasValidAttachments && !hasValidVoiceMessage) {
                return res
                    .status(400)
                    .json({ message: 'Message content, images, attachments, or voice message are required.' });
            }
            // If images are provided, but not in the correct format (e.g. not an array of strings)
            if (images && Array.isArray(images) && images.length > 0 && !hasValidImages) {
                return res.status(400).json({
                    message:
                        'Images must be an array of strings (file paths) and cannot be empty strings if the array is not empty.'
                });
            }
            // If attachments are provided, but not in the correct format
            if (attachments && Array.isArray(attachments) && attachments.length > 0 && !hasValidAttachments) {
                return res.status(400).json({
                    message:
                        'Attachments must be an array of objects with fileName, filePath, fileType, and size properties.'
                });
            }
            // Further check for empty strings within the images array if it's not empty.
            // This is implicitly handled by `images.every(img => typeof img === 'string')` if we assume file paths must be non-empty.
            // If paths can be empty strings and that's invalid, a more specific check might be needed,
            // but typically file paths from an upload process won't be empty strings.
            const chat = await chatsDB.findById(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found.' });
            }
            if (!chat.participants.includes(user.id)) {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. You are not a participant of this chat.' });
            }
            const now = new Date().toISOString();
            const finalMessageId = messageId || crypto.randomUUID();
            console.log('🔍 [DEBUG] Message creation - messageId from body:', messageId, 'finalMessageId:', finalMessageId);
            const newMessage: Message = {
                id: finalMessageId,
                senderId: user.id,
                content: content || '', // Use provided content, or empty string if only images/attachments/voice are sent
                images: images && hasValidImages ? images : [], // Use validated images, or an empty array
                attachments: attachments && hasValidAttachments ? attachments : [], // Use validated attachments, or an empty array
                timestamp: now,
                // Add voice message fields if present
                ...(hasValidVoiceMessage && {
                    audioType: audioType,
                    audioUrl: audioUrl,
                    audioDuration: audioDuration
                })
            };
            const createdMessage = await chatsDB.createInSubcollection(chatId, 'messages', newMessage);
            await chatsDB.update(chatId, { updatedAt: now });
            res.status(201).json(createdMessage);
        } catch (error: unknown) {
            console.error('Error sending message:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to send message.', error: errorMessage });
        }
    }
);

router.get(
    '/chat/:chatId/messages',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const chatId = req.params.chatId;
            const chat = await chatsDB.findById(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found.' });
            }
            if (!chat.participants.includes(user.id)) {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. You are not a participant of this chat.' });
            }

            // Get messages from subcollection with pagination (last 50 messages)
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            try {
                const allMessages = await chatsDB.getAllFromSubcollection<Message>(chatId, 'messages');
                const sortedMessages = allMessages.sort(
                    (a: Message, b: Message) =>
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );

                // Apply pagination
                const paginatedMessages = sortedMessages.slice(offset, offset + limit);

                // Generate signed URLs for voice messages
                const messagesWithSignedUrls = await Promise.all(
                    paginatedMessages.map(async (message) => {
                        if (message.audioType === 'voice' && message.audioUrl) {
                            try {
                                const signedUrl = await getSignedAudioUrl(message.audioUrl, 15);
                                return {
                                    ...message,
                                    signedAudioUrl: signedUrl
                                };
                            } catch (error) {
                                console.error(`Failed to generate signed URL for message ${message.id}:`, error);
                                return message; // Return message without signed URL if generation fails
                            }
                        }
                        return message;
                    })
                );

                res.status(200).json({
                    messages: messagesWithSignedUrls,
                    totalCount: sortedMessages.length,
                    hasMore: offset + limit < sortedMessages.length
                });
            } catch (subcollectionError: unknown) {
                // Handle case where messages subcollection doesn't exist yet
                console.log(`Messages subcollection not found for chat ${chatId}, returning empty array`);
                console.log('Subcollection error:', subcollectionError);
                res.status(200).json({
                    messages: [],
                    totalCount: 0,
                    hasMore: false
                });
            }
        } catch (error: unknown) {
            console.error(`Error fetching messages for chat ${req.params.chatId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to fetch messages.', error: errorMessage });
        }
    }
);

export default router;
