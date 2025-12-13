import type { AgentEvent, AgentSession, ArtifactPart } from '$lib/types/agent-api';
import { FastHistory } from '$lib/utils/FastHistory';

/**
 * State that holds agent sessions. `events` field is not in detail.
 * Used to display agent sessions in the UI <AgentSessionSidebar />.
 */
export const agentSessionState = $state(new FastHistory<AgentSession>());

/**
 * State that holds events of a specific session.
 * Event contains message contents, tool calls and other
 * Map key is the session ID.
 * Value is an array of events.
 *
 * Used to display events in the UI <AgentMessageList />.
 */
export const sessionEventsState = $state(new Map<string, AgentEvent[]>());

export const updateSessionEventsState = (sessionId: string, event: AgentEvent) => {
	const sessionEvents = sessionEventsState.get(sessionId);
	if (sessionEvents) {
		sessionEvents.push(event);
	} else {
		sessionEventsState.set(sessionId, [event]);
	}
};

/**
 * State that holds all artifacts related to a specific session.
 * Map key is the session ID.
 * Value is a map of artifact name to artifact part.
 *
 * Used to display artifacts in the UI <AgentMessageList />.
 */
export const artifactsState: Map<string, Record<string, ArtifactPart>> = $state(
	new Map<string, Record<string, ArtifactPart>>()
);

export function updateArtifactState(sessionId: string, artifactName: string, part: ArtifactPart) {
	const sessionArtifacts: Record<string, ArtifactPart> | undefined = artifactsState.get(sessionId);
	if (!sessionArtifacts) {
		artifactsState.set(sessionId, { [artifactName]: part });
	} else {
		sessionArtifacts[artifactName] = part;
	}
}

// function updateArtifactState(sessionId: string, artifactName: string, part: ArtifactPart) {
//     const sessionArtifacts = artifactsState.get(sessionId) || {};

//     // Create new object reference to ensure reactivity triggers
//     artifactsState.set(sessionId, {
//         ...sessionArtifacts,
//         [artifactName]: part
//     });
// }
