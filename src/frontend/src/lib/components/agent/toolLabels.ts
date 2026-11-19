import type { AgentEvent } from '$lib/types/agent-api';

/**
 * Human-friendly labels for agent tool calls.
 *
 * The wire format carries developer-facing names (`get_user_chats`) plus raw
 * args (UUIDs, limits). This module turns those into headlines a user can
 * read ("Getting your chats"), enriched with counts and participant names
 * taken from the tool's own result payload. Status badges stay as-is.
 */

interface ToolLabelSpec {
	label: string;
}

const TOOL_LABELS: Record<string, ToolLabelSpec> = {
	get_user_chats: { label: 'Getting your chats' },
	send_chat_message: { label: 'Sending message' },
	get_my_profile: { label: 'Getting your profile' },
	update_my_profile: { label: 'Updating your profile' },
	get_user_expert_requests: { label: 'Getting your expert requests' },
	get_active_user_expert_requests: { label: 'Getting your active expert requests' },
	get_a_expert_request_of_user_with_request_id: { label: 'Getting expert request details' },
	create_expert_request: { label: 'Creating expert request' },
	update_expert_request: { label: 'Updating expert request' },
	update_expert_request_image: { label: 'Updating request images' },
	update_expert_request_status: { label: 'Updating request status' },
	get_user_material_requests: { label: 'Getting your material requests' },
	get_active_material_requests_of_user: { label: 'Getting your active material requests' },
	get_a_material_request_of_user_with_request_id: { label: 'Getting material request details' },
	create_material_request: { label: 'Creating material request' },
	update_material_request: { label: 'Updating material request' },
	update_material_request_attachments: { label: 'Updating request attachments' },
	update_material_request_status: { label: 'Updating request status' },
	find_experts: { label: 'Finding experts' },
	find_suppliers: { label: 'Finding suppliers' },
	find_a_user_by_id: { label: 'Looking up user' },
	find_users_by_ids: { label: 'Looking up users' },
	invite_expert_to_expert_request: { label: 'Inviting expert' },
	invite_supplier_to_material_request: { label: 'Inviting supplier' },
	get_quotes_for_request: { label: 'Getting quotes' },
	submit_expert_quote: { label: 'Submitting quote' },
	submit_material_quote: { label: 'Submitting quote' },
	draft_contract: { label: 'Drafting contract' },
	request_contract_revision: { label: 'Requesting contract revision' },
	browse_expert_requests: { label: 'Browsing expert requests' },
	browse_material_requests: { label: 'Browsing material requests' },
	express_interest_in_expert_request: { label: 'Expressing interest' },
	express_interest_in_material_request: { label: 'Expressing interest' },
	get_current_datetime: { label: 'Getting current date and time' },
	load_artifacts: { label: 'Loading attached files' }
};

/** Response keys that hold countable result lists, in priority order. */
const COUNT_KEYS = [
	'chats',
	'messages',
	'expert_requests_list',
	'active_expert_requests_list',
	'material_requests_list',
	'active_material_requests_list',
	'list_of_experts',
	'list_of_suppliers',
	'quotes',
	'users'
];

export function prettifyToolName(name: string): string {
	const titled = name
		.split('_')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
	return titled || name;
}

function countInResponse(response: Record<string, unknown> | null): number | null {
	if (!response) return null;
	for (const key of COUNT_KEYS) {
		const value = response[key];
		if (Array.isArray(value)) return value.length;
	}
	return null;
}

function isGenericName(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.toLowerCase() !== 'you' &&
		value.toLowerCase() !== 'system'
	);
}

/**
 * Map chat_id -> participant display names ("rahees (supplier)"), built from
 * every get_user_chats result seen in the session. Lets later calls that only
 * carry a UUID (e.g. get_chat_messages) render "Getting chat with …".
 */
export function buildChatDirectory(events: AgentEvent[]): Map<string, string[]> {
	const directory = new Map<string, string[]>();
	for (const event of events) {
		for (const part of event.content?.parts ?? []) {
			const fr = part.functionResponse;
			if (!fr || fr.name !== 'get_user_chats') continue;
			const chats = (fr.response as Record<string, unknown> | null)?.chats;
			if (!Array.isArray(chats)) continue;
			for (const chat of chats) {
				if (typeof chat !== 'object' || chat === null) continue;
				const record = chat as Record<string, unknown>;
				const chatId = record.chat_id;
				const names = record.participants_names;
				if (typeof chatId === 'string' && Array.isArray(names)) {
					directory.set(
						chatId,
						names.filter((n): n is string => typeof n === 'string' && n.length > 0)
					);
				}
			}
		}
	}
	return directory;
}

function describeChatMessages(
	args: Record<string, unknown> | null,
	response: Record<string, unknown> | null,
	chatDirectory: Map<string, string[]>
): string {
	// 1. Resolve the chat's participants from an earlier get_user_chats result.
	const chatId = args?.chat_id;
	if (typeof chatId === 'string') {
		const others = (chatDirectory.get(chatId) ?? []).filter(
			(name) => name.toLowerCase() !== 'you'
		);
		if (others.length > 0) return `Getting chat with ${others.slice(0, 3).join(', ')}`;
	}
	// 2. Fall back to sender names from this call's own result.
	const messages = response?.messages;
	if (Array.isArray(messages)) {
		const senders = [
			...new Set(
				messages
					.map((m) =>
						typeof m === 'object' && m !== null
							? (m as Record<string, unknown>).sender_name
							: null
					)
					.filter(isGenericName)
			)
		];
		if (senders.length > 0) return `Getting chat with ${senders.slice(0, 3).join(', ')}`;
		return `Getting chat messages (${messages.length})`;
	}
	return 'Getting chat messages';
}

/**
 * Friendly headline for a tool call, e.g. "Getting your chats",
 * "Getting chat with rahees (supplier)", "Getting your expert requests (9)".
 * Falls back to a prettified tool name (plus result count when available)
 * for tools without a dedicated entry.
 */
export function describeToolCall(
	name: string,
	args: Record<string, unknown> | null,
	response: Record<string, unknown> | null,
	chatDirectory: Map<string, string[]> = new Map()
): string {
	if (name === 'get_chat_messages') return describeChatMessages(args, response, chatDirectory);
	const spec = TOOL_LABELS[name];
	const base = spec?.label ?? prettifyToolName(name);
	const count = countInResponse(response);
	return count === null ? base : `${base} (${count})`;
}
