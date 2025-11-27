import { get } from 'svelte/store';
import { authStore } from './stores/auth';
import { ApiError, type ApiErrorData } from './api';
import { AGENT_API_URL } from './config';
import type {
	AgentEvent,
	AgentSession,
	ListSessionsResponse,
	RunAgentRequest
} from './types/agent-api';

type AgentName = 'build_assist_agent' | 'expert_assist_agent' | 'supplier_assist_agent';

async function request<T>(
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
	body?: Record<string, any>,
	requiresAuth: boolean = true
): Promise<T> {
	const headers: HeadersInit = {};

	// Set Content-Type header to application/json for POST and PUT requests that have a body
	// but exclude FormData requests since they set their own Content-Type with boundary
	if (body && (method === 'POST' || method === 'PUT')) {
		headers['Content-Type'] = 'application/json';
	}

	if (requiresAuth) {
		const { token } = get(authStore); // Get current auth state synchronously

		if (!token) {
			console.error('API Request Error: No token available for authenticated request to', endpoint);
			// In a real app, this might trigger a redirect to login or refresh token logic.
			throw new ApiError('Authentication token is missing. Please log in.', 401);
		}
		body = {
			...body,
			state_delta: {
				auth_token: token
			}
		};
	}

	const config: RequestInit = {
		method,
		headers
	};
	if (body) {
		config.body = JSON.stringify(body);
	}

	const response = await fetch(`${AGENT_API_URL}${endpoint}`, config);

	if (!response.ok) {
		let errorData: ApiErrorData = { message: `HTTP error! Status: ${response.status}` };
		try {
			const errJson = await response.json();
			errorData = {
				message: errJson.message || `API Error (${response.status})`,
				error: errJson.error || errJson // Store the full error object if available
			};
		} catch (e) {
			console.error('Failed to parse JSON error response:', e);
			// If parsing JSON fails, don't try to read the body again
			errorData.message = `API Error (${response.status}): ${response.statusText}`;
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

const agentApiClient = {
	createSessionWithId: (
		agentName: AgentName,
		sessionId: string,
		userId: string,
		state?: JsonObject
	): Promise<AgentSession> => {
		return request<AgentSession>(
			`/apps/${agentName}/users/${userId}/sessions/${sessionId}`,
			'POST',
			state
		);
	},
	listSessions: (agentName: AgentName, userId: string): Promise<ListSessionsResponse> => {
		return request<ListSessionsResponse>(`/apps/${agentName}/users/${userId}/sessions`, 'GET');
	},
	getSession: (agentName: AgentName, userId: string, sessionId: string): Promise<AgentSession> => {
		return request<AgentSession>(`/apps/${agentName}/users/${userId}/sessions/${sessionId}`, 'GET');
	},
	run: (args: RunAgentRequest): Promise<AgentEvent> => {
		return request<AgentEvent>(`/run`, 'POST', args);
	},
	runSSE: (args: RunAgentRequest): Promise<AgentEvent> => {
		return request<AgentEvent>(`/run_sse`, 'POST', args);
	}
};

export default agentApiClient;
