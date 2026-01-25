import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import apiClient, { ApiError } from '$lib/api'; // Import the API client and ApiError
import type { AuthUser } from '$lib/types'; // Import central AuthUser type
import { auth } from '$lib/firebase'; // Import the central Firebase auth service
import { signInWithCustomToken, signOut } from 'firebase/auth';
export type { AuthUser }; // Re-export AuthUser for other modules

export interface AuthState {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	error: string | null; // For login/registration errors
	isLoading: boolean; // To indicate auth state is being determined
}

const initialAuthState: AuthState = {
	isAuthenticated: false,
	user: null,
	token: null,
	error: null,
	isLoading: true // Start with loading true on app initialization
};

const store: Writable<AuthState> = writable(initialAuthState);

// Helper to parse JWT (client-side) to get basic info like expiry
// WARNING: This does NOT validate the token's signature. Signature validation MUST happen on the server.
function parseJwt(token: string): { exp?: number; [key: string]: unknown } | null {
	if (!token) return null;
	try {
		const base64Url = token.split('.')[1];
		if (!base64Url) return null;
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map(function (c) {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
				})
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch (e) {
		console.error('Failed to parse JWT:', e);
		return null;
	}
}

// Helper function to update the store and localStorage
async function updateAuthData(
	token: string | null,
	user: AuthUser | null,
	error: string | null = null
) {
	const newAuthState: AuthState = {
		isAuthenticated: !!(token && user),
		user,
		token,
		error,
		isLoading: false
	};
	store.set(newAuthState);

	if (browser) {
		if (token && user) {
			localStorage.setItem('authToken', token);
			localStorage.setItem('authUser', JSON.stringify(user));
			// New: Silently sign into Firebase in the background
			await signInToFirebase(token);
		} else {
			localStorage.removeItem('authToken');
			localStorage.removeItem('authUser');
			// New: Sign out of Firebase when logging out
			if (auth.currentUser) {
				await signOut(auth);
				console.log('[Firebase] User signed out.');
			}
		}
	}
}

// Function to load user state from localStorage on app startup
async function loadUserFromStorage() {
	if (!browser) {
		store.set({ ...initialAuthState, isLoading: false }); // No localStorage on server
		return;
	}

	store.update((s) => ({ ...s, isLoading: true, error: null }));
	const token = localStorage.getItem('authToken');
	// const storedUserJson = localStorage.getItem('authUser'); // We will prefer fetching from /me

	if (token) {
		const decodedToken = parseJwt(token);
		if (decodedToken && decodedToken.exp && decodedToken.exp * 1000 > Date.now()) {
			// Token exists and not expired (client-side check)
			// Now, verify with backend by fetching user profile
			try {
				// The apiClient's getMe method should use the token from the store,
				// which is updated by updateAuthData, which in turn updates currentToken in api.ts
				// For loadUserFromStorage, we ensure currentToken is set before calling getMe.
				// Directly setting the token for this one-time call can be an option if api.ts
				// doesn't immediately pick up the token from store on first load.
				// However, authStore.subscribe in api.ts should handle this.
				// We must ensure the token is in the store *before* apiClient.getMe() is called by it internally.
				// The most robust way is to ensure authStore.set is called if a token is read from localStorage.
				store.update((s) => ({ ...s, token: token, isAuthenticated: false, user: null })); // Temporarily set token for api.ts

				const freshUser = await apiClient.getMe();
				await updateAuthData(token, freshUser); // This updates the store correctly with the fresh user AND signs into Firebase
			} catch (apiError: unknown) {
				console.warn(
					'Token re-validation with /api/auth/me failed, logging out:',
					(apiError as { message?: string }).message
				);
				let errorMessage = 'Session expired or invalid.';
				if (apiError instanceof ApiError && (apiError as any).data?.message) {
					errorMessage = (apiError as any).data.message;
				}
				updateAuthData(null, null, errorMessage);
			}
		} else {
			// Token expired or invalid
			updateAuthData(null, null, 'Session expired. Please log in again.');
		}
	} else {
		// No token found
		updateAuthData(null, null);
	}
}

// New: Firebase Sign-In Logic
async function signInToFirebase(_sessionToken: string) {
	try {
		console.log('[Firebase] Requesting custom token from backend...');
		const response = await apiClient.getFirebaseToken(); // API client will use the sessionToken
		const firebaseToken = response.firebaseToken;

		if (firebaseToken) {
			console.log('[Firebase] Signing in with custom token...');
			const userCredential = await signInWithCustomToken(auth, firebaseToken);
			console.log('[Firebase] Silent sign-in successful. User is authenticated.', {
				uid: userCredential.user.uid,
				email: userCredential.user.email
			});
		} else {
			console.error('[Firebase] No firebase token received from backend');
		}
	} catch (error) {
		console.error('[Firebase] Silent sign-in failed:', error);
		// This is not a critical failure for the app's main auth,
		// but real-time features will not work.
	}
}

// Logout function
async function logout() {
	if (browser) {
		window.google?.accounts?.id?.disableAutoSelect();
	}
	await updateAuthData(null, null);
}

// Define types for credentials and user data for API calls
interface LoginCredentials {
	email: string;
	password: string;
}
export interface RegisterUserData {
	email: string;
	password: string;
	userType: 'customer' | 'expert' | 'supplier';
	profile: Partial<AuthUser['profile']>; // Use Partial for flexibility during registration
}

async function login(credentials: LoginCredentials): Promise<AuthUser> {
	store.update((s) => ({ ...s, isLoading: true, error: null }));
	try {
		const response = await apiClient.login(credentials);
		if (response.user && response.token) {
			await updateAuthData(response.token, response.user);
			return response.user;
		} else {
			// This case should ideally be caught by apiClient's error handling
			throw new Error('Login response was incomplete.');
		}
	} catch (err: unknown) {
		let errorMessage = 'Login failed. Please check your credentials or try again later.';
		if (err instanceof ApiError && err.data?.message) {
			errorMessage = err.data.message;
		} else if (err instanceof Error) {
			errorMessage = err.message;
		}
		// Ensure user is logged out in the store's state on error
		await updateAuthData(null, null, errorMessage);
		throw new Error(errorMessage); // Re-throw for the component to handle
	}
}

async function register(userData: RegisterUserData): Promise<AuthUser> {
	store.update((s) => ({ ...s, isLoading: true, error: null }));
	try {
		const response = await apiClient.register(userData);
		if (response.user && response.token) {
			await updateAuthData(response.token, response.user);
			return response.user;
		} else {
			throw new Error('Registration response was incomplete.');
		}
	} catch (err: unknown) {
		let errorMessage = 'Registration failed. Please try again later.';
		if (err instanceof ApiError && err.data?.message) {
			errorMessage = err.data.message;
		} else if (err instanceof Error) {
			errorMessage = err.message;
		}
		await updateAuthData(null, null, errorMessage);
		throw new Error(errorMessage);
	}
}

// --- Google Sign-In Flow ---
interface GoogleLoginPayload {
	googleTokenId: string;
	userTypeForNewUser?: 'customer' | 'expert' | 'supplier';
	// profileForNewUser is not needed here as we will collect it on a separate page
}
interface GoogleAuthResponse {
	user: AuthUser;
	token: string;
	isNewUser: boolean;
	message?: string;
}

async function googleLogin(payload: GoogleLoginPayload): Promise<GoogleAuthResponse> {
	store.update((s) => ({ ...s, isLoading: true, error: null }));
	try {
		const response = await apiClient.googleLogin(payload);
		if (response.user && response.token) {
			await updateAuthData(response.token, response.user);
			return response; // Return the full response including isNewUser
		} else {
			throw new Error('Google Sign-In response was incomplete.');
		}
	} catch (err: unknown) {
		let errorMessage = 'Google Sign-In failed. Please try again later.';
		if (err instanceof ApiError && err.data?.message) {
			errorMessage = err.data.message;
		} else if (err instanceof Error) {
			errorMessage = err.message;
		}
		await updateAuthData(null, null, errorMessage);
		throw new Error(errorMessage);
	}
}

export const authStore = {
	subscribe: store.subscribe,
	update: store.update,
	set: store.set,
	loadUserFromStorage,
	logout,
	login,
	register,
	googleLogin,
	_updateAuthData: updateAuthData
};

// Automatically load user from storage when this module is first imported on the client-side.
// This ensures that on app load, we attempt to restore session state.
if (browser) {
	loadUserFromStorage();
}
