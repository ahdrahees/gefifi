import { Router, Request, Response } from 'express';
import { FieldValue } from '@google-cloud/firestore';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { Quote, WorkRequest, MaterialRequest, User, Message } from '../interfaces';
import { uploadFile } from '../file-storage';
import { attachmentUpload } from './shared/middleware';
import { v4 as uuidv4 } from 'uuid';
// Import the existing db instance from data.ts
import { usersDB, workRequestsDB, materialRequestsDB, quotesDB, chatsDB } from '../data';

const router = Router();

console.log('[QUOTES] Quotes router initialized!');

// Helper function to validate user access to request
async function validateRequestAccess(
    requestId: string,
    requestType: 'work' | 'material',
    userId: string,
    userType: 'customer' | 'expert' | 'supplier'
): Promise<{ request: WorkRequest | MaterialRequest; hasAccess: boolean }> {
    try {
        let request: WorkRequest | MaterialRequest | null = null;

        if (requestType === 'work') {
            request = await workRequestsDB.findById(requestId) || null;
        } else {
            request = await materialRequestsDB.findById(requestId) || null;
        }

        if (!request) {
            return { request: null as any, hasAccess: false };
        }

        // Check if user has access to this request
        const hasAccess =
            request.customerId === userId || // Customer owns the request
            (requestType === 'work' && userType === 'expert' &&
                ((request as WorkRequest).interestedExperts?.includes(userId) ||
                    (request as WorkRequest).invitedExperts?.includes(userId))) ||
            (requestType === 'material' && userType === 'supplier' &&
                ((request as MaterialRequest).interestedSuppliers?.includes(userId) ||
                    (request as MaterialRequest).invitedSuppliers?.includes(userId)));

        return { request, hasAccess: !!hasAccess };
    } catch (error) {
        console.error('Error validating request access:', error);
        return { request: null as any, hasAccess: false };
    }
}

// Helper function to check if user can submit quote
async function canSubmitQuote(
    requestId: string,
    requestType: 'work' | 'material',
    userId: string,
    userType: 'customer' | 'expert' | 'supplier'
): Promise<{ canSubmit: boolean; reason?: string }> {
    // Customers cannot submit quotes
    if (userType === 'customer') {
        return { canSubmit: false, reason: 'Customers cannot submit quotes' };
    }

    // Check if user type matches request type
    if (requestType === 'work' && userType !== 'expert') {
        return { canSubmit: false, reason: 'Only experts can quote on work requests' };
    }
    if (requestType === 'material' && userType !== 'supplier') {
        return { canSubmit: false, reason: 'Only suppliers can quote on material requests' };
    }

    // Check if user has access to the request
    const { request, hasAccess } = await validateRequestAccess(requestId, requestType, userId, userType);
    if (!hasAccess || !request) {
        return { canSubmit: false, reason: 'You do not have access to this request' };
    }

    // Check if request is still open for quotes
    if (request.status === 'completed' || request.status === 'cancelled' || request.status === 'closed') {
        return { canSubmit: false, reason: 'This request is no longer accepting quotes' };
    }

    // Allow contracted party to submit revisions
    if (request.status === 'contracted' || request.status === 'in_progress') {
        // For now, allow any interested/invited party to submit revisions when contracted
        // This can be enhanced later when contracted party tracking is implemented
        const isInterestedParty = requestType === 'work'
            ? ((request as WorkRequest).interestedExperts?.includes(userId) ||
                (request as WorkRequest).invitedExperts?.includes(userId))
            : ((request as MaterialRequest).interestedSuppliers?.includes(userId) ||
                (request as MaterialRequest).invitedSuppliers?.includes(userId));

        if (!isInterestedParty) {
            return { canSubmit: false, reason: 'This request is contracted with another party' };
        }
    }

    return { canSubmit: true };
}

// POST /api/quotes - Submit a new quote
router.post('/quotes', authenticateToken, attachmentUpload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            requestId,
            requestType,
            title,
            description,
            amount,
            currency = 'INR',
            validityDays = 30,
            additionalTerms
        } = req.body;

        const userId = req.user!.id;
        const userType = req.user!.userType;

        // Validate required fields
        if (!requestId || !requestType || !title) {
            return res.status(400).json({ message: 'Missing required fields: requestId, requestType, title' });
        }

        // Check if user can submit quote
        const { canSubmit, reason } = await canSubmitQuote(requestId, requestType, userId, userType);
        if (!canSubmit) {
            return res.status(403).json({ message: reason });
        }

        // Get request details
        const { request } = await validateRequestAccess(requestId, requestType, userId, userType);

        // Calculate validity date
        const validityDate = new Date();
        validityDate.setDate(validityDate.getDate() + parseInt(validityDays));

        // Process uploaded files
        const files = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const { filePath, fileName } = await uploadFile(file);
                files.push({
                    fileName: file.originalname,
                    filePath: filePath,
                    fileType: file.mimetype,
                    size: file.size
                });
            }
        }

        // Create quote object
        const quoteId = uuidv4();
        const quote: Quote = {
            id: quoteId,
            requestId,
            requestType,
            expertSupplierId: userId,
            customerId: request.customerId,
            status: 'submitted',
            title: title.trim(),
            description: description?.trim(),
            amount: amount ? parseFloat(amount) : undefined,
            currency,
            validityDays: parseInt(validityDays),
            validityDate: validityDate.toISOString(),
            additionalTerms: additionalTerms?.trim(),
            files,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
        };

        // Save quote to database
        await quotesDB.create(quote);

        // Add quote ID to request's quotes array
        const requestRef = requestType === 'work' ? workRequestsDB : materialRequestsDB;
        const currentRequest = await requestRef.findById(requestId);
        if (currentRequest) {
            const updatedQuotes = [...(currentRequest.quotes || []), quoteId];
            await requestRef.update(requestId, {
                quotes: updatedQuotes,
                updatedAt: new Date().toISOString()
            });

            // Update request status to 'awaiting_quotes'/'quoting' if it's still 'open'
            if (currentRequest.status === 'open') {
                if (requestType === 'work') {
                    await requestRef.update(requestId, { status: 'awaiting_quotes' as any });
                } else {
                    await requestRef.update(requestId, { status: 'quoting' as any });
                }
            }
        }

        // Send system message for non-chat quote submissions
        // Find chat between customer and expert/supplier to send notification
        const allChats = await chatsDB.getAll();
        const relevantChat = allChats.find(chat =>
            chat.participants.includes(request.customerId) &&
            chat.participants.includes(userId)
        );

        if (relevantChat) {
            const systemMessageId = uuidv4();
            const systemMessage: Message = {
                id: systemMessageId,
                senderId: 'system',
                content: `[System] A new quote "${title}" has been submitted for "${request.title}".`,
                timestamp: new Date().toISOString(),
                messageType: 'text',
                // Add quoteRequestId for clickable system message
                quoteRequestId: requestId
            } as any;

            // Save system message to chat
            await chatsDB.createInSubcollection(relevantChat.id, 'messages', systemMessage);

            // Update chat's last message
            await chatsDB.update(relevantChat.id, {
                lastMessage: {
                    id: systemMessageId,
                    content: systemMessage.content,
                    timestamp: systemMessage.timestamp,
                    senderId: 'system'
                },
                updatedAt: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: 'Quote submitted successfully',
            quote: {
                ...quote,
                // Add enriched data for response
                expertSupplier: {
                    id: userId,
                    email: req.user!.email,
                    userType: req.user!.userType,
                    profile: {}
                },
                request: {
                    id: request.id,
                    title: request.title,
                    status: request.status
                }
            }
        });
    } catch (error) {
        console.error('Error submitting quote:', error);
        res.status(500).json({ message: 'Failed to submit quote' });
    }
});

// GET /api/quotes/request/:requestId - Get quotes for a specific request
router.get('/quotes/request/:requestId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { requestId } = req.params;
        const { requestType } = req.query;
        const userId = req.user!.id;
        const userType = req.user!.userType;

        if (!requestType || !['work', 'material'].includes(requestType as string)) {
            return res.status(400).json({ message: 'Invalid requestType. Must be "work" or "material"' });
        }

        // Check if user has access to this request
        const { request, hasAccess } = await validateRequestAccess(
            requestId,
            requestType as 'work' | 'material',
            userId,
            userType
        );

        if (!hasAccess || !request) {
            return res.status(403).json({ message: 'You do not have access to this request' });
        }

        // Get quotes for this request
        const allQuotes = await quotesDB.getAll();
        const quotes = allQuotes
            .filter(quote => quote.requestId === requestId)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .filter(quote => {
                // Filter quotes based on user type
                if (userType === 'customer') {
                    // Customers can see all quotes
                    return true;
                } else if (quote.expertSupplierId === userId) {
                    // Experts/Suppliers can only see their own quotes
                    return true;
                }
                return false;
            });

        // Enrich quotes with user data
        const enrichedQuotes = await Promise.all(quotes.map(async (quote) => {
            try {
                // Get expert/supplier data
                const expertSupplier = await usersDB.findById(quote.expertSupplierId);
                // Get customer data
                const customer = await usersDB.findById(quote.customerId);

                return {
                    ...quote,
                    expertSupplier: expertSupplier ? {
                        id: expertSupplier.id,
                        email: expertSupplier.email,
                        userType: expertSupplier.userType,
                        profile: expertSupplier.profile
                    } : null,
                    customer: customer ? {
                        id: customer.id,
                        email: customer.email,
                        userType: customer.userType,
                        profile: customer.profile
                    } : null,
                    request: {
                        id: request.id,
                        title: request.title,
                        status: request.status
                    }
                };
            } catch (error) {
                console.error('Error enriching quote:', error);
                return quote;
            }
        }));

        res.json({ quotes: enrichedQuotes });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ message: 'Failed to fetch quotes' });
    }
});

// PUT /api/quotes/:quoteId - Update a quote
router.put('/quotes/:quoteId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { quoteId } = req.params;
        const userId = req.user!.id;
        const userType = req.user!.userType;

        // Get existing quote
        const existingQuote = await quotesDB.findById(quoteId);
        if (!existingQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Check if user can update this quote
        if (existingQuote.expertSupplierId !== userId) {
            return res.status(403).json({ message: 'You can only update your own quotes' });
        }

        // Check if quote can be updated
        if (existingQuote.status === 'accepted' || existingQuote.status === 'expired') {
            return res.status(400).json({ message: 'Cannot update accepted or expired quotes' });
        }

        // Update quote
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // Remove fields that shouldn't be updated
        delete updateData.id;
        delete updateData.requestId;
        delete updateData.requestType;
        delete updateData.expertSupplierId;
        delete updateData.customerId;
        delete updateData.submittedAt;
        delete updateData.version;
        delete updateData.parentQuoteId;

        await quotesDB.update(quoteId, updateData);

        // Get updated quote
        const updatedQuote = await quotesDB.findById(quoteId);

        res.json({
            message: 'Quote updated successfully',
            quote: updatedQuote
        });
    } catch (error) {
        console.error('Error updating quote:', error);
        res.status(500).json({ message: 'Failed to update quote' });
    }
});

// PUT /api/quotes/:quoteId/status - Update quote status
router.put('/quotes/:quoteId/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { quoteId } = req.params;
        const { status } = req.body;
        const userId = req.user!.id;
        const userType = req.user!.userType;

        // Validate status
        const validStatuses = ['submitted', 'under_review', 'accepted', 'rejected', 'expired', 'revised'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Get existing quote
        const existingQuote = await quotesDB.findById(quoteId);
        if (!existingQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Check permissions
        const canUpdateStatus =
            existingQuote.customerId === userId || // Customer can update status
            (existingQuote.expertSupplierId === userId && status === 'revised'); // Expert/Supplier can only revise

        if (!canUpdateStatus) {
            return res.status(403).json({ message: 'You do not have permission to update this quote status' });
        }

        // Update quote status
        await quotesDB.update(quoteId, {
            status,
            updatedAt: new Date().toISOString()
        });

        // If quote is accepted, reject all other quotes for the same request
        if (status === 'accepted') {
            const allQuotes = await quotesDB.getAll();
            const otherQuotes = allQuotes.filter(quote =>
                quote.requestId === existingQuote.requestId &&
                quote.expertSupplierId !== existingQuote.expertSupplierId
            );

            // Update all other quotes to rejected status
            for (const quote of otherQuotes) {
                await quotesDB.update(quote.id, {
                    status: 'rejected',
                    updatedAt: new Date().toISOString()
                });
            }

            // Update request status to contracted
            const requestRef = existingQuote.requestType === 'work' ? workRequestsDB : materialRequestsDB;
            await requestRef.update(existingQuote.requestId, {
                status: 'contracted',
                updatedAt: new Date().toISOString()
            });
        }

        // Create system message for status update if there's a chat
        if (existingQuote.chatId) {
            const systemMessageId = uuidv4();
            let systemMessageContent = '';

            switch (status) {
                case 'accepted':
                    systemMessageContent = `[System] Quote "${existingQuote.title}" has been accepted. The request is now contracted.`;
                    break;
                case 'rejected':
                    systemMessageContent = `[System] Quote "${existingQuote.title}" has been rejected.`;
                    break;
                case 'under_review':
                    systemMessageContent = `[System] Quote "${existingQuote.title}" is now under review.`;
                    break;
                case 'expired':
                    systemMessageContent = `[System] Quote "${existingQuote.title}" has expired.`;
                    break;
                case 'revised':
                    systemMessageContent = `[System] Quote "${existingQuote.title}" has been revised.`;
                    break;
                default:
                    systemMessageContent = `[System] Quote "${existingQuote.title}" status updated to ${status}.`;
            }

            const systemMessage: Message = {
                id: systemMessageId,
                senderId: 'system',
                content: systemMessageContent,
                timestamp: new Date().toISOString(),
                messageType: 'text'
            };

            // Save system message to chat
            await chatsDB.createInSubcollection(existingQuote.chatId, 'messages', systemMessage);

            // Update chat's last message
            await chatsDB.update(existingQuote.chatId, {
                lastMessage: {
                    id: systemMessageId,
                    content: systemMessage.content,
                    timestamp: systemMessage.timestamp,
                    senderId: 'system'
                },
                updatedAt: new Date().toISOString()
            });
        }

        res.json({
            message: 'Quote status updated successfully',
            status
        });
    } catch (error) {
        console.error('Error updating quote status:', error);
        res.status(500).json({ message: 'Failed to update quote status' });
    }
});

// POST /api/quotes/:quoteId/revise - Create a quote revision
router.post('/quotes/:quoteId/revise', authenticateToken, attachmentUpload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { quoteId } = req.params;
        const userId = req.user!.id;

        // Get existing quote
        const existingQuote = await quotesDB.findById(quoteId);
        if (!existingQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Check if user can revise this quote
        if (existingQuote.expertSupplierId !== userId) {
            return res.status(403).json({ message: 'You can only revise your own quotes' });
        }

        // Check if quote can be revised
        if (existingQuote.status === 'accepted' || existingQuote.status === 'expired') {
            return res.status(400).json({ message: 'Cannot revise accepted or expired quotes' });
        }

        // Process uploaded files
        const files = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const { filePath, fileName } = await uploadFile(file);
                files.push({
                    fileName: file.originalname,
                    filePath: filePath,
                    fileType: file.mimetype,
                    size: file.size
                });
            }
        }

        // Create new quote revision
        const newQuoteId = uuidv4();
        const revisionQuote: Quote = {
            id: newQuoteId,
            requestId: existingQuote.requestId,
            requestType: existingQuote.requestType,
            expertSupplierId: existingQuote.expertSupplierId,
            customerId: existingQuote.customerId,
            status: 'submitted',
            title: req.body.title || existingQuote.title,
            description: req.body.description || existingQuote.description,
            amount: req.body.amount ? parseFloat(req.body.amount) : existingQuote.amount,
            currency: req.body.currency || existingQuote.currency,
            validityDays: req.body.validityDays ? parseInt(req.body.validityDays) : existingQuote.validityDays,
            validityDate: req.body.validityDays ?
                new Date(Date.now() + parseInt(req.body.validityDays) * 24 * 60 * 60 * 1000).toISOString() :
                existingQuote.validityDate,
            additionalTerms: req.body.additionalTerms || existingQuote.additionalTerms,
            files: files.length > 0 ? files : existingQuote.files,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: existingQuote.version + 1,
            parentQuoteId: quoteId
        };

        // Save new quote revision
        await quotesDB.create(revisionQuote);

        // Update original quote status to revised
        await quotesDB.update(quoteId, {
            status: 'revised',
            updatedAt: new Date().toISOString()
        });

        // Add new quote ID to request's quotes array
        const requestRef = existingQuote.requestType === 'work' ? workRequestsDB : materialRequestsDB;
        const currentRequest = await requestRef.findById(existingQuote.requestId);
        if (currentRequest) {
            const updatedQuotes = [...(currentRequest.quotes || []), newQuoteId];
            await requestRef.update(existingQuote.requestId, {
                quotes: updatedQuotes,
                updatedAt: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: 'Quote revision created successfully',
            quote: revisionQuote
        });
    } catch (error) {
        console.error('Error creating quote revision:', error);
        res.status(500).json({ message: 'Failed to create quote revision' });
    }
});

// DELETE /api/quotes/:quoteId - Delete a quote
router.delete('/quotes/:quoteId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { quoteId } = req.params;
        const userId = req.user!.id;

        // Get existing quote
        const existingQuote = await quotesDB.findById(quoteId);
        if (!existingQuote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Check if user can delete this quote
        if (existingQuote.expertSupplierId !== userId) {
            return res.status(403).json({ message: 'You can only delete your own quotes' });
        }

        // Check if quote can be deleted
        if (existingQuote.status === 'accepted') {
            return res.status(400).json({ message: 'Cannot delete accepted quotes' });
        }

        // Delete quote
        await quotesDB.delete(quoteId);

        // Remove quote ID from request's quotes array
        const requestRef = existingQuote.requestType === 'work' ? workRequestsDB : materialRequestsDB;
        const currentRequest = await requestRef.findById(existingQuote.requestId);
        if (currentRequest) {
            const updatedQuotes = (currentRequest.quotes || []).filter(id => id !== quoteId);
            await requestRef.update(existingQuote.requestId, {
                quotes: updatedQuotes,
                updatedAt: new Date().toISOString()
            });
        }

        res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ message: 'Failed to delete quote' });
    }
});


// POST /api/quotes/chat/:chatId - Submit quote through chat
router.post('/quotes/chat/:chatId', authenticateToken, attachmentUpload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { chatId } = req.params;
        const {
            requestId,
            requestType,
            title,
            description,
            amount,
            currency = 'INR',
            validityDays = 30,
            additionalTerms
        } = req.body;

        const userId = req.user!.id;
        const userType = req.user!.userType;

        // Validate required fields
        if (!requestId || !requestType || !title) {
            return res.status(400).json({ message: 'Missing required fields: requestId, requestType, title' });
        }

        // Check if user can submit quote
        const { canSubmit, reason } = await canSubmitQuote(requestId, requestType, userId, userType);
        if (!canSubmit) {
            return res.status(403).json({ message: reason });
        }

        // Get chat to verify user is participant
        const chat = await chatsDB.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        if (!chat.participants.includes(userId)) {
            return res.status(403).json({ message: 'You are not a participant in this chat' });
        }

        // Get request details
        const { request } = await validateRequestAccess(requestId, requestType, userId, userType);

        // Calculate validity date
        const validityDate = new Date();
        validityDate.setDate(validityDate.getDate() + parseInt(validityDays));

        // Process uploaded files
        const files = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const { filePath, fileName } = await uploadFile(file);
                files.push({
                    fileName: file.originalname,
                    filePath: filePath,
                    fileType: file.mimetype,
                    size: file.size
                });
            }
        }

        // Create quote object
        const quoteId = uuidv4();
        const quote: Quote = {
            id: quoteId,
            requestId,
            requestType,
            expertSupplierId: userId,
            customerId: request.customerId,
            status: 'submitted',
            title: title.trim(),
            description: description?.trim(),
            amount: amount ? parseFloat(amount) : undefined,
            currency,
            validityDays: parseInt(validityDays),
            validityDate: validityDate.toISOString(),
            additionalTerms: additionalTerms?.trim(),
            files,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            chatId,
            messageId: uuidv4() // Will be set when message is created
        };

        // Save quote to database
        await quotesDB.create(quote);

        // Add quote ID to request's quotes array
        const requestRef = requestType === 'work' ? workRequestsDB : materialRequestsDB;
        const currentRequest = await requestRef.findById(requestId);
        if (currentRequest) {
            const updatedQuotes = [...(currentRequest.quotes || []), quoteId];
            await requestRef.update(requestId, {
                quotes: updatedQuotes,
                updatedAt: new Date().toISOString()
            });

            // Update request status to 'awaiting_quotes'/'quoting' if it's still 'open'
            if (currentRequest.status === 'open') {
                if (requestType === 'work') {
                    await requestRef.update(requestId, { status: 'awaiting_quotes' as any });
                } else {
                    await requestRef.update(requestId, { status: 'quoting' as any });
                }
            }
        }

        // Create quote message in chat (QuoteMessage type)
        const messageId = uuidv4();
        const quoteMessage: Message = {
            id: messageId,
            senderId: userId,
            content: `${title}${description ? ` - ${description}` : ''}`,
            timestamp: new Date().toISOString(),
            messageType: 'quote',
            // Include file attachments in the message
            attachments: files.length > 0 ? files : undefined,
            // QuoteMessage specific fields
            quoteId: quoteId,
            requestId: requestId,
            requestType: requestType as 'work' | 'material',
            quoteAmount: amount ? parseFloat(amount) : undefined,
            quoteValidity: validityDate.toISOString(),
            quoteTitle: title
        } as any; // Cast to any to include QuoteMessage fields

        // Save quote message to chat
        await chatsDB.createInSubcollection(chatId, 'messages', quoteMessage);

        // Update quote with message ID
        await quotesDB.update(quoteId, { messageId });

        // Update chat's last message
        await chatsDB.update(chatId, {
            lastMessage: {
                id: messageId,
                content: quoteMessage.content,
                timestamp: quoteMessage.timestamp,
                senderId: userId
            },
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            message: 'Quote submitted successfully',
            quote: {
                ...quote,
                messageId
            }
        });
    } catch (error) {
        console.error('Error submitting quote through chat:', error);
        res.status(500).json({ message: 'Failed to submit quote' });
    }
});

export default router;
