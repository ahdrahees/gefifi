import { goto } from '$app/navigation';
import agentApiClient from '$lib/agents.api';
import { CUSTOMER_AGENT_NAME } from '$lib/config';
import {
	agentLoaders,
	agentSessionState,
	sessionEventsState,
	updateArtifactState,
	updateSessionEventsState
} from '$lib/states/agent.svelte';
import type {
	AgentContentInput,
	AgentContentPart,
	AgentContentPartInput,
	RunAgentRequest
} from '$lib/types/agent-api';
import { fileToInlineData, generateSessionId } from '$lib/utils/agentUtils';

/**
 * Create a new chat session, navigate to its page, and send the initial user message with optional file attachments.
 *
 * @param userId - The identifier of the user starting the chat
 * @param message - The initial message text (the session title is derived from the first 200 characters)
 * @param files - An array of file attachments to include with the initial message; may be empty
 */
export async function newChat(userId: string, message: string, files: File[]) {
	// Create new session
	const newSessionId = generateSessionId();

	const state = {
		sessionMetadata: { title: message.slice(0, 200) } // 200 characters
	};
	const response = await agentApiClient.createSessionWithId(
		CUSTOMER_AGENT_NAME,
		newSessionId,
		userId,
		state
	);

	agentSessionState.add(response); // adding to state for updating sidebar

	// Initialize the events state to empty to avoid race condition with auto-fetch in +page.svelte
	sessionEventsState[newSessionId] = [];

	// Navigate to new chat page first, then send message
	await goto(`/agent/${newSessionId}`);

	// Delegate message sending to sendChat
	await sendChat(newSessionId, userId, message, files);
}

/**
 * Sends a user message (with optional file attachments) to an existing agent session and streams the assistant's responses into session events.
 *
 * The function appends any provided files as inline artifacts, updates artifact state and the local session events with the user's message, invokes the agent backend, and incrementally updates session events as response chunks arrive.
 *
 * @param files - Array of files to attach to the message; each file is converted to inline artifact data and recorded in artifact state. 
 */
export async function sendChat(sessionId: string, userId: string, message: string, files: File[]) {
	// for new message in run api call
	const partsInput: AgentContentPartInput[] = [{ text: message }];

	// for UI state update
	const partsUI: AgentContentPart[] = [{ text: message }];

	if (files.length == 1) {
		const part = await fileToInlineData(files[0]);
		partsInput.push(part);

		// for UI state update
		partsUI.push({ text: `[Uploaded Artifact: "${part.inlineData.displayName}"]` });

		// update artifact state
		updateArtifactState(sessionId, part.inlineData.displayName, part);
	} else if (files.length > 1) {
		// Convert multiple files to inline data
		const fileParts = await Promise.all(files.map(fileToInlineData));
		partsInput.push(...fileParts);

		// for UI state update
		partsUI.push(
			...fileParts.map((part) => {
				// update artifact state
				updateArtifactState(sessionId, part.inlineData.displayName, part);
				return { text: `[Uploaded Artifact: "${part.inlineData.displayName}"]` };
			})
		);
	}

	// update session events state. user message
	updateSessionEventsState(sessionId, {
		author: 'user',
		content: { role: 'user', parts: partsUI }
	});

	const newMessage: AgentContentInput = { role: 'user', parts: partsInput };
	const args: RunAgentRequest = {
		appName: CUSTOMER_AGENT_NAME,
		userId,
		sessionId,
		newMessage
	};
	// api call run agent
	try {
		agentLoaders.generating[sessionId] = true;
		const stream = agentApiClient.runSSE(args);
		for await (const chunk of stream) {
			updateSessionEventsState(sessionId, chunk);
		}
	} finally {
		agentLoaders.generating[sessionId] = false;
	}
}

/**
 * Fetches all sessions for the given user and populates the global session state.
 *
 * Sessions are stored sorted by last update time from oldest to newest; the function replaces the current session list and marks the sessions list as loaded.
 *
 * @param userId - The ID of the user whose sessions should be fetched
 */
export async function fetchAllSessions(userId: string) {
	const sessions = await agentApiClient.listSessions(CUSTOMER_AGENT_NAME, userId);
	// Sort oldest to newest so FastHistory's iterator (back-to-front) shows newest first
	sessions.sort((a, b) => (a.lastUpdateTime || 0) - (b.lastUpdateTime || 0));
	agentSessionState.replaceAll(sessions);
	agentLoaders.isSessionsListLoadedAlready = true;
}

/**
 * Fetches a session and initializes its events state if events are present.
 *
 * If the retrieved session contains an `events` array, replaces the sessionEventsState entry for `sessionId` with that array.
 */
export async function fetchSession(userId: string, sessionId: string) {
	const session = await agentApiClient.getSession(CUSTOMER_AGENT_NAME, userId, sessionId);
	if (session.events) {
		sessionEventsState[sessionId] = session.events; // reset events state
	}
}