import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { WorkRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { sendSystemMessage } from './shared/system-messages';
import crypto from 'crypto';

// Initialize databases
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');

const router = Router();

// Helper function to auto-expire work requests whose deadlines have passed
async function checkAndExpireWorkRequests(requests: WorkRequest[]): Promise<WorkRequest[]> {
	const now = new Date();
	const activeStatuses = ['open', 'in_discussion', 'awaiting_quotes'];

	return Promise.all(
		requests.map(async (req) => {
			if (
				req.expirationDate &&
				activeStatuses.includes(req.status) &&
				new Date(req.expirationDate).getTime() <= now.getTime()
			) {
				const updatedStatus = 'expired' as const;
				const updatedAt = now.toISOString();
				try {
					await workRequestsDB.update(req.id, {
						status: updatedStatus,
						updatedAt
					});
					return { ...req, status: updatedStatus, updatedAt };
				} catch (e) {
					console.error(`Failed to auto-expire work request ${req.id}:`, e);
				}
			}
			return req;
		})
	);
}

// --- Work Request Endpoints ---
// /work-requests?customerId=${customerId} for customer
// /work-requests for experts
router.get('/work-requests', async (req: Request, res: Response) => {
	try {
		const { customerId } = req.query as { customerId?: string };
		let workRequests = await workRequestsDB.getAll();

		// Check and auto-expire requests
		workRequests = await checkAndExpireWorkRequests(workRequests);

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
				category,
				expirationDate
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
			if (expirationDate) {
				if (isNaN(Date.parse(expirationDate))) {
					return res.status(400).json({ message: 'Expiration date must be a valid date string if provided.' });
				}
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0);
				if (new Date(expirationDate).getTime() < todayStart.getTime()) {
					return res.status(400).json({ message: 'Expiration date cannot be in the past.' });
				}
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
				expectedCost: expectedCost ?? 0,
				timeline: timeline || 'Not specified',
				materialsSuggested: materialsSuggested || '',
				status: 'open',
				createdAt: now,
				updatedAt: now,
				category: category || 'General',
				interestedExperts: [],
				invitedExperts: []
			};
			if (expirationDate) {
				newWorkRequest.expirationDate = new Date(expirationDate).toISOString();
			}
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

// fix this endpoint vulnerability (controlled access needed)
router.get('/work-requests/:id', async (req: Request, res: Response) => {
	try {
		const workRequestId = req.params.id;
		if (!workRequestId) {
			return res.status(400).json({ message: 'Work request ID parameter is required.' });
		}
		let workRequest = await workRequestsDB.findById(workRequestId);
		if (!workRequest) {
			return res.status(404).json({ message: 'Work request not found.' });
		}
		// Run auto-expiration check
		const expiredRequests = await checkAndExpireWorkRequests([workRequest]);
		workRequest = expiredRequests[0];
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

			if (updateData.expirationDate) {
				if (isNaN(Date.parse(updateData.expirationDate))) {
					return res.status(400).json({ message: 'Expiration date must be a valid date string if provided.' });
				}
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0);
				if (new Date(updateData.expirationDate).getTime() < todayStart.getTime()) {
					return res.status(400).json({ message: 'Expiration date cannot be in the past.' });
				}
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
				'images',
				'expirationDate'
			];
			const sanitizedData: any = {};

			for (const field of allowedFields) {
				if (updateData[field] !== undefined) {
					if (field === 'expirationDate' && updateData[field]) {
						sanitizedData[field] = new Date(updateData[field]).toISOString();
					} else {
						sanitizedData[field] = updateData[field];
					}
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
				'disputed',
				'closed'
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
