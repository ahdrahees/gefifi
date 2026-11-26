import { Router, Response } from 'express';
import { agentApprovalsDB } from '../data';
import { AgentApprovalRecord } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';

const router = Router();

// A claim older than this can be taken over by another device. This keeps a
// crashed tab from blocking the card forever without allowing two live tabs to
// confirm together.
const CLAIM_TTL_MS = 2 * 60 * 1000;

function claimIsStale(record: AgentApprovalRecord): boolean {
	const claimedAt = Date.parse(record.claimedAt);
	return Number.isNaN(claimedAt) || Date.now() - claimedAt > CLAIM_TTL_MS;
}

function publicRecord(record: AgentApprovalRecord) {
	return {
		id: record.id,
		status: record.status,
		href: record.href,
		label: record.label,
		claimedAt: record.claimedAt,
		completedAt: record.completedAt,
		updatedAt: record.updatedAt
	};
}

function canReadOrMutate(record: AgentApprovalRecord, userId: string): boolean {
	return record.userId === userId;
}

// GET /api/agent-approvals/:approvalId
// Returns the shared confirmation state for an approval card.
router.get(
	'/agent-approvals/:approvalId',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const record = await agentApprovalsDB.findById(req.params.approvalId);
			if (!record) {
				return res.status(404).json({ message: 'Approval not found.' });
			}
			if (!canReadOrMutate(record, user.id)) {
				return res.status(403).json({ message: 'Forbidden.' });
			}
			res.status(200).json(publicRecord(record));
		} catch (error: unknown) {
			console.error('Error reading agent approval:', error);
			res.status(500).json({ message: 'Failed to read approval state.' });
		}
	}
);

// POST /api/agent-approvals/:approvalId/claim
// Atomically reserves the approval for one confirmation attempt.
router.post(
	'/agent-approvals/:approvalId/claim',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { claimToken, action } = req.body as { claimToken?: unknown; action?: unknown };
			if (typeof claimToken !== 'string' || claimToken.length < 8) {
				return res.status(400).json({ message: 'A claim token is required.' });
			}
			if (typeof action !== 'string' || !action) {
				return res.status(400).json({ message: 'An approval action is required.' });
			}

			const approvalId = req.params.approvalId;
			const now = new Date().toISOString();

			const respondToExisting = async (existing: AgentApprovalRecord) => {
				if (existing.userId !== user.id) {
					return res.status(403).json({ message: 'Forbidden.' });
				}
				if (existing.status === 'completed') {
					return res.status(200).json({
						status: 'completed',
						href: existing.href,
						label: existing.label
					});
				}
				if (existing.claimToken === claimToken) {
					const refreshed = await agentApprovalsDB.update(approvalId, {
						claimedAt: now,
						updatedAt: now
					});
					return res.status(200).json({
						status: 'claimed',
						record: publicRecord(refreshed ?? existing)
					});
				}
				if (!claimIsStale(existing)) {
					return res.status(409).json({
						status: 'claimed',
						message: 'This approval is already being confirmed in another session.'
					});
				}
				const updated = await agentApprovalsDB.update(approvalId, {
					claimToken,
					claimedAt: now,
					updatedAt: now
				});
				return res.status(200).json({
					status: 'claimed',
					record: publicRecord(updated ?? existing)
				});
			};

			const existing = await agentApprovalsDB.findById(approvalId);
			if (existing) {
				return respondToExisting(existing);
			}

			const record: AgentApprovalRecord = {
				id: approvalId,
				userId: user.id,
				action,
				status: 'claimed',
				claimToken,
				claimedAt: now,
				completedAt: '',
				href: '',
				label: '',
				createdAt: now,
				updatedAt: now
			};
			const result = await agentApprovalsDB.createIfAbsent(record);
			if (result.created) {
				return res.status(200).json({ status: 'claimed', record: publicRecord(result.item) });
			}
			return respondToExisting(result.item);
		} catch (error: unknown) {
			console.error('Error claiming agent approval:', error);
			res.status(500).json({ message: 'Failed to claim approval.' });
		}
	}
);

// POST /api/agent-approvals/:approvalId/complete
// Marks the claimed approval complete and stores its result.
router.post(
	'/agent-approvals/:approvalId/complete',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { claimToken, href, label } = req.body as {
				claimToken?: unknown;
				href?: unknown;
				label?: unknown;
			};
			const record = await agentApprovalsDB.findById(req.params.approvalId);
			if (!record) {
				return res.status(404).json({ message: 'Approval not found.' });
			}
			if (!canReadOrMutate(record, user.id)) {
				return res.status(403).json({ message: 'Forbidden.' });
			}
			if (record.status === 'completed') {
				return res.status(200).json(publicRecord(record));
			}
			if (typeof claimToken !== 'string' || record.claimToken !== claimToken) {
				return res.status(409).json({
					message: 'This approval is claimed by another confirmation attempt.'
				});
			}

			const now = new Date().toISOString();
			const updated = await agentApprovalsDB.update(req.params.approvalId, {
				status: 'completed',
				href: typeof href === 'string' ? href : '',
				label: typeof label === 'string' && label ? label : 'Completed',
				completedAt: now,
				updatedAt: now
			});
			res.status(200).json(publicRecord(updated ?? record));
		} catch (error: unknown) {
			console.error('Error completing agent approval:', error);
			res.status(500).json({ message: 'Failed to complete approval.' });
		}
	}
);

// POST /api/agent-approvals/:approvalId/release
// Releases a claim when the action failed so the user can retry.
router.post(
	'/agent-approvals/:approvalId/release',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { claimToken } = req.body as { claimToken?: unknown };
			const record = await agentApprovalsDB.findById(req.params.approvalId);
			if (!record) {
				return res.status(404).json({ message: 'Approval not found.' });
			}
			if (!canReadOrMutate(record, user.id)) {
				return res.status(403).json({ message: 'Forbidden.' });
			}
			if (record.status === 'completed') {
				return res.status(200).json(publicRecord(record));
			}
			if (typeof claimToken !== 'string' || record.claimToken !== claimToken) {
				return res.status(409).json({ message: 'This approval is claimed elsewhere.' });
			}
			await agentApprovalsDB.delete(req.params.approvalId);
			res.status(200).json({ released: true });
		} catch (error: unknown) {
			console.error('Error releasing agent approval:', error);
			res.status(500).json({ message: 'Failed to release approval.' });
		}
	}
);

export default router;
