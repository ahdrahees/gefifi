import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import apiClient, { ApiError } from '$lib/api'; // Import the API client and ApiError

// Define the structure for the user object stored in the auth store
// This should align with what your backend's /api/auth/me returns
export interface AuthUser {
  id: string;
  email: string;
  userType: 'customer' | 'expert' | 'supplier';
  profile: {
    fullName?: string;
    avatarUrl?: string;
    location?: string;
    expertise?: string;
    experience?: string;
    companyName?: string;
    category?: string;
  };
  createdAt?: string;
  // Add other non-sensitive fields you expect from the User object returned by the backend
}

export interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
  token: string | null;
  error: string | null; // For login/registration errors
  isLoading: boolean; // To indicate auth state is being determined
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  user: null,
  token: null,
  error: null,
  isLoading: true, // Start with loading true on app initialization
};

const store: Writable<AuthState> = writable(initialAuthState);

// Helper to parse JWT (client-side) to get basic info like expiry
// WARNING: This does NOT validate the token's signature. Signature validation MUST happen on the server.
function parseJwt(token: string): { exp?: number; [key: string]: any } | null {
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
    console.error("Failed to parse JWT:", e);
    return null;
  }
}

// Helper function to update the store and localStorage
function updateAuthData(token: string | null, user: AuthUser | null, error: string | null = null) {
  const newAuthState: AuthState = {
    isLoggedIn: !!(token && user),
    user,
    token,
    error,
    isLoading: false, // Finished loading/updating
  };
  store.set(newAuthState);

  if (browser) {
    if (token && user) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  }
}

// Function to load user state from localStorage on app startup
async function loadUserFromStorage() {
  if (!browser) {
    store.set({ ...initialAuthState, isLoading: false }); // No localStorage on server
    return;
  }

  store.update(s => ({ ...s, isLoading: true, error: null }));
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
        store.update(s => ({ ...s, token: token, isLoggedIn: false, user: null })); // Temporarily set token for api.ts

        const freshUser = await apiClient.getMe();
        updateAuthData(token, freshUser); // This updates the store correctly with the fresh user
      } catch (apiError: any) {
        console.warn("Token re-validation with /api/auth/me failed, logging out:", apiError.message);
        let errorMessage = "Session expired or invalid.";
        if (apiError instanceof ApiError && apiError.data?.message) {
            errorMessage = apiError.data.message;
        }
        updateAuthData(null, null, errorMessage);
      }
    } else {
      // Token expired or invalid
      updateAuthData(null, null, "Session expired. Please log in again.");
    }
  } else {
    // No token found
    updateAuthData(null, null);
  }
}

// Logout function
function logout() {
  updateAuthData(null, null);
  // To redirect after logout, use `goto` from `$app/navigation` in the component calling logout.
  // e.g., if (browser) { import('$app/navigation').then(({goto}) => goto('/auth/login')); }
}

// Define types for credentials and user data for API calls
interface LoginCredentials { email: string; password: string; }
export interface RegisterUserData {
  email: string;
  password: string;
  userType: 'customer' | 'expert' | 'supplier';
  profile: Partial<AuthUser['profile']>; // Use Partial for flexibility during registration
}

async function login(credentials: LoginCredentials): Promise<AuthUser> {
  store.update(s => ({ ...s, isLoading: true, error: null }));
  try {
    const response = await apiClient.login(credentials);
    if (response.user && response.token) {
      updateAuthData(response.token, response.user);
      return response.user;
    } else {
      // This case should ideally be caught by apiClient's error handling
      throw new Error("Login response was incomplete.");
    }
  } catch (err: unknown) {
    let errorMessage = 'Login failed. Please check your credentials or try again later.';
    if (err instanceof ApiError && err.data?.message) {
      errorMessage = err.data.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    // Ensure user is logged out in the store's state on error
    updateAuthData(null, null, errorMessage);
    throw new Error(errorMessage); // Re-throw for the component to handle
  }
}

async function register(userData: RegisterUserData): Promise<AuthUser> {
  store.update(s => ({ ...s, isLoading: true, error: null }));
  try {
    const response = await apiClient.register(userData);
    if (response.user && response.token) {
      updateAuthData(response.token, response.user);
      return response.user;
    } else {
      throw new Error("Registration response was incomplete.");
    }
  } catch (err: unknown) {
    let errorMessage = 'Registration failed. Please try again later.';
    if (err instanceof ApiError && err.data?.message) {
      errorMessage = err.data.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    updateAuthData(null, null, errorMessage);
    throw new Error(errorMessage);
  }
}

export const authStore = {
  subscribe: store.subscribe,
  // `set` could be used for server-side initialisation if auth state comes from cookies
  set: store.set,
  loadUserFromStorage, // Should be called in a root +layout.svelte or +layout.ts on client
  logout,
  login,
  register,
  // Expose internal update function if needed by other modules (e.g. API client on token refresh)
  _updateAuthData: updateAuthData 
};

// Automatically load user from storage when this module is first imported on the client-side.
// This ensures that on app load, we attempt to restore session state.
if (browser) {
  loadUserFromStorage();
}