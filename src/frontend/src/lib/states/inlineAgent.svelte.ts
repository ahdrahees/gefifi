/**
 * Shared reactive state for the inline/embedded agent chat.
 * Used by both the Home page embed and the FAB modal to share
 * a single conversation session across navigation.
 */

export const inlineAgentState = $state({
	/** The current inline chat session ID (shared across home embed + FAB) */
	sessionId: null as string | null,
	/** Whether the FAB modal is currently open */
	isModalOpen: false
});
