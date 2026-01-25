// gefifi-2/src/frontend/src/lib/types.ts

/**
 * This file serves as the central repository for all shared TypeScript types
 * used across the GEFIFI frontend application.
 *
 * By centralizing types, we ensure consistency, reduce code duplication,
 * and improve maintainability. These types should align with the data models
 * defined in the backend's `interfaces.ts`.
 */

// --- User and Authentication Types ---

/**
 * Defines the structure for a user's profile data.
 * This is nested within the main User object. All fields are optional
 * to accommodate different user types and profile completion levels.
 */
export type UserProfile = {
	// --- Common Fields (Can apply to any user type) ---
	fullName?: string;
	avatarUrl?: string;
	location?: string;
	phoneNumber?: string;
	experience?: string; // e.g., "5 years"

	// --- Expert-Specific Fields ---
	expertise?: string; // e.g., "Plumbing", "Electrical Work"

	// --- Supplier-Specific Fields ---
	companyName?: string; // e.g., "ABC Building Materials"
	category?: string; // e.g., "Cement & Steel", "Paints & Finishes"
};

/**
 * Represents the authenticated user object stored in the authStore.
 * This is the primary user object used throughout the frontend.
 * It omits sensitive data like the password.
 */
export type AuthUser = {
	id: string;
	email: string;
	userType: 'customer' | 'expert' | 'supplier';
	profile: UserProfile;
	createdAt: string;
	updatedAt: string;
	isActive?: boolean;
	googleId?: string;
};

// --- Core Application Data Types ---

/**
 * Represents a work request posted by a customer.
 */
export type WorkRequest = {
	id: string;
	customerId: string;
	title: string;
	description: string;
	images: string[];
	location: string;
	expectedCost?: number;
	timeline?: string;
	materialsSuggested?: string;
	status:
	| 'open'
	| 'in_discussion'
	| 'awaiting_quotes'
	| 'contracted'
	| 'in_progress'
	| 'completed'
	| 'cancelled'
	| 'closed'
	| 'disputed';
	createdAt: string;
	updatedAt: string;
	category?: string;
	interestedExperts?: string[]; // Users who showed interest
	// interestedSuppliers?: string[]; // Users who showed interest
	invitedExperts?: string[]; // Users directly invited by customer
	// invitedSuppliers?: string[]; // Users directly invited by customer
	quotes?: string[]; // Array of quote IDs
};

/**
 * Represents a file attachment, typically used in Material Requests or Contracts.
 */
export type Attachment = {
	fileName: string;
	filePath: string; // Public URL to the file in GCS
	fileType: string; // MIME type
	size: number; // in bytes
};

/**
 * Represents a request for materials, either standalone or linked to a WorkRequest.
 * This should align with the backend's MaterialRequest interface.
 */
export type MaterialRequest = {
	id: string;
	customerId: string;
	title: string;
	description: string;
	deliveryLocation: string;
	deliveryDate?: string;
	linkedWorkRequestId?: string;
	attachments?: Attachment[];
	items: {
		itemName: string;
		quantity: string;
		notes?: string;
	}[];
	status: 'open' | 'quoting' | 'ordered' | 'contracted' | 'completed' | 'cancelled';
	createdAt: string;
	updatedAt: string;
	interestedSuppliers?: string[]; // Users who showed interest
	invitedSuppliers?: string[]; // Users directly invited by customer
	quotes?: string[]; // Array of quote IDs
};

/**
 * Represents a chat conversation between two or more users.
 */
export type Chat = {
	id: string;
	participants: string[];
	workRequestId?: string;
	materialRequestId?: string;
	createdAt: string;
	updatedAt: string;
	// Frontend-enriched properties can be added where this type is used
	// e.g., displayName?: string;
	lastMessage?: {
		id: string;
		content: string;
		timestamp: string;
		senderId: string;
		images?: string[];
		audioType?: 'voice';
		contractId?: string;
		ExpertRequestId?: string;
		MaterialRequestId?: string;
	};
};

/**
 * Represents a single message within a chat.
 */
export type Message = {
	id: string;
	senderId: string;
	content: string;
	images?: string[];
	attachments?: Array<{
		fileName: string;
		filePath: string; // GCS file URL
		fileType: string; // MIME type
		size: number; // File size in bytes
	}>; // Array of file attachments (non-images)
	timestamp: string;
	// Voice message support
	audioType?: 'voice';
	audioUrl?: string;
	audioDuration?: number;
	signedAudioUrl?: string; // Temporary signed URL for playback
	// Entity reference fields for clickable messages
	contractId?: string; // Reference to contract for navigation
	ExpertRequestId?: string; // Reference to work request for navigation (preparing for future migration)
	MaterialRequestId?: string; // Reference to material request for navigation
	quoteRequestId?: string; // Reference to quote request for navigation (clickable system messages)
	// Quote message fields (for messageType: 'quote')
	quoteId?: string; // Quote ID for quote messages
	requestId?: string; // Request ID for quote messages
	requestType?: 'work' | 'material'; // Request type for quote messages
	quoteAmount?: number; // Quote amount for quote messages
	quoteValidity?: string; // Quote validity date for quote messages
	quoteTitle?: string; // Quote title for quote messages
	// Message type for different message formats
	messageType?: 'text' | 'quote' | 'file' | 'voice';
};

/**
 * Response type for paginated messages API
 */
export type MessagesResponse = {
	messages: Message[];
	totalCount: number;
	hasMore: boolean;
};

/**
 * Response type for user interest API
 */
export type UserInterestResponse = {
	chatId: string;
	initialMessage: string;
	message?: string;
};

// --- Contract and Project Types ---

/**
 * Represents a comment on a contract.
 */
export type ContractComment = {
	id: string;
	authorId: string; // User ID of the comment author
	comment: string; // The comment text
	timestamp: string; // ISO 8601 date string
	type: 'revision_request' | 'signature_comment' | 'general'; // Type of comment
	attachments?: Attachment[]; // Optional file attachments
};

/**
 * Represents a link between contracts.
 */
export type ContractLink = {
	contractId: string; // ID of the linked contract
	relationshipType: 'reference'; // Type of relationship (extensible for future)
	linkedBy: string; // User ID who created the link
	linkedAt: string; // ISO 8601 date string when link was created
	visibility: 'private' | 'shared'; // Privacy level of the link
	reason?: string; // Optional reason for linking
};

/**
 * Defines the possible statuses for a contract.
 */
export type ContractStatus =
	| 'draft'
	| 'revision_requested'
	| 'awaiting_signatures'
	| 'signed'
	| 'in_progress'
	| 'completed'
	| 'disputed'
	| 'cancelled'
	| 'terminated';

/**
 * Represents a formal agreement between a customer and a provider.
 */
export type Contract = {
	id: string;
	customerId: string;
	expertSupplierId: string;
	requestType: 'work' | 'material'; // Keep for backward compatibility
	contractType: 'expert_contract' | 'material_contract'; // New descriptive type
	workRequestId?: string;
	materialRequestId?: string;
	workDetails: string; // Detailed scope of work or material list
	agreementSummary: string; // High-level agreement summary
	contractDate: string;

	// Financial Terms
	totalAmount?: number; // Total contract value
	paymentTerms?: string; // Payment schedule/terms (e.g., "50% advance, 50% on completion")
	advanceAmount?: number; // Upfront payment amount

	// Timeline
	startDate?: string; // Project start date
	expectedCompletionDate?: string; // Planned completion date
	actualCompletionDate?: string; // Actual completion date (set when completed)

	// Legal & Compliance
	termsAndConditions?: string; // Detailed terms and conditions
	warrantyPeriod?: string; // Warranty period (e.g., "6 months", "1 year")
	cancellationPolicy?: string; // Cancellation terms

	// Attachments
	attachments?: Attachment[]; // Contract documents, specifications, etc.

	// Comments and Feedback
	comments?: ContractComment[]; // Comments and revision requests

	// Contract Linking
	linkedContracts?: ContractLink[]; // Array of linked contracts

	// Signatures
	customerSigned: boolean;
	customerSignatureTimestamp?: string;
	expertSupplierSigned: boolean;
	expertSupplierSignatureTimestamp?: string;

	// Status & Tracking
	status: ContractStatus;
	createdAt: string;
	updatedAt: string;
	// Frontend-enriched properties can be added where this type is used
	// e.g., workRequestTitle?: string;
};

/**
 * Represents a project in the "My Projects" list view, which is an
 * enriched contract with details from other models for easy display.
 */
export type ProjectSummary = {
	id: string; // Contract ID
	workRequestTitle?: string;
	otherPartyName?: string;
	status: ContractStatus;
	contractDate: string;
	workRequestId?: string;
};

// --- Quote Management Types ---

/**
 * Represents a quote submitted by an expert or supplier for a work or material request.
 */
export type Quote = {
	id: string;
	requestId: string; // workRequestId or materialRequestId
	requestType: 'work' | 'material';
	expertSupplierId: string;
	customerId: string;
	status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'expired' | 'revised';

	// Quote Details
	title: string;
	description?: string;
	amount?: number;
	currency?: string;
	validityDays?: number;
	validityDate?: string;
	additionalTerms?: string;

	// Files
	files: Array<{
		fileName: string;
		filePath: string;
		fileType: string;
		size: number;
	}>;

	// Metadata
	submittedAt: string;
	updatedAt: string;
	version: number;
	parentQuoteId?: string; // For revisions

	// Chat Integration
	chatId?: string;
	messageId?: string;

	// Frontend-enriched properties
	expertSupplier?: AuthUser;
	customer?: AuthUser;
	request?: WorkRequest | MaterialRequest;
};

/**
 * Represents a quote message in chat
 */
export type QuoteMessage = Message & {
	messageType: 'quote';
	quoteId: string;
	requestId: string;
	requestType: 'work' | 'material';
	quoteAmount?: number;
	quoteValidity?: string;
	quoteTitle?: string;
};

/**
 * Defines the structure for a project, which is a container for work and/or material components.
 * This should align with the backend's Project interface.
 */
export type Project = {
	id: string;
	title: string;
	customerId: string;
	workComponent?: {
		expertId: string;
		contractId: string;
		chatId?: string;
		status: string; // Using string for flexibility on the client
		statusHistory: { status: string; updatedAt: string; updatedBy: string }[];
	};
	materialComponent?: {
		supplierId: string;
		contractId: string;
		chatId?: string;
		status: string; // Using string for flexibility on the client
		statusHistory: { status: string; updatedAt: string; updatedBy: string }[];
	};
	createdAt: string;
	updatedAt: string;
	// Frontend-enriched properties
	workRequest?: WorkRequest;
	materialRequest?: MaterialRequest;
	customer?: AuthUser;
	expert?: AuthUser;
	supplier?: AuthUser;
};

/**
 * For UI type in svelte
 */
export type RequestWithType = (WorkRequest | MaterialRequest) & {
	contractInfo?: Contract;
	chatId?: string;
	requestType: 'work' | 'material';
};

/**
 * For UI type in svelte
 */
export interface UserProfileUI {
	id: string;
	email: string;
	userType: 'customer' | 'expert' | 'supplier' | string;
	profile?: {
		fullName?: string;
		mainExpertise?: string;
		mainMaterial?: string;
		location?: string;
		avatarUrl?: string;
		experience?: string; // e.g., "5 years"
		// --- Expert-Specific Fields ---
		expertise?: string; // e.g., "Plumbing", "Electrical Work"
		// --- Supplier-Specific Fields ---
		companyName?: string; // e.g., "ABC Building Materials"
		category?: string; // e.g., "Cement & Steel", "Paints & Finishes"
	};
}

/**
 * For UI type in svelte
 */
export type EnrichedChat = Chat & {
	displayName: string;
	avatarUrl?: string;
	otherUserProfile?: UserProfileUI;
	lastMessageSnippet: string;
};

/**
 * Status tabs for requests
 */
export type StatusTab = 'active' | 'contracted' | 'completed' | 'on_hold' | 'cancelled';
