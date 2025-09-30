import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { WorkRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { sendSystemMessage } from './shared/system-messages';
import crypto from 'crypto';

// Initialize databases
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');

const router = Router();

// --- Work Request Endpoints ---
router.get('/work-requests', async (req: Request, res: Response) => {
    try {
        const { customerId } = req.query as { customerId?: string };
        let workRequests = await workRequestsDB.getAll();

        // If a customerId is provided, filter the work requests
        if (customerId) {
            workRequests = workRequests.filter(
                (request: WorkRequest) => request.customerId === customerId
            );
        }

        const sortedWorkRequests = workRequests.sort(
            (a: WorkRequest, b: WorkRequest) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        res.status(200).json(sortedWorkRequests);
    } catch (error: unknown) {
        console.error('Error fetching work requests:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch work requests.', error: errorMessage });
    }
});

router.post(
    '/work-requests',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            if (user.userType !== 'customer') {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. Only customers can create work requests.' });
            }
            const {
                title,
                description,
                images,
                location,
                expectedCost,
                timeline,
                materialsSuggested,
                category
            } = req.body;
            if (!title || !description || !location) {
                return res.status(400).json({ message: 'Title, description, and location are required.' });
            }
            if (
                images &&
                (!Array.isArray(images) || !images.every((img: string) => typeof img === 'string'))
            ) {
                return res
                    .status(400)
                    .json({ message: 'Images must be an array of strings (file paths).' });
            }
            if (expectedCost !== undefined && typeof expectedCost !== 'number') {
                return res.status(400).json({ message: 'Expected cost must be a number if provided.' });
            }
            const now = new Date().toISOString();
            const workRequestId = crypto.randomUUID();
            const newWorkRequest: WorkRequest = {
                id: workRequestId,
                customerId: user.id,
                title,
                description,
                images: images || [],
                location,
                expectedCost: expectedCost,
                timeline: timeline || 'Not specified',
                materialsSuggested: materialsSuggested || '',
                status: 'open',
                createdAt: now,
                updatedAt: now,
                category: category || 'General',
                interestedExperts: [],
                interestedSuppliers: []
            };
            const createdWorkRequest = await workRequestsDB.create(newWorkRequest);
            res.status(201).json(createdWorkRequest);
        } catch (error: unknown) {
            console.error('Error creating work request:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            if (errorMessage.includes('already exists')) {
                return res.status(409).json({ message: errorMessage });
            }
            res.status(500).json({ message: 'Failed to create work request.', error: errorMessage });
        }
    }
);

router.get('/work-requests/:id', async (req: Request, res: Response) => {
    try {
        const workRequestId = req.params.id;
        if (!workRequestId) {
            return res.status(400).json({ message: 'Work request ID parameter is required.' });
        }
        const workRequest = await workRequestsDB.findById(workRequestId);
        if (!workRequest) {
            return res.status(404).json({ message: 'Work request not found.' });
        }
        res.status(200).json(workRequest);
    } catch (error: unknown) {
        console.error(`Error fetching work request ${req.params.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch work request.', error: errorMessage });
    }
});

// PUT /api/work-requests/:id - Update work request
router.put(
    '/work-requests/:id',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const workRequestId = req.params.id;
            const updateData = req.body;

            if (!workRequestId) {
                return res.status(400).json({ message: 'Work request ID parameter is required.' });
            }

            const workRequest = await workRequestsDB.findById(workRequestId);
            if (!workRequest) {
                return res.status(404).json({ message: 'Work request not found.' });
            }

            // Check permissions - only customer can update and only if status is 'open'
            if (user.id !== workRequest.customerId) {
                return res
                    .status(403)
                    .json({ message: 'You do not have permission to update this work request.' });
            }

            if (workRequest.status !== 'open') {
                return res.status(400).json({ message: 'Only open work requests can be edited.' });
            }

            // Validate and sanitize update data
            const allowedFields = [
                'title',
                'description',
                'location',
                'category',
                'expectedCost',
                'timeline',
                'materialsSuggested',
                'images'
            ];
            const sanitizedData: any = {};

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    sanitizedData[field] = updateData[field];
                }
            }

            // Add updatedAt timestamp
            sanitizedData.updatedAt = new Date().toISOString();

            const updatedWorkRequest = await workRequestsDB.update(workRequestId, sanitizedData);

            if (!updatedWorkRequest) {
                return res.status(500).json({ message: 'Failed to update work request.' });
            }

            res.status(200).json(updatedWorkRequest);
        } catch (error: unknown) {
            console.error('Error updating work request:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to update work request.', error: errorMessage });
        }
    }
);

// PUT /api/work-requests/:id/status - Update work request status
router.put(
    '/work-requests/:id/status',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const workRequestId = req.params.id;
            const { status } = req.body;

            if (!workRequestId) {
                return res.status(400).json({ message: 'Work request ID parameter is required.' });
            }

            if (!status) {
                return res.status(400).json({ message: 'Status is required.' });
            }

            const workRequest = await workRequestsDB.findById(workRequestId);
            if (!workRequest) {
                return res.status(404).json({ message: 'Work request not found.' });
            }

            // Check permissions - only customer or associated expert can update status
            const isCustomer = user.id === workRequest.customerId;
            const isAssociatedExpert =
                workRequest.interestedExperts?.includes(user.id) ||
                workRequest.invitedExperts?.includes(user.id);

            if (!isCustomer && !isAssociatedExpert) {
                return res
                    .status(403)
                    .json({ message: 'You do not have permission to update this work request.' });
            }

            // Validate status transitions based on user role
            const validStatuses = [
                'open',
                'in_discussion',
                'awaiting_quotes',
                'contracted',
                'in_progress',
                'completed',
                'cancelled',
                'disputed'
            ];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status value.' });
            }

            const now = new Date().toISOString();
            const updatedWorkRequest = await workRequestsDB.update(workRequestId, {
                status,
                updatedAt: now
            });

            if (!updatedWorkRequest) {
                return res.status(500).json({ message: 'Failed to update work request status.' });
            }

            // Send system message to related chats
            if (isCustomer) {
                // Notify interested experts
                const interestedUsers = [
                    ...(workRequest.interestedExperts || []),
                    ...(workRequest.invitedExperts || [])
                ];
                for (const expertId of interestedUsers) {
                    await sendSystemMessage(
                        user.id,
                        expertId,
                        `Work request "${workRequest.title}" status updated to: ${status}`,
                        { ExpertRequestId: workRequest.id }
                    );
                }
            } else if (isAssociatedExpert) {
                // Notify customer
                await sendSystemMessage(
                    user.id,
                    workRequest.customerId,
                    `Work request "${workRequest.title}" status updated to: ${status}`,
                    { ExpertRequestId: workRequest.id }
                );
            }

            res.status(200).json(updatedWorkRequest);
        } catch (error: unknown) {
            console.error('Error updating work request status:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res
                .status(500)
                .json({ message: 'Failed to update work request status.', error: errorMessage });
        }
    }
);

export default router;
