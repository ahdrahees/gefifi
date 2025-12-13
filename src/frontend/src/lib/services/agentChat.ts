import { goto } from '$app/navigation';
import agentApiClient from '$lib/agents.api';
import { CUSTOMER_AGENT_NAME } from '$lib/config';
import {
	agentSessionState,
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

	await goto(`/agent/${newSessionId}`); // Navigate to new chat page
	// send message
	await sendChat(newSessionId, userId, message, files);
}

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
	const response = await agentApiClient.run(args);

	// update session events state, agent message
	updateSessionEventsState(sessionId, response);
}
