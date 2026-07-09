import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { Contract, ContractComment, Attachment, User, WorkRequest, MaterialRequest } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { uploadEntityAttachment } from '../file-storage';
import { sendSystemMessage } from './shared/system-messages';
import { attachmentUpload } from './shared/middleware';
import crypto from 'crypto';

// Initialize databases
const contractsDB = new FirestoreCollection<Contract>('contracts');
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');

const router = Router();

// --- Contract Endpoints ---
router.get('/contracts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const allContracts = await contractsDB.getAll();
        const userContracts = allContracts.filter(
            (contract: Contract) =>
                contract.customerId === user.id || contract.expertSupplierId === user.id
        );
        userContracts.sort(
            (a: Contract, b: Contract) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        res.status(200).json(userContracts);
    } catch (error: unknown) {
        console.error('Error fetching contracts:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch contracts.', error: errorMessage });
    }
});

// --- Get Single Contract by ID ---
router.get(
    '/contracts/:contractId',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const contractId = req.params.contractId;

            if (!contractId) {
                return res.status(400).json({ message: 'Contract ID parameter is required.' });
            }

            const contract = await contractsDB.findById(contractId);
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found.' });
            }

            // Authorization: Ensure the current user is a party to this contract
            if (contract.customerId !== user.id && contract.expertSupplierId !== user.id) {
                return res
                    .status(403)
                    .json({ message: 'Forbidden. You are not authorized to view this contract.' });
            }

            res.status(200).json(contract);
        } catch (error: unknown) {
            console.error(`Error fetching contract ${req.params.contractId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to fetch contract details.', error: errorMessage });
        }
    }
);

router.post('/contracts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const initiator = req.user as JwtPayload;
        const {
            workRequestId,
            materialRequestId,
            customerId,
            expertSupplierId,
            workDetails,
            agreementSummary,
            contractDate,
            // New optional fields
            totalAmount,
            paymentTerms,
            advanceAmount,
            startDate,
            expectedCompletionDate,
            termsAndConditions,
            warrantyPeriod,
            cancellationPolicy
        } = req.body;

        // --- Validation ---
        if (
            (!workRequestId && !materialRequestId) ||
            (workRequestId && materialRequestId) ||
            !customerId ||
            !expertSupplierId ||
            !workDetails ||
            !agreementSummary
        ) {
            return res.status(400).json({
                message:
                    'Exactly one of workRequestId or materialRequestId must be provided, along with all other required fields.'
            });
        }

        const requestType = workRequestId ? 'work' : 'material';
        const contractType = requestType === 'work' ? 'expert_contract' : 'material_contract';
        const requestId = workRequestId || materialRequestId;

        // Validate that the request exists and get request data for participant validation
        let requestData: any = null;
        if (requestType === 'work') {
            const workRequest = await workRequestsDB.findById(requestId);
            if (!workRequest)
                return res.status(404).json({ message: `Work request with ID ${requestId} not found.` });
            if (workRequest.customerId !== customerId) {
                return res.status(400).json({
                    message: 'Mismatch: workRequest.customerId does not match provided customerId.'
                });
            }
            // Check if request is in valid status for contract creation
            if (!['open', 'in_discussion', 'awaiting_quotes'].includes(workRequest.status)) {
                return res.status(400).json({
                    message: `Work request must be in 'open', 'in_discussion', or 'awaiting_quotes' status to create a contract. Current status: ${workRequest.status}`
                });
            }
            requestData = workRequest;
        } else {
            // requestType === 'material'
            const materialRequest = await materialRequestsDB.findById(requestId);
            if (!materialRequest)
                return res
                    .status(404)
                    .json({ message: `Material request with ID ${requestId} not found.` });
            if (materialRequest.customerId !== customerId) {
                return res.status(400).json({
                    message: 'Mismatch: materialRequest.customerId does not match provided customerId.'
                });
            }
            // Check if request is in valid status for contract creation
            if (!['open', 'quoting'].includes(materialRequest.status)) {
                return res.status(400).json({
                    message: `Material request must be in 'open' or 'quoting' status to create a contract. Current status: ${materialRequest.status}`
                });
            }
            requestData = materialRequest;
        }

        // Validate users exist and are active
        const customer = await usersDB.findById(customerId);
        const provider = await usersDB.findById(expertSupplierId);
        if (!customer || !customer.isActive)
            return res
                .status(404)
                .json({ message: `Customer with ID ${customerId} not found or inactive.` });
        if (!provider || !provider.isActive)
            return res
                .status(404)
                .json({ message: `Expert/Supplier with ID ${expertSupplierId} not found or inactive.` });
        if (provider.userType !== 'expert' && provider.userType !== 'supplier') {
            return res
                .status(400)
                .json({ message: 'expertSupplierId must belong to an expert or supplier user.' });
        }

        // Enhanced participant validation - check both interested and invited users
        const isProviderEligible = (() => {
            if (requestType === 'work') {
                // For work requests, check if provider is expert and is either interested or invited
                if (provider.userType === 'expert') {
                    const interestedExperts = requestData.interestedExperts || [];
                    const invitedExperts = requestData.invitedExperts || [];
                    return (
                        interestedExperts.includes(expertSupplierId) ||
                        invitedExperts.includes(expertSupplierId)
                    );
                }
                // Suppliers can also work on work requests in some cases
                if (provider.userType === 'supplier') {
                    const interestedSuppliers = requestData.interestedSuppliers || [];
                    const invitedSuppliers = requestData.invitedSuppliers || [];
                    return (
                        interestedSuppliers.includes(expertSupplierId) ||
                        invitedSuppliers.includes(expertSupplierId)
                    );
                }
                return false;
            } else {
                // For material requests, check if provider is supplier and is either interested or invited
                if (provider.userType === 'supplier') {
                    const interestedSuppliers = requestData.interestedSuppliers || [];
                    const invitedSuppliers = requestData.invitedSuppliers || [];
                    return (
                        interestedSuppliers.includes(expertSupplierId) ||
                        invitedSuppliers.includes(expertSupplierId)
                    );
                }
                return false;
            }
        })();

        if (!isProviderEligible) {
            return res.status(403).json({
                message: `The ${provider.userType} must be either interested in or invited to this ${requestType} request to create a contract.`
            });
        }

        // Authorization check - contract creator must be either customer or the eligible provider
        if (initiator.id !== customerId && initiator.id !== expertSupplierId) {
            return res.status(403).json({
                message:
                    'Forbidden. Contract creator must be the customer or the designated expert/supplier.'
            });
        }

        // Check for existing active contracts
        const allContracts = await contractsDB.getAll();
        const existingActiveContract = allContracts.find((contract: any) => {
            const isForSameRequest =
                (requestType === 'work' && contract.workRequestId === requestId) ||
                (requestType === 'material' && contract.materialRequestId === requestId);
            const isActive = !['cancelled', 'terminated'].includes(contract.status);
            return isForSameRequest && isActive;
        });

        if (existingActiveContract) {
            return res.status(409).json({
                message: `An active contract already exists for this ${requestType} request. Contract ID: ${existingActiveContract.id}`
            });
        }
        const now = new Date().toISOString();
        const contractId = crypto.randomUUID();

        const initialCustomerSigned = false;
        const initialExpertSupplierSigned = false;
        const initialStatus: Contract['status'] = 'draft';

        // Construct contract object with all fields
        const newContract: Partial<Contract> = {
            id: contractId,
            customerId,
            expertSupplierId,
            workDetails,
            agreementSummary,
            contractDate: contractDate || now,
            customerSigned: initialCustomerSigned,
            expertSupplierSigned: initialExpertSupplierSigned,
            requestType: requestType,
            contractType: contractType,
            status: initialStatus,
            createdAt: now,
            updatedAt: now
        };

        // Add optional financial fields if provided
        if (totalAmount !== undefined) newContract.totalAmount = totalAmount;
        if (paymentTerms) newContract.paymentTerms = paymentTerms;
        if (advanceAmount !== undefined) newContract.advanceAmount = advanceAmount;

        // Add optional timeline fields if provided
        if (startDate) newContract.startDate = startDate;
        if (expectedCompletionDate) newContract.expectedCompletionDate = expectedCompletionDate;

        // Add optional legal fields if provided
        if (termsAndConditions) newContract.termsAndConditions = termsAndConditions;
        if (warrantyPeriod) newContract.warrantyPeriod = warrantyPeriod;
        if (cancellationPolicy) newContract.cancellationPolicy = cancellationPolicy;

        if (workRequestId) newContract.workRequestId = workRequestId;
        if (materialRequestId) newContract.materialRequestId = materialRequestId;

        console.log(
            '[POST /api/contracts] Attempting to create contract with data:',
            JSON.stringify(newContract, null, 2)
        );
        const createdContract = await contractsDB.create(newContract as Contract);
        console.log(
            '[POST /api/contracts] Successfully created contract in DB, ID:',
            createdContract.id
        );

        // Send a system message to the chat
        await sendSystemMessage(
            createdContract.customerId,
            createdContract.expertSupplierId,
            `A new contract draft (ID: ${createdContract.id.substring(
                0,
                8
            )}) has been created and is ready for review.`,
            { contractId: createdContract.id }
        );

        // Optionally, update the status of the original request
        if (requestType === 'work') {
            const workRequest = await workRequestsDB.findById(requestId); // Refetch to be safe
            if (
                workRequest &&
                (workRequest.status === 'in_discussion' ||
                    workRequest.status === 'open' ||
                    workRequest.status === 'awaiting_quotes')
            ) {
                console.log(
                    `[POST /api/contracts] Updating work request ${workRequest.id} status to 'contracted'.`
                );
                await workRequestsDB.update(workRequest.id, { status: 'contracted', updatedAt: now });
            }
        } else {
            // requestType === 'material'
            const materialRequest = await materialRequestsDB.findById(requestId);
            if (
                materialRequest &&
                (materialRequest.status === 'open' || materialRequest.status === 'quoting')
            ) {
                console.log(
                    `[POST /api/contracts] Updating material request ${materialRequest.id} status to 'contracted'.`
                );
                await materialRequestsDB.update(materialRequest.id, {
                    status: 'contracted',
                    updatedAt: now
                });
            }
        }

        // Remove request IDs from associated chat documents to prevent duplicate contract creation
        try {
            const chatsDB = new FirestoreCollection('chats');
            const allChats = await chatsDB.getAll();
            const requestFieldName = requestType === 'work' ? 'workRequestId' : 'materialRequestId';

            // Find chats that have this specific request ID
            const chatsToUpdate = allChats.filter((chat: any) => chat[requestFieldName] === requestId);

            // Update each chat to remove the request ID
            for (const chat of chatsToUpdate) {
                const updateData: any = { updatedAt: now };
                updateData[requestFieldName] = null; // Remove the request ID

                console.log(
                    `[POST /api/contracts] Removing ${requestFieldName} from chat ${chat.id} after contract creation`
                );
                await chatsDB.update(chat.id, updateData);
            }

            if (chatsToUpdate.length > 0) {
                console.log(
                    `[POST /api/contracts] Updated ${chatsToUpdate.length} chat(s) to remove ${requestFieldName}`
                );
            }
        } catch (chatUpdateError: unknown) {
            console.error('Error updating chat documents after contract creation:', chatUpdateError);
            // Don't fail the contract creation if chat update fails
        }

        res.status(201).json(createdContract);
    } catch (error: unknown) {
        console.error('Error in POST /api/contracts route:', error); // More specific error origin
        const errorMessage =
            error instanceof Error
                ? error.message
                : 'An unknown error occurred during contract creation.';
        if (errorMessage.includes('already exists')) {
            return res.status(409).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Failed to create contract.', error: errorMessage });
    }
});

export default router;
