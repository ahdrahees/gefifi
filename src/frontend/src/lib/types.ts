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
 * This is nested within the main User object.
 */
export type UserProfile = {
	fullName?: string;
	companyName?: string;
	avatarUrl?: string;
	location?: string;
	phoneNumber?: string;
	expertise?: string; // For 'expert'
	experience?: string; // For 'expert' & 'supplier'
	category?: string; // For 'supplier'
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
		| 'closed';
	createdAt: string;
	updatedAt: string;
	category?: string;
	interestedExperts?: string[];
	interestedSuppliers?: string[];
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
	items: {
		itemName: string;
		quantity: string;
		notes?: string;
	}[];
	status: 'open' | 'quoting' | 'ordered' | 'completed' | 'cancelled';
	createdAt: string;
	updatedAt: string;
	interestedSuppliers: string[];
};

/**
 * Represents a chat conversation between two or more users.
 */
export type Chat = {
	id: string;
	participants: string[];
	workRequestId?: string;
	createdAt: string;
	updatedAt: string;
	// Frontend-enriched properties can be added where this type is used
	// e.g., displayName?: string;
};

/**
 * Represents a single message within a chat.
 */
export type Message = {
	id: string;
	senderId: string;
	content: string;
	images?: string[];
	timestamp: string;
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
 * Defines the possible statuses for a contract.
 */
export type ContractStatus =
	| 'draft'
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
	workRequestId: string;
	customerId: string;
	expertSupplierId: string;
	workDetails: string;
	agreementSummary: string;
	contractDate: string;
	customerSigned: boolean;
	customerSignatureTimestamp?: string;
	expertSupplierSigned: boolean;
	expertSupplierSignatureTimestamp?: string;
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
