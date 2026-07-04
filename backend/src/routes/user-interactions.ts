import { Router, Response } from 'express';
import { FirestoreCollection } from '../data';
import { User, WorkRequest, MaterialRequest, Chat, Message } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import crypto from 'crypto';

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');
const chatsDB = new FirestoreCollection<Chat>('chats');

const router = Router();

// --- User Interest Endpoint (Creates Chat & Initial Message) ---
router.post(
	'/users/interest',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const sender = req.user as JwtPayload;
			const {
				targetUserId,
				workRequestId,
				materialRequestId,
				predefinedMessageKey,
				initialMessageContent: customMessageFromBody
			} = req.body;

			if (!targetUserId) {
				return res.status(400).json({ message: 'targetUserId is required.' });
			}
			const targetUser = await usersDB.findById(targetUserId);
			if (!targetUser || !targetUser.isActive) {
				return res.status(404).json({ message: 'Target user not found or is inactive.' });
			}
			if (sender.id === targetUserId) {
				return res.status(400).json({ message: 'Cannot express interest in oneself.' });
			}

			let workRequest: WorkRequest | undefined;
			if (workRequestId) {
				workRequest = await workRequestsDB.findById(workRequestId);
				if (!workRequest) {
					return res.status(404).json({ message: 'Associated work request not found.' });
				}
			}

			let materialRequest: MaterialRequest | undefined;
			if (materialRequestId) {
				materialRequest = await materialRequestsDB.findById(materialRequestId);
				if (!materialRequest) {
					return res.status(404).json({ message: 'Associated material request not found.' });
				}
				// Check if the sender has already expressed interest
				if (
					sender.userType === 'supplier' &&
					materialRequest.interestedSuppliers?.includes(sender.id)
				) {
					return res
						.status(409) // 409 Conflict is a good status code for this
						.json({ message: 'You have already expressed interest in this material request.' });
				}
			}

			let finalMessageContent: string;

			if (
				customMessageFromBody &&
				typeof customMessageFromBody === 'string' &&
				customMessageFromBody.trim() !== ''
			) {
				finalMessageContent = customMessageFromBody.trim();
			} else if (predefinedMessageKey && typeof predefinedMessageKey === 'string') {
				if (predefinedMessageKey === 'CUSTOMER_INTEREST_IN_PROVIDER') {
					// Ensure targetUser is defined before accessing profile
					const targetName =
						targetUser?.profile?.fullName || targetUser?.email?.split('@')[0] || 'User';
					finalMessageContent = `Hi ${targetName}, I'm interested in your services.`;
				} else if (predefinedMessageKey === 'PROVIDER_INTEREST_IN_WORK_REQUEST') {
					if (!workRequest) {
						return res.status(400).json({
							message:
								'workRequestId is required when using the PROVIDER_INTEREST_IN_WORK_REQUEST key.'
						});
					}
					finalMessageContent = `Hi, I saw your work request "${workRequest.title}" and I'm interested in discussing it further.`;
				} else if (predefinedMessageKey === 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST') {
					if (!materialRequest) {
						return res.status(400).json({
							message:
								'materialRequestId is required when using the SUPPLIER_INTEREST_IN_MATERIAL_REQUEST key.'
						});
					}
					finalMessageContent = `Hello, I've reviewed your request for materials titled "${materialRequest.title}" and I'm interested in providing a quote.`;
				} else {
					// If predefinedMessageKey is provided but not recognized
					return res.status(400).json({
						message: `Unknown or inapplicable predefinedMessageKey: ${predefinedMessageKey}`
					});
				}
			} else {
				// If neither custom message nor a valid predefined key is provided
				return res.status(400).json({
					message:
						'Either initialMessageContent or a valid predefinedMessageKey is required to initiate interest.'
				});
			}

			const allChats = await chatsDB.getAll();
			let existingChat = allChats.find(
				(chat: Chat) =>
					chat.participants.includes(sender.id) &&
					chat.participants.includes(targetUserId) &&
					(!workRequestId || chat.workRequestId === workRequestId) &&
					(!materialRequestId || chat.materialRequestId === materialRequestId)
			);

			const now = new Date().toISOString();

			if (!existingChat) {
				const chatId = crypto.randomUUID();
				const newChat: Partial<Chat> = {
					id: chatId,
					participants: [sender.id, targetUserId].sort(),
					createdAt: now,
					updatedAt: now
				};

				if (workRequestId) newChat.workRequestId = workRequestId;
				if (materialRequestId) newChat.materialRequestId = materialRequestId;

				existingChat = await chatsDB.create(newChat as Chat);
			}

			if (existingChat && sender && targetUser) {
				const messageId = crypto.randomUUID();
				const newMessage: Message = {
					id: messageId,
					senderId: sender.id,
					content: finalMessageContent,
					timestamp: now,
					// Add entity reference IDs for clickable messages
					...(workRequestId && { ExpertRequestId: workRequestId }),
					...(materialRequestId && { MaterialRequestId: materialRequestId })
				};
				await chatsDB.createInSubcollection(existingChat.id, 'messages', newMessage);
				existingChat.updatedAt = now;
				await chatsDB.update(existingChat.id, { updatedAt: now });
			}

			if (workRequest) {
				if (sender.userType === 'expert') {
					const wrExperts = workRequest.interestedExperts || [];
					if (!wrExperts.includes(sender.id)) {
						await workRequestsDB.update(workRequest.id, {
							interestedExperts: [...wrExperts, sender.id]
						});
					}
				}
			}

			if (materialRequest) {
				if (sender.userType === 'supplier') {
					const mrSuppliers = materialRequest.interestedSuppliers || [];
					if (!mrSuppliers.includes(sender.id)) {
						await materialRequestsDB.update(materialRequest.id, {
							interestedSuppliers: [...mrSuppliers, sender.id]
						});
					}
				}
			}

			res.status(201).json({
				message: 'Interest expressed successfully. Chat initiated/updated.',
				chatId: existingChat.id,
				initialMessage: existingChat ? 'Message sent successfully' : 'Chat created successfully'
			});
		} catch (error: unknown) {
			console.error('Error expressing interest:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to express interest.', error: errorMessage });
		}
	}
);

// --- Invitation Endpoints ---

// Invite users to a work request
router.post(
	'/work-requests/:id/invite',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { id: workRequestId } = req.params;
			const { userIds, userType } = req.body;

			// Validate input
			if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
				return res
					.status(400)
					.json({ message: 'userIds array is required and must not be empty.' });
			}
			if (!userType || !['expert', 'supplier'].includes(userType)) {
				return res.status(400).json({ message: 'userType must be either "expert" or "supplier".' });
			}

			// For work requests, only experts can be invited
			if (userType !== 'expert') {
				return res.status(400).json({
					message: `Only experts can be invited to work requests. Cannot invite ${userType}s.`
				});
			}

			// Get the work request
			const workRequest = await workRequestsDB.findById(workRequestId);
			if (!workRequest) {
				return res.status(404).json({ message: 'Work request not found.' });
			}

			// Only the customer who owns the request can invite users
			if (workRequest.customerId !== user.id) {
				return res
					.status(403)
					.json({ message: 'Only the customer who created this request can invite users.' });
			}

			// Validate that the work request is in a valid status for invitations
			if (!['open', 'in_discussion', 'awaiting_quotes'].includes(workRequest.status)) {
				return res.status(400).json({
					message: `Cannot invite users to a work request with status: ${workRequest.status}`
				});
			}

			// Validate all user IDs exist and are of the correct type
			const validatedUsers = [];
			for (const userId of userIds) {
				const targetUser = await usersDB.findById(userId);
				if (!targetUser || !targetUser.isActive) {
					return res.status(404).json({ message: `User with ID ${userId} not found or inactive.` });
				}
				if (targetUser.userType !== userType) {
					return res.status(400).json({
						message: `User ${userId} is not a ${userType}. Cannot invite to work request.`
					});
				}
				validatedUsers.push(targetUser);
			}

			// Validate that only experts can be invited to work requests
			if (userType !== 'expert') {
				return res.status(400).json({
					message: `Only experts can be invited to work requests. Cannot invite ${userType}s.`
				});
			}

			// Update the work request with invited experts
			const currentInvited = workRequest.invitedExperts || [];
			const newInvited = [...new Set([...currentInvited, ...userIds])]; // Remove duplicates

			await workRequestsDB.update(workRequestId, {
				invitedExperts: newInvited,
				updatedAt: new Date().toISOString()
			});

			res.status(200).json({
				message: `Successfully invited ${userIds.length} ${userType}(s) to the work request.`,
				invitedUsers: validatedUsers.map((u) => ({
					id: u.id,
					name: u.profile?.fullName || u.profile?.companyName
				}))
			});
		} catch (error: unknown) {
			console.error('Error inviting users to work request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to invite users.', error: errorMessage });
		}
	}
);

// Invite users to a material request
router.post(
	'/material-requests/:id/invite',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { id: materialRequestId } = req.params;
			const { userIds } = req.body;

			// Validate input
			if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
				return res
					.status(400)
					.json({ message: 'userIds array is required and must not be empty.' });
			}

			// Get the material request
			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Only the customer who owns the request can invite users
			if (materialRequest.customerId !== user.id) {
				return res
					.status(403)
					.json({ message: 'Only the customer who created this request can invite users.' });
			}

			// Validate that the material request is in a valid status for invitations
			if (!['open', 'quoting'].includes(materialRequest.status)) {
				return res.status(400).json({
					message: `Cannot invite users to a material request with status: ${materialRequest.status}`
				});
			}

			// Validate all user IDs exist and are suppliers
			const validatedUsers = [];
			for (const userId of userIds) {
				const targetUser = await usersDB.findById(userId);
				if (!targetUser || !targetUser.isActive) {
					return res.status(404).json({ message: `User with ID ${userId} not found or inactive.` });
				}
				if (targetUser.userType !== 'supplier') {
					return res.status(400).json({
						message: `User ${userId} is not a supplier. Cannot invite to material request.`
					});
				}
				validatedUsers.push(targetUser);
			}

			// Update the material request with invited users
			const currentInvited = materialRequest.invitedSuppliers || [];
			const newInvited = [...new Set([...currentInvited, ...userIds])]; // Remove duplicates

			await materialRequestsDB.update(materialRequestId, {
				invitedSuppliers: newInvited,
				updatedAt: new Date().toISOString()
			});

			res.status(200).json({
				message: `Successfully invited ${userIds.length} supplier(s) to the material request.`,
				invitedUsers: validatedUsers.map((u) => ({
					id: u.id,
					name: u.profile?.fullName || u.profile?.companyName
				}))
			});
		} catch (error: unknown) {
			console.error('Error inviting users to material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to invite users.', error: errorMessage });
		}
	}
);

export default router;
