import type { AgentEvent, AgentSession, ArtifactPart } from '$lib/types/agent-api';
import { FastHistory } from '$lib/utils/FastHistory.svelte';
import { inlineAgentState } from '$lib/states/inlineAgent.svelte';

/**
 * State that holds agent sessions. `events` field is not in detail.
 * Used to display agent sessions in the UI <AgentSessionSidebar />.
 */
export const agentSessionState = new FastHistory<AgentSession>();

/**
 * State that holds events of a specific session.
 * Event contains message contents, tool calls and other
 * Map key is the session ID.
 * Value is an array of events.
 *
 * Used to display events in the UI <AgentMessageList />.
 */
export const sessionEventsState = $state<Record<string, AgentEvent[]>>({});

export const updateSessionEventsState = (sessionId: string, event: AgentEvent | AgentEvent[]) => {
	const currentEvents = sessionEventsState[sessionId] || [];
	const newEvents = Array.isArray(event) ? event : [event];

	const updatedEvents = [...currentEvents];

	for (const ev of newEvents) {
		// Merge streaming partials into the placeholder event with the same id.
		// ADK reuses `id` across all partial chunks of one model response and
		// assigns a fresh `id` to every response, tool echo, etc. Keying by
		// (invocationId, author) instead collapsed every turn of a run into a
		// single bubble — each turn's final replaced the previous visible
		// message, and tool echoes wiped the streaming placeholder (chat
		// flashing). Fall back to (invocationId, author) only for events
		// without an id; events with neither key are always appended.
		const mergeKey = ev.id ?? (ev.invocationId ? `${ev.invocationId}:${ev.author}` : null);
		const existingEventIndex =
			mergeKey === null
				? -1
				: updatedEvents.findIndex(
						(e) => (e.id ?? (e.invocationId ? `${e.invocationId}:${e.author}` : null)) === mergeKey
					);

		if (existingEventIndex !== -1) {
			if (ev.partial) {
				const lastEvent = updatedEvents[existingEventIndex];
				// Clone to ensure reactivity
				const mergedEvent = { ...lastEvent, content: { ...lastEvent.content } };
				if (!mergedEvent.content.parts) mergedEvent.content.parts = [];

				// Assuming partial events only have one part with text for simplicity in streaming
				const newPart = ev.content?.parts?.[0];
				if (newPart?.text) {
					const lastPart = mergedEvent.content.parts[mergedEvent.content.parts.length - 1];
					if (lastPart && lastPart.text !== null && lastPart.text !== undefined) {
						lastPart.text += newPart.text;
					} else {
						mergedEvent.content.parts.push({ ...newPart });
					}
				}
				updatedEvents[existingEventIndex] = mergedEvent;
			} else {
				// Final event: replace the partial streaming event with the complete final event
				updatedEvents[existingEventIndex] = ev;
			}
			continue;
		}
		updatedEvents.push(ev);
	}

	sessionEventsState[sessionId] = updatedEvents;
};

/**
 * State that holds all artifacts related to a specific session.
 * Map key is the session ID.
 * Value is a map of artifact name to artifact part.
 *
 * Used to display artifacts in the UI <AgentMessageList />.
 */
export const artifactsState = $state<Record<string, Record<string, ArtifactPart>>>({});

export function updateArtifactState(sessionId: string, artifactName: string, part: ArtifactPart) {
	const sessionArtifacts = artifactsState[sessionId] || {};
	// Create a new object reference to ensure Svelte 5 reactivity triggers
	artifactsState[sessionId] = {
		...sessionArtifacts,
		[artifactName]: part
	};
}

// function updateArtifactState(sessionId: string, artifactName: string, part: ArtifactPart) {
//     const sessionArtifacts = artifactsState.get(sessionId) || {};

//     // Create new object reference to ensure reactivity triggers
//     artifactsState.set(sessionId, {
//         ...sessionArtifacts,
//         [artifactName]: part
//     });
// }

/**
 * State that holds loading status for different parts of the agent.
 */
export const agentLoaders = $state({
	loadingSessionsList: false,
	loadingArtifacts: false,
	loadingSessionEvents: false,
	isSessionsListLoadedAlready: false,
	generating: {} as Record<string, boolean>
});

/**
 * Resets all agent and session related state.
 * Should be called when logging out or switching users.
 */
export function resetAgentState() {
	agentSessionState.clear();

	for (const key of Object.keys(sessionEventsState)) {
		delete sessionEventsState[key];
	}

	for (const key of Object.keys(artifactsState)) {
		delete artifactsState[key];
	}

	agentLoaders.loadingSessionsList = false;
	agentLoaders.loadingArtifacts = false;
	agentLoaders.loadingSessionEvents = false;
	agentLoaders.isSessionsListLoadedAlready = false;
	agentLoaders.generating = {};

	inlineAgentState.sessionId = null;
	inlineAgentState.isModalOpen = false;
}
