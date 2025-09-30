import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { Contract, ContractComment, Attachment } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { uploadEntityAttachment } from '../file-storage';
import { sendSystemMessage } from './shared/system-messages';
import { attachmentUpload } from './shared/middleware';
import crypto from 'crypto';

// Initialize databases
const contractsDB = new FirestoreCollection<Contract>('contracts');
const usersDB = new FirestoreCollection('users');

const router = Router();

// --- Contract Comments Endpoint ---
router.post(
    '/contracts/:contractId/comments',
    authenticateToken,
    attachmentUpload.array('files', 5), // Limit to 5 files for comments
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const contractId = req.params.contractId;
            const { comment, type = 'general' } = req.body;
            const files = req.files as Express.Multer.File[];

            // --- Validation ---
            if (!comment || typeof comment !== 'string' || comment.trim().length < 1) {
                return res.status(400).json({
                    message: 'Comment is required and must be at least 1 character long.'
                });
            }

            // Validate comment type
            const validTypes = ['general', 'revision_request', 'signature_comment'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    message: `Invalid comment type. Must be one of: ${validTypes.join(', ')}`
                });
            }

            // --- Get Contract ---
            const contract = await contractsDB.findById(contractId);
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found.' });
            }

            // --- Authorization ---
            if (contract.customerId !== user.id && contract.expertSupplierId !== user.id) {
                return res.status(403).json({
                    message: 'Forbidden. You are not authorized to comment on this contract.'
                });
            }

            // --- Check Contract Status ---
            const allowedStatuses = [
                'draft',
                'revision_requested',
                'awaiting_signatures',
                'signed',
                'in_progress'
            ];
            if (!allowedStatuses.includes(contract.status)) {
                return res.status(400).json({
                    message: `Cannot add comments to contract in status '${contract.status}'.`
                });
            }

            // Only allow revision requests in draft/awaiting_signatures states
            if (
                type === 'revision_request' &&
                !['draft', 'awaiting_signatures'].includes(contract.status)
            ) {
                return res.status(400).json({
                    message: `Cannot add revision requests to contract in status '${contract.status}'.`
                });
            }

            // --- Get User Profile for Validation ---
            const userProfile = await usersDB.findById(user.id) as any;
            if (!userProfile) {
                return res.status(404).json({ message: 'User profile not found.' });
            }

            // --- Upload Attachments (if any) ---
            let attachments: any[] = [];
            if (files && files.length > 0) {
                const uploadPromises = files.map((file) =>
                    uploadEntityAttachment(file, 'contracts', contractId)
                );
                const uploadResults = await Promise.all(uploadPromises);

                attachments = uploadResults.map((result, index) => {
                    const file = files[index];
                    return {
                        fileName: file.originalname,
                        filePath: result.filePath,
                        fileType: file.mimetype,
                        size: file.size
                    };
                });
            }

            // --- Create Comment ---
            const commentId = crypto.randomUUID();
            const now = new Date().toISOString();
            const newComment: ContractComment = {
                id: commentId,
                authorId: user.id,
                comment: comment.trim(),
                timestamp: now,
                type: type as ContractComment['type']
            };

            // Only add attachments if there are any
            if (attachments.length > 0) {
                newComment.attachments = attachments;
            }

            // --- Update Contract with New Comment ---
            const currentComments = contract.comments || [];
            const updatedComments = [...currentComments, newComment];

            const updateData: Partial<Contract> = {
                comments: updatedComments,
                updatedAt: now
            };

            // --- Update Status if Revision Request ---
            if (type === 'revision_request') {
                updateData.status = 'revision_requested';
            }

            const updatedContract = await contractsDB.update(contractId, updateData);

            // --- Send System Message ---
            const commentTypeLabel = type === 'revision_request' ? 'revision request' : 'comment';
            const authorDisplayName =
                userProfile.profile?.fullName || userProfile.email.split('@')[0] || 'User';

            // Create message with attachment info if applicable
            let systemMessageContent = `${authorDisplayName} has added a ${commentTypeLabel} to the contract`;
            if (attachments.length > 0) {
                systemMessageContent += ` with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`;
            }
            systemMessageContent += '.';

            await sendSystemMessage(
                contract.customerId,
                contract.expertSupplierId,
                systemMessageContent,
                { contractId: contract.id }
            );

            res.status(200).json({
                message: 'Comment added successfully!',
                comment: newComment,
                contract: updatedContract
            });
        } catch (error: unknown) {
            console.error('Error adding contract comment:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

            // Handle multer errors
            if (errorMessage.includes('File type not allowed')) {
                return res.status(400).json({ message: errorMessage });
            }
            if (errorMessage.includes('File too large')) {
                return res.status(400).json({ message: 'File too large. Maximum file size is 25MB.' });
            }

            res.status(500).json({ message: 'Failed to add comment.', error: errorMessage });
        }
    }
);

// --- Update Contract Endpoint ---
router.put(
    '/contracts/:contractId',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const contractId = req.params.contractId;
            const updateData = req.body as Partial<Contract> & {
                removedAttachments?: string[];
                attachmentManagement?: {
                    keepExisting: Array<{
                        fileName: string;
                        filePath: string;
                        fileType: string;
                        size: number;
                    }>;
                    removeExisting: string[];
                    hasNewAttachments: boolean;
                    newAttachments?: Array<{
                        fileName: string;
                        filePath: string;
                        fileType: string;
                        size: number;
                    }>;
                };
            };

            // --- Get Contract ---
            const contract = await contractsDB.findById(contractId);
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found.' });
            }

            // --- Authorization ---
            // Currently only customer can edit, but this may change in the future
            if (user.id !== contract.customerId) {
                return res.status(403).json({
                    message: 'Forbidden. You are not authorized to edit this contract.'
                });
            }

            // --- Status Validation ---
            // Only allow editing contracts in revision_requested status
            if (contract.status !== 'revision_requested') {
                return res.status(400).json({
                    message: 'Only contracts in revision_requested status can be edited.'
                });
            }

            // --- Enhanced Attachment Management ---
            let updatedAttachments = contract.attachments || [];

            // Handle new attachment management approach
            if (updateData.attachmentManagement) {
                const { keepExisting, removeExisting, hasNewAttachments, newAttachments } =
                    updateData.attachmentManagement;

                // Use the explicit list of attachments to keep
                if (Array.isArray(keepExisting)) {
                    updatedAttachments = keepExisting;
                }

                // Add new attachments if any were uploaded
                if (newAttachments && Array.isArray(newAttachments) && newAttachments.length > 0) {
                    updatedAttachments = [...updatedAttachments, ...newAttachments];
                }
            } else {
                // Fallback to old approach for backward compatibility
                if (
                    updateData.removedAttachments &&
                    Array.isArray(updateData.removedAttachments) &&
                    updateData.removedAttachments.length > 0
                ) {
                    updatedAttachments = updatedAttachments.filter(
                        (attachment) => !updateData.removedAttachments!.includes(attachment.fileName)
                    );
                }
            }

            // --- Update Contract ---
            const now = new Date().toISOString();
            const { removedAttachments, attachmentManagement, ...contractUpdates } = updateData;
            const updates: Partial<Contract> = {
                ...contractUpdates,
                attachments: updatedAttachments,
                updatedAt: now
            };

            // Ensure status is reset to draft after editing
            updates.status = 'draft';

            const updatedContract = await contractsDB.update(contractId, updates);

            if (!updatedContract) {
                return res.status(500).json({ message: 'Failed to update contract.' });
            }

            // --- Send System Message ---
            await sendSystemMessage(
                contract.customerId,
                contract.expertSupplierId,
                'The contract has been updated to address the revision request and is ready for signing again.',
                { contractId: contract.id }
            );

            res.status(200).json(updatedContract);
        } catch (error: unknown) {
            console.error('Error updating contract:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to update contract.', error: errorMessage });
        }
    }
);

router.put(
    '/contracts/:contractId/status',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const contractId = req.params.contractId;
            const { status: newStatus } = req.body;

            // --- Validation ---
            if (!newStatus) {
                return res.status(400).json({ message: 'New status is required in the request body.' });
            }
            const validStatuses: Contract['status'][] = [
                'draft',
                'awaiting_signatures',
                'signed',
                'in_progress',
                'completed',
                'disputed',
                'cancelled',
                'terminated'
            ];
            if (!validStatuses.includes(newStatus)) {
                return res.status(400).json({
                    message: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const contract = await contractsDB.findById(contractId);
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found.' });
            }

            // --- Authorization ---
            if (user.id !== contract.customerId && user.id !== contract.expertSupplierId) {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. You are not a party to this contract.' });
            }

            // --- Update Logic ---
            const now = new Date().toISOString();
            const updates: Partial<Contract> = {
                status: newStatus,
                updatedAt: now
            };
            const updatedContract = await contractsDB.update(contractId, updates);

            if (!updatedContract) {
                return res.status(500).json({ message: 'Failed to update the contract in the database.' });
            }

            // --- Chat Notification Logic ---
            await sendSystemMessage(
                updatedContract.customerId,
                updatedContract.expertSupplierId,
                `The contract status was updated to: ${newStatus.replace(/_/g, ' ')}.`,
                { contractId: updatedContract.id }
            );

            res.status(200).json(updatedContract);
        } catch (error: unknown) {
            console.error('Error updating contract status:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to update contract status.', error: errorMessage });
        }
    }
);

export default router;
