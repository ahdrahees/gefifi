// gefifi-2/backend/src/interfaces.ts

/**
 * A base interface for all database documents to ensure they have an ID.
 */
export interface Identifiable {
	id: string;
}

// --- User and Authentication Types ---

/**
 * Defines the structure for a user's profile data.
 * This is nested within the main User object. All fields are optional
 * to accommodate different user types and profile completion levels.
 */
export interface UserProfile {
	// --- Common Fields ---
	fullName?: string;
	avatarUrl?: string; // URL to the profile picture in GCS
	location?: string; // General location, e.g., "City, State"
	phoneNumber?: string;
	experience?: string; // e.g., "5 years"

	// --- Expert-Specific Fields ---
	expertise?: string; // e.g., "Plumbing", "Electrical Work"

	// --- Supplier-Specific Fields ---
	companyName?: string; // e.g., "ABC Building Materials"
	category?: string; // e.g., "Cement & Steel", "Paints & Finishes"
}

/**
 * Represents a user in the system. This is the main user object.
 */
export interface User extends Identifiable {
	email?: string; // Optional (e.g. if signed up via phone number)
	phoneNumber?: string; // Top-level phone number for OTP verification
	password?: string; // Hashed password (unused/deprecated with OTP but kept for compatibility)
	googleId?: string; // Unique ID from Google Sign-In
	userType: 'customer' | 'expert' | 'supplier';
	profile: UserProfile;
	createdAt: string; // ISO 8601 date string
	updatedAt: string; // ISO 8601 date string
	isActive?: boolean; // For soft deletes or deactivation
}

/**
 * Represents an OTP session for phone login/registration.
 */
export interface OtpSession extends Identifiable {
	phoneNumber: string; // E.164 formatted phone number
	createdAt: string; // ISO timestamp when OTP session was created
	expiresAt: string; // ISO timestamp when current OTP expires
	lastSentAt: string; // ISO timestamp when OTP was last sent (for cooldown checks)
	attempts: number; // Verification attempts count
	resendCount: number; // Resends count
	twilioVerificationSid?: string; // Twilio Verify verification SID for cancellation/tracking
	twilioStatus?: string; // Last known Twilio Verify verification status
}

// --- Core Application Data Types ---

/**
 * Represents a work request posted by a customer.
 */
export interface WorkRequest extends Identifiable {
	customerId: string;
	title: string;
	description: string;
	images: string[]; // Array of GCS file URLs
	location: string;
	expectedCost?: number;
	timeline?: string;
	materialsSuggested?: string;
	expirationDate?: string; // Optional request expiration date/deadline (ISO string or YYYY-MM-DD)
	status:
		| 'open'
		| 'in_discussion'
		| 'awaiting_quotes'
		| 'contracted'
		| 'in_progress'
		| 'completed'
		| 'cancelled'
		| 'closed'
		| 'disputed'
		| 'expired';
	createdAt: string;
	updatedAt: string;
	category?: string;
	interestedExperts?: string[]; // Array of expert User IDs who showed interest
	// interestedSuppliers?: string[]; // Array of supplier User IDs who showed interest
	invitedExperts?: string[]; // Array of expert User IDs directly invited by customer
	// invitedSuppliers?: string[]; // Array of supplier User IDs directly invited by customer
	quotes?: string[]; // Array of quote IDs
}

/**
 * Represents a file attachment, used in Material Requests, Contracts, etc.
 */
export interface Attachment {
	fileName: string; // Original name of the file
	filePath: string; // Path/URL in GCS
	fileType: string; // MIME type
	size: number; // Size in bytes
}

/**
 * Represents a request for materials, either standalone or linked to a WorkRequest.
 */
export interface MaterialRequest extends Identifiable {
	customerId: string;
	title: string;
	description: string;
	deliveryLocation: string;
	deliveryDate?: string; // Optional preferred delivery date
	linkedWorkRequestId?: string; // Optional link to an existing WorkRequest
	attachments?: Attachment[]; // Array of attached files
	expirationDate?: string; // Optional request expiration date/deadline (ISO string or YYYY-MM-DD)
	items: {
		itemName: string;
		quantity: string; // e.g., '10 bags', '500 ft'
		notes?: string; // e.g., 'Grade 43'
	}[];
	status: 'open' | 'quoting' | 'ordered' | 'contracted' | 'completed' | 'cancelled' | 'expired';
	createdAt: string;
	updatedAt: string;
	interestedSuppliers?: string[]; // List of supplier User IDs who showed interest
	invitedSuppliers?: string[]; // List of supplier User IDs directly invited by customer
	quotes?: string[]; // Array of quote IDs
}

// --- Communication Types ---

/**
 * Represents a chat conversation between two or more users.
 */
export interface Chat extends Identifiable {
	participants: string[]; // Array of User IDs
	workRequestId?: string; // Link to a work request
	materialRequestId?: string; // Link to a material request
	createdAt: string;
	updatedAt: string;
	lastMessage?: {
		id: string;
		content: string;
		timestamp: string;
		senderId: string;
	};
}

/**
 * Represents a single message within a chat's subcollection.
 */
export interface Message extends Identifiable {
	senderId: string; // User ID of the sender, or 'system'
	content: string; // Text content of the message
	images?: string[]; // Array of GCS file URLs for images
	attachments?: Array<{
		fileName: string;
		filePath: string; // GCS file URL
		fileType: string; // MIME type
		size: number; // File size in bytes
	}>; // Array of file attachments (non-images)
	timestamp: string; // ISO 8601 date string
	// --- Voice message fields ---
	audioType?: 'voice';
	audioUrl?: string; // Private GCS path for the audio file
	audioDuration?: number; // Duration in seconds
	// --- Entity reference fields for clickable messages ---
	contractId?: string; // Reference to contract for navigation
	ExpertRequestId?: string; // Reference to work request for navigation (preparing for future migration)
	MaterialRequestId?: string; // Reference to material request for navigation
	quoteRequestId?: string; // Reference to quote request for navigation (clickable system messages)
	// --- Quote message fields (for messageType: 'quote') ---
	quoteId?: string; // Quote ID for quote messages
	requestId?: string; // Request ID for quote messages
	requestType?: 'work' | 'material'; // Request type for quote messages
	quoteAmount?: number; // Quote amount for quote messages
	quoteValidity?: string; // Quote validity date for quote messages
	quoteTitle?: string; // Quote title for quote messages
	// --- Message type for different message formats ---
	messageType?: 'text' | 'quote' | 'file' | 'voice';
}

// --- Contract and Project Types ---

/**
 * Represents a comment on a contract.
 */
export interface ContractComment extends Identifiable {
	authorId: string; // User ID of the comment author
	comment: string; // The comment text
	timestamp: string; // ISO 8601 date string
	type: 'revision_request' | 'signature_comment' | 'general'; // Type of comment
	attachments?: Attachment[]; // Optional file attachments
}

/**
 * Represents a link between contracts.
 */
export interface ContractLink {
	contractId: string; // ID of the linked contract
	relationshipType: 'reference'; // Type of relationship (extensible for future)
	linkedBy: string; // User ID who created the link
	linkedAt: string; // ISO 8601 date string when link was created
	visibility: 'private' | 'shared'; // Privacy level of the link
	reason?: string; // Optional reason for linking
}

/**
 * Represents a formal agreement between a customer and a provider (expert/supplier).
 */
export interface Contract extends Identifiable {
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
	status:
		| 'draft'
		| 'revision_requested'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled'
		| 'terminated';
	createdAt: string;
	updatedAt: string;
}

/**
 * Represents a project, which is a high-level container for work and/or material components
 * that have been contracted. The ID often matches the original request ID.
 */
export interface Project extends Identifiable {
	title: string;
	customerId: string;
	workComponent?: {
		expertId: string;
		contractId: string;
		status: string;
		statusHistory: { status: string; updatedAt: string; updatedBy: string }[];
		chatId?: string; // Added for API response enrichment
	};
	materialComponent?: {
		supplierId: string;
		contractId: string;
		status: string;
		statusHistory: { status: string; updatedAt: string; updatedBy: string }[];
		chatId?: string; // Added for API response enrichment
	};
	createdAt: string;
	updatedAt: string;

	// Additional properties for API response enrichment (not stored in database)
	workRequest?: WorkRequest;
	materialRequest?: MaterialRequest;
	customer?: User;
	expert?: User;
	supplier?: User;
}

// --- Quote Management Types ---

/**
 * Represents a quote submitted by an expert or supplier for a work or material request.
 */
export interface Quote extends Identifiable {
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
	files: Attachment[];

	// Metadata
	submittedAt: string;
	updatedAt: string;
	version: number;
	parentQuoteId?: string; // For revisions

	// Chat Integration
	chatId?: string;
	messageId?: string;
}

/**
 * Represents a quote message in chat.
 */
export interface QuoteMessage extends Message {
	messageType: 'quote';
	quoteId: string;
	requestId: string;
	requestType: 'work' | 'material';
	quoteAmount?: number;
	quoteValidity?: string;
	quoteTitle?: string;
}
