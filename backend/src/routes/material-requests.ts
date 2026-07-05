import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { MaterialRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { sendSystemMessage } from './shared/system-messages';
import crypto from 'crypto';

// Initialize databases
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');

const router = Router();

// --- Material Request Endpoints ---

// Helper function to auto-expire material requests whose deadlines have passed
async function checkAndExpireMaterialRequests(requests: MaterialRequest[]): Promise<MaterialRequest[]> {
	const now = new Date();
	const activeStatuses = ['open', 'quoting', 'ordered'];

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
					await materialRequestsDB.update(req.id, {
						status: updatedStatus,
						updatedAt
					});
					return { ...req, status: updatedStatus, updatedAt };
				} catch (e) {
					console.error(`Failed to auto-expire material request ${req.id}:`, e);
				}
			}
			return req;
		})
	);
}

// GET all material requests-
// fix optimize this function
// /material-requests?customerId=${customerId} for customer
// /material-requests for experts
router.get('/material-requests', async (req: Request, res: Response) => {
	try {
		const { customerId } = req.query as { customerId?: string };
		let materialRequests = await materialRequestsDB.getAll();

		// Auto-expire requests before returning
		materialRequests = await checkAndExpireMaterialRequests(materialRequests);

		if (customerId) {
			materialRequests = materialRequests.filter(
				(request: MaterialRequest) => request.customerId === customerId
			);
		}

		const sortedMaterialRequests = materialRequests.sort(
			(a: MaterialRequest, b: MaterialRequest) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		res.status(200).json(sortedMaterialRequests);
	} catch (error: unknown) {
		console.error('Error fetching material requests:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch material requests.', error: errorMessage });
	}
});

// POST a new material request
router.post(
	'/material-requests',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			if (user.userType !== 'customer') {
				return res
					.status(403)
					.json({ message: 'Forbidden. Only customers can create material requests.' });
			}

			const { title, description, deliveryLocation, deliveryDate, linkedWorkRequestId, items, expirationDate } =
				req.body;

			if (
				!title ||
				!description ||
				!deliveryLocation ||
				!items ||
				!Array.isArray(items) ||
				items.length === 0
			) {
				return res.status(400).json({
					message: 'Title, description, delivery location, and at least one item are required.'
				});
			}

			// Basic validation for items array
			for (const item of items) {
				if (!item.itemName || !item.quantity) {
					return res
						.status(400)
						.json({ message: 'Each item must have an itemName and a quantity.' });
				}
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
			const materialRequestId = crypto.randomUUID();

			// Construct material request object, only including defined values (Firestore-safe)
			const newMaterialRequest: any = {
				id: materialRequestId,
				customerId: user.id,
				title,
				description,
				deliveryLocation,
				items,
				status: 'open',
				createdAt: now,
				updatedAt: now,
				interestedSuppliers: []
			};

			// Only include optional fields if they have values
			if (deliveryDate) {
				newMaterialRequest.deliveryDate = deliveryDate;
			}
			if (linkedWorkRequestId) {
				newMaterialRequest.linkedWorkRequestId = linkedWorkRequestId;
			}
			if (expirationDate) {
				newMaterialRequest.expirationDate = new Date(expirationDate).toISOString();
			}

			const createdMaterialRequest = await materialRequestsDB.create(newMaterialRequest);
			res.status(201).json(createdMaterialRequest);
		} catch (error: unknown) {
			console.error('Error creating material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to create material request.', error: errorMessage });
		}
	}
);

// GET a single material request by ID
router.get('/material-requests/:id', async (req: Request, res: Response) => {
	try {
		const materialRequestId = req.params.id;
		if (!materialRequestId) {
			return res.status(400).json({ message: 'Material request ID parameter is required.' });
		}
		let materialRequest = await materialRequestsDB.findById(materialRequestId);
		if (!materialRequest) {
			return res.status(404).json({ message: 'Material request not found.' });
		}
		// Run auto-expiration check
		const expiredRequests = await checkAndExpireMaterialRequests([materialRequest]);
		materialRequest = expiredRequests[0];
		res.status(200).json(materialRequest);
	} catch (error: unknown) {
		console.error(`Error fetching material request ${req.params.id}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch material request.', error: errorMessage });
	}
});

// PUT /api/material-requests/:id - Update material request
router.put(
	'/material-requests/:id',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const materialRequestId = req.params.id;
			const updateData = req.body;

			if (!materialRequestId) {
				return res.status(400).json({ message: 'Material request ID parameter is required.' });
			}

			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Check permissions - only customer can update and only if status is 'open'
			if (user.id !== materialRequest.customerId) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this material request.' });
			}

			if (materialRequest.status !== 'open') {
				return res.status(400).json({ message: 'Only open material requests can be edited.' });
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
				'deliveryLocation',
				'deliveryDate',
				'linkedWorkRequestId',
				'items',
				'attachments',
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

			const updatedMaterialRequest = await materialRequestsDB.update(
				materialRequestId,
				sanitizedData
			);

			if (!updatedMaterialRequest) {
				return res.status(500).json({ message: 'Failed to update material request.' });
			}

			res.status(200).json(updatedMaterialRequest);
		} catch (error: unknown) {
			console.error('Error updating material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update material request.', error: errorMessage });
		}
	}
);

// PUT /api/material-requests/:id/status - Update material request status
router.put(
	'/material-requests/:id/status',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const materialRequestId = req.params.id;
			const { status } = req.body;

			if (!materialRequestId) {
				return res.status(400).json({ message: 'Material request ID parameter is required.' });
			}

			if (!status) {
				return res.status(400).json({ message: 'Status is required.' });
			}

			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Check permissions - only customer or associated supplier can update status
			const isCustomer = user.id === materialRequest.customerId;
			const isAssociatedSupplier =
				materialRequest.interestedSuppliers?.includes(user.id) ||
				materialRequest.invitedSuppliers?.includes(user.id);

			if (!isCustomer && !isAssociatedSupplier) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this material request.' });
			}

			// Validate status transitions based on user role
			const validStatuses = ['open', 'quoting', 'ordered', 'contracted', 'completed', 'cancelled'];
			if (!validStatuses.includes(status)) {
				return res.status(400).json({ message: 'Invalid status value.' });
			}

			const now = new Date().toISOString();
			const updatedMaterialRequest = await materialRequestsDB.update(materialRequestId, {
				status,
				updatedAt: now
			});

			if (!updatedMaterialRequest) {
				return res.status(500).json({ message: 'Failed to update material request status.' });
			}

			// Send system message to related chats
			if (isCustomer) {
				// Notify interested suppliers
				const interestedUsers = [
					...(materialRequest.interestedSuppliers || []),
					...(materialRequest.invitedSuppliers || [])
				];
				for (const supplierId of interestedUsers) {
					await sendSystemMessage(
						user.id,
						supplierId,
						`Material request "${materialRequest.title}" status updated to: ${status}`,
						{ MaterialRequestId: materialRequest.id }
					);
				}
			} else if (isAssociatedSupplier) {
				// Notify customer
				await sendSystemMessage(
					user.id,
					materialRequest.customerId,
					`Material request "${materialRequest.title}" status updated to: ${status}`,
					{ MaterialRequestId: materialRequest.id }
				);
			}

			res.status(200).json(updatedMaterialRequest);
		} catch (error: unknown) {
			console.error('Error updating material request status:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res
				.status(500)
				.json({ message: 'Failed to update material request status.', error: errorMessage });
		}
	}
);

export default router;
