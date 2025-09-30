import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { Contract, ContractComment, Attachment, Project } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { uploadEntityAttachment } from '../file-storage';
import { sendSystemMessage } from './shared/system-messages';
import { attachmentUpload } from './shared/middleware';
import crypto from 'crypto';

// Initialize databases
const contractsDB = new FirestoreCollection<Contract>('contracts');
const usersDB = new FirestoreCollection('users');
const workRequestsDB = new FirestoreCollection('workRequests');
const materialRequestsDB = new FirestoreCollection('materialRequests');
const projectsDB = new FirestoreCollection<Project>('projects');

const router = Router();

router.put(
    '/contracts/:contractId/sign',
    authenticateToken,
    attachmentUpload.array('signatureFiles', 5), // Limit to 5 files for signature attachments
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const contractId = req.params.contractId;
            const contract = await contractsDB.findById(contractId);

            // Extract signature comment and files from request
            const signatureComment = req.body.signatureComment;
            const signatureFiles = req.files as Express.Multer.File[];
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found.' });
            }
            if (contract.status !== 'draft' && contract.status !== 'awaiting_signatures') {
                return res.status(400).json({
                    message: `Contract in status '${contract.status}' cannot be signed. Must be 'draft' or 'awaiting_signatures'.`
                });
            }
            let signedByCurrentUser = false;
            const now = new Date().toISOString();
            const updates: Partial<Contract> = { updatedAt: now };

            if (user.id === contract.customerId) {
                if (contract.customerSigned)
                    return res.status(400).json({ message: 'Customer has already signed this contract.' });
                updates.customerSigned = true;
                updates.customerSignatureTimestamp = now;
                signedByCurrentUser = true;
            } else if (user.id === contract.expertSupplierId) {
                if (contract.expertSupplierSigned)
                    return res
                        .status(400)
                        .json({ message: 'Expert/Supplier has already signed this contract.' });
                updates.expertSupplierSigned = true;
                updates.expertSupplierSignatureTimestamp = now;
                signedByCurrentUser = true;
            } else {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. You are not a party to this contract or cannot sign it.' });
            }

            if (signedByCurrentUser) {
                const customerHasSigned = updates.customerSigned || contract.customerSigned;
                const providerHasSigned = updates.expertSupplierSigned || contract.expertSupplierSigned;
                const signerRole = user.userType.charAt(0).toUpperCase() + user.userType.slice(1);

                if (customerHasSigned && providerHasSigned) {
                    updates.status = 'signed';
                    const updatedContract = await contractsDB.update(contractId, updates);

                    // --- SIGNATURE COMMENT CREATION ---
                    // If there's a signature comment, create it as a signature_comment type
                    if (signatureComment && signatureComment.trim()) {
                        try {
                            // Get user profile for display name
                            const userProfile = await usersDB.findById(user.id) as any;
                            const authorDisplayName =
                                userProfile?.profile?.fullName || userProfile?.email.split('@')[0] || 'User';

                            // Create signature comment
                            const signatureCommentData: ContractComment = {
                                id: crypto.randomUUID(),
                                authorId: user.id,
                                comment: signatureComment.trim(),
                                timestamp: now,
                                type: 'signature_comment',
                                attachments: []
                            };

                            // Handle signature attachments if any
                            if (signatureFiles && signatureFiles.length > 0) {
                                const attachments: Attachment[] = [];
                                for (const file of signatureFiles) {
                                    try {
                                        const uploadResult = await uploadEntityAttachment(
                                            file,
                                            'contracts',
                                            contractId
                                        );
                                        attachments.push({
                                            fileName: file.originalname,
                                            filePath: uploadResult.filePath,
                                            fileType: file.mimetype,
                                            size: file.size
                                        });
                                    } catch (uploadError) {
                                        console.error('Failed to upload signature attachment:', uploadError);
                                        // Continue with other files even if one fails
                                    }
                                }
                                if (attachments.length > 0) {
                                    signatureCommentData.attachments = attachments;
                                }
                            }

                            // Add the signature comment to the contract
                            if (updatedContract) {
                                const comments = updatedContract.comments || [];
                                comments.push(signatureCommentData);
                                await contractsDB.update(contractId, { comments });
                            }

                            // Send system message about signature comment
                            let signatureMessage = `The ${signerRole} has signed the contract with a comment: "${signatureComment.trim()}"`;
                            if (signatureFiles && signatureFiles.length > 0) {
                                signatureMessage += ` and ${signatureFiles.length} attachment${signatureFiles.length > 1 ? 's' : ''}`;
                            }
                            signatureMessage += '.';

                            await sendSystemMessage(
                                contract.customerId,
                                contract.expertSupplierId,
                                signatureMessage,
                                { contractId: contract.id }
                            );
                        } catch (commentError) {
                            console.error('Failed to create signature comment:', commentError);
                            // Don't fail the entire signing process if comment creation fails
                        }
                    } else {
                        // Send system message that the contract is fully signed (no comment)
                        await sendSystemMessage(
                            contract.customerId,
                            contract.expertSupplierId,
                            `The contract has been fully signed by the ${signerRole} and is now active.`,
                            { contractId: contract.id }
                        );
                    }

                    // This check is crucial to prevent trying to process a null object
                    if (!updatedContract) {
                        return res.status(500).json({ message: 'Failed to update contract after signing.' });
                    }

                    // --- PROJECT CREATION/UPDATE LOGIC ---
                    // When a contract is fully signed, create or update the corresponding project.
                    const projectId = updatedContract.workRequestId || updatedContract.materialRequestId;
                    if (projectId) {
                        const project = await projectsDB.findById(projectId);
                        const workRequest = updatedContract.workRequestId
                            ? await workRequestsDB.findById(updatedContract.workRequestId) as any
                            : null;
                        const materialRequest = updatedContract.materialRequestId
                            ? await materialRequestsDB.findById(updatedContract.materialRequestId) as any
                            : null;

                        const projectUpdate: Partial<Project> = {
                            updatedAt: now
                        };

                        const historyEntry = { status: 'Not Started', updatedAt: now, updatedBy: user.id };

                        if (updatedContract.requestType === 'work') {
                            projectUpdate.workComponent = {
                                expertId: updatedContract.expertSupplierId,
                                contractId: updatedContract.id,
                                status: 'Not Started',
                                statusHistory: [historyEntry]
                            };
                        } else {
                            // 'material'
                            projectUpdate.materialComponent = {
                                supplierId: updatedContract.expertSupplierId,
                                contractId: updatedContract.id,
                                status: 'Awaiting Dispatch',
                                statusHistory: [historyEntry]
                            };
                        }

                        if (project) {
                            // Project exists, just add the new component
                            await projectsDB.update(projectId, projectUpdate);
                        } else {
                            // Project doesn't exist, create it
                            const newProject: Project = {
                                id: projectId,
                                title: workRequest?.title || materialRequest?.title || 'Project',
                                customerId: updatedContract.customerId,
                                createdAt: now,
                                updatedAt: now,
                                ...projectUpdate
                            };
                            await projectsDB.create(newProject);
                        }
                    }
                    // --- END PROJECT LOGIC ---

                    res.status(200).json(updatedContract);
                } else {
                    updates.status = 'awaiting_signatures';
                    const updatedContract = await contractsDB.update(contractId, updates);

                    // --- SIGNATURE COMMENT CREATION FOR PARTIAL SIGNING ---
                    // If there's a signature comment, create it as a signature_comment type
                    if (signatureComment && signatureComment.trim()) {
                        try {
                            // Get user profile for display name
                            const userProfile = await usersDB.findById(user.id) as any;
                            const authorDisplayName =
                                userProfile?.profile?.fullName || userProfile?.email.split('@')[0] || 'User';

                            // Create signature comment
                            const signatureCommentData: ContractComment = {
                                id: crypto.randomUUID(),
                                authorId: user.id,
                                comment: signatureComment.trim(),
                                timestamp: now,
                                type: 'signature_comment',
                                attachments: []
                            };

                            // Handle signature attachments if any
                            if (signatureFiles && signatureFiles.length > 0) {
                                const attachments: Attachment[] = [];
                                for (const file of signatureFiles) {
                                    try {
                                        const uploadResult = await uploadEntityAttachment(
                                            file,
                                            'contracts',
                                            contractId
                                        );
                                        attachments.push({
                                            fileName: file.originalname,
                                            filePath: uploadResult.filePath,
                                            fileType: file.mimetype,
                                            size: file.size
                                        });
                                    } catch (uploadError) {
                                        console.error('Failed to upload signature attachment:', uploadError);
                                        // Continue with other files even if one fails
                                    }
                                }
                                if (attachments.length > 0) {
                                    signatureCommentData.attachments = attachments;
                                }
                            }

                            // Add the signature comment to the contract
                            if (updatedContract) {
                                const comments = updatedContract.comments || [];
                                comments.push(signatureCommentData);
                                await contractsDB.update(contractId, { comments });
                            }

                            // Send system message about signature comment
                            let partialSignatureMessage = `The ${signerRole} has signed the contract with a comment: "${signatureComment.trim()}"`;
                            if (signatureFiles && signatureFiles.length > 0) {
                                partialSignatureMessage += ` and ${signatureFiles.length} attachment${signatureFiles.length > 1 ? 's' : ''}`;
                            }
                            partialSignatureMessage += '. Awaiting other party\'s signature.';

                            await sendSystemMessage(
                                contract.customerId,
                                contract.expertSupplierId,
                                partialSignatureMessage,
                                { contractId: contract.id }
                            );
                        } catch (commentError) {
                            console.error('Failed to create signature comment:', commentError);
                            // Don't fail the entire signing process if comment creation fails
                        }
                    } else {
                        // Send system message that one party has signed (no comment)
                        await sendSystemMessage(
                            contract.customerId,
                            contract.expertSupplierId,
                            `The ${signerRole} has signed the contract. Awaiting other party's signature.`,
                            { contractId: contract.id }
                        );
                    }

                    res.status(200).json(updatedContract);
                }
            } else {
                res.status(400).json({
                    message:
                        'No signature action was performed. User may have already signed or is not a party.'
                });
            }
        } catch (error: unknown) {
            console.error('Error signing contract:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to sign contract.', error: errorMessage });
        }
    }
);

export default router;
