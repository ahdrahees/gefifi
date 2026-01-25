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

export async function sendChat(sessionId: string, userId: string, message: string, files: File[]) {
	// for new message in run api call
	const partsInput: AgentContentPartInput[] = [{ text: message }];

	// for UI state update
	const partsUI: AgentContentPart[] = [{ text: message }];

	if (files.length === 1) {
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

export async function fetchAllSessions(userId: string) {
	const sessions = await agentApiClient.listSessions(CUSTOMER_AGENT_NAME, userId);
	// Sort oldest to newest so FastHistory's iterator (back-to-front) shows newest first
	sessions.sort((a, b) => (a.lastUpdateTime || 0) - (b.lastUpdateTime || 0));
	agentSessionState.replaceAll(sessions);
	agentLoaders.isSessionsListLoadedAlready = true;
}

export async function fetchSession(userId: string, sessionId: string) {
	const session = await agentApiClient.getSession(CUSTOMER_AGENT_NAME, userId, sessionId);
	if (session.events) {
		sessionEventsState[sessionId] = session.events; // reset events state
	}
}
