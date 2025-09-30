import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { MaterialRequest, Contract, WorkRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { uploadEntityAttachment } from '../file-storage';
import { attachmentUpload } from './shared/middleware';
import { ENTITY_CONFIG } from './shared/entity-config';

const router = Router();

// --- Generic Entity Attachment Endpoint ---
router.post(
    '/attachments/:entityType/:entityId',
    authenticateToken,
    attachmentUpload.array('files', 20),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const { entityType, entityId } = req.params;
            const files = req.files as Express.Multer.File[];

            // Validate entity type
            if (!ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG]) {
                return res.status(400).json({
                    message: `Invalid entity type: ${entityType}. Supported types: ${Object.keys(ENTITY_CONFIG).join(', ')}`
                });
            }

            const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG];

            // Validate files were uploaded
            if (!files || files.length === 0) {
                return res
                    .status(400)
                    .json({ message: 'No files uploaded. Please select files to attach.' });
            }

            // Validate file count
            if (files.length > config.maxFiles) {
                return res.status(400).json({
                    message: `Too many files. Maximum ${config.maxFiles} files allowed for ${entityType}.`
                });
            }

            // Validate entity exists and user has permission
            const entity = await config.collection.findById(entityId);
            if (!entity) {
                return res.status(404).json({ message: `${entityType.slice(0, -1)} not found.` });
            }

            // Check user permission and get current attachments (entity-type specific)
            let hasPermission = false;
            let currentAttachments: any[] = [];

            if (entityType === 'material-requests') {
                const materialRequest = entity as MaterialRequest;
                hasPermission = materialRequest.customerId === user.id;
                currentAttachments = materialRequest.attachments || [];
            } else if (entityType === 'work-requests') {
                const workRequest = entity as WorkRequest;
                hasPermission = workRequest.customerId === user.id;
                // Work requests don't have attachments yet, but we'll prepare for future support
                currentAttachments = [];
            } else if (entityType === 'contracts') {
                const contract = entity as Contract;
                hasPermission = contract.customerId === user.id || contract.expertSupplierId === user.id;
                // Contracts don't have attachments yet, but we'll prepare for future support
                currentAttachments = [];
            }

            if (!hasPermission) {
                return res.status(403).json({
                    message: `Forbidden. You don't have permission to add attachments to this ${entityType.slice(0, -1)}.`
                });
            }

            // Upload files to GCS
            const uploadPromises = files.map((file) =>
                uploadEntityAttachment(file, entityType, entityId)
            );
            const uploadResults = await Promise.all(uploadPromises);

            // Create attachment objects (Firestore-safe, no undefined values)
            const newAttachments = uploadResults.map((result, index) => {
                const file = files[index];
                const attachment: any = {
                    fileName: file.originalname,
                    filePath: result.filePath,
                    fileType: file.mimetype,
                    size: file.size
                };
                return attachment;
            });

            // Get updated attachments list
            const updatedAttachments = [...currentAttachments, ...newAttachments];

            // Update entity with new attachments
            const updateData: any = {
                attachments: updatedAttachments,
                updatedAt: new Date().toISOString()
            };

            await config.collection.update(entityId, updateData);

            res.status(200).json({
                message: `${files.length} attachment(s) uploaded successfully!`,
                attachments: newAttachments,
                totalAttachments: updatedAttachments.length
            });
        } catch (error: unknown) {
            console.error('Error uploading entity attachments:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

            // Handle multer errors
            if (errorMessage.includes('File type not allowed')) {
                return res.status(400).json({ message: errorMessage });
            }
            if (errorMessage.includes('File too large')) {
                return res.status(400).json({ message: 'File too large. Maximum file size is 25MB.' });
            }

            res.status(500).json({ message: 'Failed to upload attachments.', error: errorMessage });
        }
    }
);

export default router;
