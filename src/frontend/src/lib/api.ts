import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { authStore, type AuthUser } from './stores/auth'; // Assuming AuthUser is exported from the auth store
import { API_BASE_URL } from './config';

// Access VITE_API_URL (set in .env file at the root of the SvelteKit project, e.g., gefifi-2/frontend/.env or gefifi-2/.env)

if (!API_BASE_URL && browser) {
	console.warn(
		'VITE_API_URL is not set in your .env file. Defaulting to http://localhost:3000/api. Ensure your .env file is in the SvelteKit project root.'
	);
}

// Custom Error class for API errors
interface ApiErrorData {
	message: string;
	error?: any; // Can be more specific if backend provides consistent error shapes
	// For example, if backend sends { message: "...", errors: { field: "message" } }
	// errors?: Record<string, string>;
}

export class ApiError extends Error {
	status: number;
	data?: ApiErrorData;

	constructor(message: string, status: number, data?: ApiErrorData) {
		super(message || 'An API error occurred');
		this.name = 'ApiError';
		this.status = status;
		this.data = data;
	}
}

// Core request function
async function request<T = any>( // Default T to any if not specified by caller
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
	body?: any,
	requiresAuth: boolean = false,
	isFormData: boolean = false // Special flag for FormData which sets its own Content-Type
): Promise<T> {
	const headers: HeadersInit = {};

	if (!isFormData && body && (method === 'POST' || method === 'PUT')) {
		headers['Content-Type'] = 'application/json';
	}

	if (requiresAuth) {
		const currentAuth = get(authStore); // Get current auth state synchronously
		const token = currentAuth.token; // Extract token

		if (!token) {
			console.error('API Request Error: No token available for authenticated request to', endpoint);
			// In a real app, this might trigger a redirect to login or refresh token logic.
			throw new ApiError('Authentication token is missing. Please log in.', 401);
		}
		headers['Authorization'] = `Bearer ${token}`;
	}

	const config: RequestInit = {
		method,
		headers
	};

	if (body) {
		config.body = isFormData ? (body as FormData) : JSON.stringify(body);
	}

	const response = await fetch(`${API_BASE_URL}/api${endpoint}`, config);

	if (!response.ok) {
		let errorData: ApiErrorData = { message: `HTTP error! Status: ${response.status}` };
		try {
			const errJson = await response.json();
			errorData = {
				message: errJson.message || `API Error (${response.status})`,
				error: errJson.error || errJson // Store the full error object if available
			};
		} catch (e) {
			// If parsing JSON fails, use the text content of the response if available
			const textError = await response.text();
			errorData.message = textError || errorData.message;
		}
		console.error('API Error:', { endpoint, status: response.status, data: errorData });
		throw new ApiError(errorData.message, response.status, errorData);
	}

	if (response.status === 204) {
		// No Content
		return null as T; // Or resolve with an appropriate value for T if it's not void/null
	}

	return response.json() as Promise<T>;
}

// Type definitions for API payloads and responses (can be expanded and moved to a shared types file)
// These should ideally match backend interfaces.ts

interface LoginCredentials {
	email: string;
	password: string;
}
interface RegisterUserData {
	email: string;
	password: string;
	userType: 'customer' | 'expert' | 'supplier';
	profile: any;
}
interface AuthResponse {
	user: AuthUser;
	token: string;
	message?: string;
}
interface GoogleAuthResponse extends AuthResponse {
	isNewUser: boolean;
}
interface GoogleLoginPayload {
	mockGoogleUser?: any;
	googleTokenId?: string;
	userTypeForNewGoogleUser?: string;
	profileForNewGoogleUser?: any;
}

interface WorkRequestData {
	/* Define based on backend WorkRequest interface */ title: string;
	description: string;
	images?: string[];
	location: string;
	expectedCost?: number;
	timeline?: string;
	materialsSuggested?: string;
	category?: string;
}
export interface WorkRequestResponse {
	id: string;
	status: string;
	createdAt: string;
	[key: string]: any;
}

interface MaterialRequestData {
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
}

export interface MaterialRequestResponse {
	id: string;
	status: string;
	createdAt: string;
	[key: string]: any;
}

interface UserInterestData {
	targetUserId: string;
	workRequestId?: string;
	materialRequestId?: string;
	predefinedMessageKey: string;
}
interface ChatData {
	participantIds: string[];
	workRequestId?: string;
	initialMessageContent?: string;
}
interface ChatMessageData {
	content?: string;
	images?: string[];
}

interface ContractData {
	workRequestId: string;
	customerId: string;
	expertSupplierId: string;
	workDetails: string;
	agreementSummary: string;
	contractDate?: string;
}
interface ContractResponse {
	/* Define based on backend Contract interface */ id: string;
	[key: string]: any;
}
type ContractStatusUpdatePayload = {
	status:
		| 'draft'
		| 'awaiting_signatures'
		| 'signed'
		| 'in_progress'
		| 'completed'
		| 'disputed'
		| 'cancelled'
		| 'terminated';
};

interface UserProfileUpdateData {
	fullName?: string;
	phoneNumber?: string;
	location?: string;
	expertise?: string;
	experience?: string;
	companyName?: string;
	category?: string;
}

interface UpdateProfileResponse {
	user: AuthUser;
	message: string;
}

// API client object
const apiClient = {
	// --- Authentication ---
	login: (credentials: LoginCredentials): Promise<AuthResponse> => {
		return request<AuthResponse>('/auth/login', 'POST', credentials);
	},
	register: (userData: RegisterUserData): Promise<AuthResponse> => {
		return request<AuthResponse>('/auth/register', 'POST', userData);
	},
	getMe: (): Promise<AuthUser> => {
		return request<AuthUser>('/auth/me', 'GET', undefined, true);
	},
	googleLogin: (payload: GoogleLoginPayload): Promise<GoogleAuthResponse> => {
		return request<GoogleAuthResponse>('/auth/google', 'POST', payload);
	},

	// --- File Upload ---
	uploadFile: (
		formData: FormData
	): Promise<{ filePath: string; fileName: string; message?: string; [key: string]: any }> => {
		// Note: The backend /api/upload is currently NOT authenticated.
		// If it were, requiresAuth would be true.
		return request('/upload', 'POST', formData, false, true);
	},

	// --- Work Requests ---
	getWorkRequests: (): Promise<WorkRequestResponse[]> => {
		return request<WorkRequestResponse[]>('/work-requests', 'GET');
	},
	getWorkRequestsByCustomerId: (customerId: string): Promise<WorkRequestResponse[]> => {
		return request<WorkRequestResponse[]>(
			`/work-requests?customerId=${customerId}`,
			'GET',
			undefined,
			true
		);
	},
	createWorkRequest: (data: WorkRequestData): Promise<WorkRequestResponse> => {
		return request<WorkRequestResponse>('/work-requests', 'POST', data, true);
	},
	getWorkRequestById: (id: string): Promise<WorkRequestResponse> => {
		return request<WorkRequestResponse>(`/work-requests/${id}`, 'GET');
	},

	// --- Material Requests ---
	getMaterialRequestsByCustomerId: (customerId: string): Promise<MaterialRequestResponse[]> => {
		return request<MaterialRequestResponse[]>(
			`/material-requests?customerId=${customerId}`,
			'GET',
			undefined,
			true
		);
	},
	createMaterialRequest: (data: MaterialRequestData): Promise<MaterialRequestResponse> => {
		return request<MaterialRequestResponse>('/material-requests', 'POST', data, true);
	},
	getMaterialRequestById: (id: string): Promise<MaterialRequestResponse> => {
		return request<MaterialRequestResponse>(`/material-requests/${id}`, 'GET', undefined, true);
	},
	getMaterialRequests: (): Promise<MaterialRequestResponse[]> => {
		return request<MaterialRequestResponse[]>('/material-requests', 'GET', undefined, true);
	},

	// --- Users ---
	getExperts: (): Promise<AuthUser[]> => {
		return request<AuthUser[]>('/users/experts', 'GET');
	},
	updateUserProfile: (data: UserProfileUpdateData): Promise<UpdateProfileResponse> => {
		return request<UpdateProfileResponse>('/users/me/profile', 'PUT', data, true);
	},
	getSuppliers: (): Promise<AuthUser[]> => {
		return request<AuthUser[]>('/users/suppliers', 'GET');
	},
	getUserById: (userId: string): Promise<AuthUser> => {
		// This should be an authenticated request as only logged-in users should be fetching profiles.
		return request<AuthUser>(`/users/${userId}`, 'GET', undefined, true);
	},
	sendInterest: (
		data: UserInterestData
	): Promise<{ chatId: string; initialMessage: any; message?: string }> => {
		return request('/users/interest', 'POST', data, true);
	},

	// --- Chat ---
	getUserChats: (): Promise<any[]> => {
		// Define Chat[] type
		return request<any[]>('/chat', 'GET', undefined, true);
	},
	createChat: (data: ChatData): Promise<any> => {
		// Define Chat[] type
		return request<any>('/chat', 'POST', data, true);
	},
	getChatMessages: (chatId: string): Promise<any[]> => {
		// Define Message[] type
		return request<any[]>(`/chat/${chatId}/messages`, 'GET', undefined, true);
	},
	sendChatMessage: (chatId: string, data: ChatMessageData): Promise<any> => {
		// Define Message type
		return request<any>(`/chat/${chatId}/messages`, 'POST', data, true);
	},

	// --- Contracts ---
	getUserContracts: (): Promise<ContractResponse[]> => {
		return request<ContractResponse[]>('/contracts', 'GET', undefined, true);
	},
	getContractById: (contractId: string): Promise<ContractResponse> => {
		return request<ContractResponse>(`/contracts/${contractId}`, 'GET', undefined, true);
	},
	createContract: (data: ContractData): Promise<ContractResponse> => {
		return request<ContractResponse>('/contracts', 'POST', data, true);
	},
	signContract: (contractId: string): Promise<ContractResponse> => {
		return request<ContractResponse>(`/contracts/${contractId}/sign`, 'PUT', undefined, true);
	},
	updateContractStatus: (
		contractId: string,
		payload: ContractStatusUpdatePayload
	): Promise<ContractResponse> => {
		return request<ContractResponse>(`/contracts/${contractId}/status`, 'PUT', payload, true);
	},

	// --- Projects ---
	getProjects: (): Promise<any[]> => {
		return request<any[]>('/projects', 'GET', undefined, true);
	},
	getProjectById: (id: string): Promise<any> => {
		return request<any>(`/projects/${id}`, 'GET', undefined, true);
	},
	updateProjectStatus: (
		id: string,
		payload: { component: 'work' | 'material'; newStatus: string }
	): Promise<any> => {
		return request<any>(`/projects/${id}/status`, 'PUT', payload, true);
	}
};

export default apiClient;
