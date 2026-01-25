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
import type { JsonObject } from './types/json';

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

		// Set standard Authorization header
		headers['Authorization'] = `Bearer ${token}`;

		// For POST/PUT, we also include the token in state_delta as expected by the Agent API
		if (method !== 'GET') {
			body = {
				...body,
				state_delta: {
					auth_token: token
				}
			};
		}
	}

	const config: RequestInit = {
		method,
		headers
	};

	// Only attach body if it's not a GET request
	if (body && method !== 'GET') {
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

async function* streamRequest<T>(
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
	body?: Record<string, any>,
	requiresAuth: boolean = true
): AsyncGenerator<T> {
	const headers: HeadersInit = {
		Accept: 'text/event-stream'
	};

	if (body && (method === 'POST' || method === 'PUT')) {
		headers['Content-Type'] = 'application/json';
	}

	if (requiresAuth) {
		const { token } = get(authStore);
		if (!token) throw new ApiError('Authentication token is missing. Please log in.', 401);
		headers['Authorization'] = `Bearer ${token}`;
		if (method !== 'GET') {
			body = { ...body, state_delta: { auth_token: token } };
		}
	}

	const config: RequestInit = {
		method,
		headers,
		body: body && method !== 'GET' ? JSON.stringify(body) : undefined
	};

	const response = await fetch(`${AGENT_API_URL}${endpoint}`, config);

	if (!response.ok) {
		let message = `API Error (${response.status})`;
		try {
			const errJson = await response.json();
			message = errJson.message || message;
		} catch (e) { }
		throw new ApiError(message, response.status);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error('Response body is null');

	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			// Handle SSE format "data: {json}"
			if (trimmedLine.startsWith('data: ')) {
				const data = trimmedLine.slice(6);
				if (data === '[DONE]') break;
				try {
					yield JSON.parse(data) as T;
				} catch (e) {
					console.error('Failed to parse SSE data:', data, e);
				}
			} else {
				// Handle plain newline-delimited JSON
				try {
					yield JSON.parse(trimmedLine) as T;
				} catch (e) {
					// Might be part of a larger line, wait for more data
					buffer = trimmedLine + '\n' + buffer;
				}
			}
		}
	}
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
	run: (args: RunAgentRequest): Promise<AgentEvent[]> => {
		return request<AgentEvent[]>(`/run`, 'POST', args);
	},
	runSSE: (args: RunAgentRequest): AsyncGenerator<AgentEvent> => {
		return streamRequest<AgentEvent>(`/run_sse`, 'POST', args);
	}
};

export default agentApiClient;
