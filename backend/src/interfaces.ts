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
	email: string; // Unique, used for login
	password?: string; // Hashed password, for email/password auth
	googleId?: string; // Unique ID from Google Sign-In
	userType: 'customer' | 'expert' | 'supplier';
	profile: UserProfile;
	createdAt: string; // ISO 8601 date string
	updatedAt: string; // ISO 8601 date string
	isActive?: boolean; // For soft deletes or deactivation
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
	status:
		| 'open'
		| 'in_discussion'
		| 'awaiting_quotes'
		| 'contracted'
		| 'in_progress'
		| 'completed'
		| 'cancelled'
		| 'closed';
	createdAt: string;
	updatedAt: string;
	category?: string;
	interestedExperts?: string[]; // Array of expert User IDs who showed interest
	interestedSuppliers?: string[]; // Array of supplier User IDs who showed interest
	invitedExperts?: string[]; // Array of expert User IDs directly invited by customer
	invitedSuppliers?: string[]; // Array of supplier User IDs directly invited by customer
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
	items: {
		itemName: string;
		quantity: string; // e.g., '10 bags', '500 ft'
		notes?: string; // e.g., 'Grade 43'
	}[];
	status: 'open' | 'quoting' | 'ordered' | 'contracted' | 'completed' | 'cancelled'; // Added 'contracted' status
	createdAt: string;
	updatedAt: string;
	interestedSuppliers?: string[]; // List of supplier User IDs who showed interest
	invitedSuppliers?: string[]; // List of supplier User IDs directly invited by customer
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
}

/**
 * Represents a single message within a chat's subcollection.
 */
export interface Message extends Identifiable {
	senderId: string; // User ID of the sender, or 'system'
	content: string; // Text content of the message
	images?: string[]; // Array of GCS file URLs for images
	timestamp: string; // ISO 8601 date string
	// --- Voice message fields ---
	audioType?: 'voice';
	audioUrl?: string; // Private GCS path for the audio file
	audioDuration?: number; // Duration in seconds
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
