import type { AgentEvent, AgentSession, ArtifactPart } from '$lib/types/agent-api';
import { FastHistory } from '$lib/utils/FastHistory.svelte';

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

	let updatedEvents = [...currentEvents];

	for (const ev of newEvents) {
		if (ev.partial) {
			// Find the last event to append to
			const lastEventIndex = updatedEvents.findIndex(
				(e, i) =>
					i === updatedEvents.length - 1 &&
					e.author === ev.author &&
					e.invocationId === ev.invocationId
			);

			if (lastEventIndex !== -1) {
				const lastEvent = updatedEvents[lastEventIndex];
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
				updatedEvents[lastEventIndex] = mergedEvent;
				continue;
			}
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
