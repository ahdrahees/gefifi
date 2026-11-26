import { Router, Response } from 'express';
import { FirestoreCollection } from '../data';
import { MaterialRequest, WorkRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { checkAndExpireWorkRequests } from './work-requests';
import { checkAndExpireMaterialRequests } from './material-requests';

const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');

const router = Router();

/**
 * GET /api/requests/:id
 *
 * Returns the request and its type without requiring the client to guess
 * between /work-requests/:id and /material-requests/:id. The my-requests and
 * quote pages used to try the work endpoint first, which logged a 404 for
 * every material request.
 */
router.get('/requests/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const requestId = req.params.id;
		if (!requestId) {
			return res.status(400).json({ message: 'Request ID parameter is required.' });
		}

		const workRequest = await workRequestsDB.findById(requestId);
		if (workRequest) {
			const [current] = await checkAndExpireWorkRequests([workRequest]);
			const isCustomer = user.id === current.customerId;
			const isInterestedExpert = current.interestedExperts?.includes(user.id);
			const isInvitedExpert = current.invitedExperts?.includes(user.id);
			const isExpertViewingOpen = user.userType === 'expert' && current.status === 'open';

			if (!isCustomer && !isInterestedExpert && !isInvitedExpert && !isExpertViewingOpen) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You do not have access to this work request.' });
			}

			return res.status(200).json({ type: 'work', request: current });
		}

		const materialRequest = await materialRequestsDB.findById(requestId);
		if (materialRequest) {
			const [current] = await checkAndExpireMaterialRequests([materialRequest]);
			const isCustomer = user.id === current.customerId;
			const isInterestedSupplier = current.interestedSuppliers?.includes(user.id);
			const isInvitedSupplier = current.invitedSuppliers?.includes(user.id);
			const isSupplierViewingOpen = user.userType === 'supplier' && current.status === 'open';

			if (!isCustomer && !isInterestedSupplier && !isInvitedSupplier && !isSupplierViewingOpen) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You do not have access to this material request.' });
			}

			return res.status(200).json({ type: 'material', request: current });
		}

		return res.status(404).json({ message: 'Request not found.' });
	} catch (error: unknown) {
		console.error(`Error fetching request ${req.params.id}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch request.', error: errorMessage });
	}
});

export default router;
