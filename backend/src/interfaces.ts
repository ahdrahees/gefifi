// gefifi-2/backend/src/interfaces.ts

// Base identifiable interface for SimpleDB
export interface Identifiable {
	id: string;
}

export interface UserProfile {
	// Common fields
	fullName?: string;
	phoneNumber?: string;
	location?: string; // General location, can be city or address
	avatarUrl?: string; // Path to profile picture

	// Customer specific
	// (Potentially no extra fields needed if 'location' covers address)

	// Expert specific
	expertise?: string; // e.g., "Mason Work", "Plumbing"
	experience?: string; // e.g., "8 years"
	// Consider specific fields like:
	// serviceArea?: string; // e.g., "Bangalore East"
	// portfolioImages?: string[]; // Paths to images of past work

	// Supplier specific
	companyName?: string; // e.g., "Kumar Building Materials"
	category?: string; // e.g., "Cement & Steel", "Paints"
	// experience is also relevant for suppliers
	// serviceArea?: string; // For delivery radius
	// businessRegistrationNumber?: string;
}

export interface User extends Identifiable {
	// id: string; // From Identifiable
	email: string; // Unique, used for login
	password?: string; // Hashed password, only for email/password auth
	googleId?: string; // For Google Sign-In, unique if present
	userType: 'customer' | 'expert' | 'supplier';
	profile: UserProfile;
	createdAt: string; // ISO 8601 date string (e.g., new Date().toISOString())
	updatedAt: string; // ISO 8601 date string
	isActive?: boolean; // For soft deletes or account deactivation
}

export interface WorkRequest extends Identifiable {
	// id: string; // From Identifiable
	customerId: string; // User ID of the customer who created it
	title: string;
	description: string;
	images: string[]; // Array of file paths (e.g., '/uploads/image1.jpg', '/uploads/image2.png')
	location: string; // Site location/address
	expectedCost?: number; // Optional, as customer might not know
	timeline?: string; // e.g., "2 weeks", "Within 1 month", "Flexible"
	materialsSuggested?: string; // Materials customer thinks might be needed or preferred
	status:
		| 'open'
		| 'in_discussion'
		| 'awaiting_quotes'
		| 'contracted'
		| 'in_progress'
		| 'completed'
		| 'cancelled'
		| 'closed';
	createdAt: string; // ISO 8601 date string
	updatedAt: string; // ISO 8601 date string
	// Optional fields
	category?: string; // e.g., "Renovation", "New Construction", "Repair"
	interestedExperts?: string[]; // List of expert User IDs who showed interest
	interestedSuppliers?: string[]; // List of supplier User IDs who showed interest
}

/**
 * Represents a chat conversation between two or more users.
 */
export interface Chat {
	id: string;
	participants: string[];
	workRequestId?: string;
	materialRequestId?: string; // Link to a material request
	createdAt: string;
	updatedAt: string;
}

export interface Message extends Identifiable {
	// id: string; // From Identifiable
	chatId: string; // ID of the chat this message belongs to
	senderId: string; // User ID of the sender
	content: string; // Text content of the message
	images?: string[]; // Array of file paths for images sent in chat
	timestamp: string; // ISO 8601 date string (when message was sent)
	// type?: 'text' | 'image' | 'file' | 'system'; // System messages for contract creation, etc.
	// readBy?: string[]; // Array of User IDs who have read the message
}

export interface Contract extends Identifiable {
	// id: string; // From Identifiable
	workRequestId?: string; // Link to a work request
	materialRequestId?: string; // Link to a material request
	customerId: string;
	expertSupplierId: string;
	// providerType: 'expert' | 'supplier'; // To distinguish if the other party is expert or supplier
	workDetails: string; // Detailed description of the work agreed upon
	agreementSummary: string; // Key terms, payment schedule, etc.
	contractDate: string; // ISO 8601 date string (date of agreement)
	startDate?: string; // Planned start date
	endDate?: string; // Planned completion date
	totalAmount?: number;
	paymentTerms?: string;
	customerSigned: boolean;
	customerSignatureTimestamp?: string; // When customer signed
	expertSupplierSigned: boolean;
	expertSupplierSignatureTimestamp?: string; // When expert/supplier signed
	requestType: 'work' | 'material'; // To distinguish the contract's purpose
	status:
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled'
		| 'terminated';
	createdAt: string; // ISO 8601 date string (when contract record was created)
	updatedAt: string; // ISO 8601 date string
	// attachments?: string[]; // Paths to any attached documents
	// createdBy: string; // User ID of who initiated the contract creation
}

/**
 * Represents a request for materials, either standalone or linked to a WorkRequest.
 */
export interface MaterialRequest {
	id: string;
	customerId: string;
	title: string;
	description: string;
	deliveryLocation: string;
	deliveryDate?: string; // Optional preferred delivery date
	linkedWorkRequestId?: string; // Optional link to an existing WorkRequest
	items: {
		itemName: string;
		quantity: string; // Using string to accommodate units like '10 bags', '500 ft'
		notes?: string;
	}[];
	status: 'open' | 'quoting' | 'ordered' | 'completed' | 'cancelled';
	createdAt: string;
	updatedAt: string;
	interestedSuppliers: string[];
}
