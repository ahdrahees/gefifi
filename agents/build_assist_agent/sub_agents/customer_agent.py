import os
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.load_artifacts_tool import load_artifacts_tool

from build_assist_agent.config import MODEL_ENV_PASSED
from build_assist_agent.tools.find_professionals import (
    find_a_user_by_id,
    find_experts,
    find_suppliers,
    find_users_by_ids,
    invite_expert_to_expert_request,
    invite_supplier_to_material_request,
    get_my_profile,
)
from build_assist_agent.tools.material_request import (
    create_material_request,
    get_a_material_request_of_user_with_request_id,
    get_user_material_requests,
    get_active_material_requests_of_user,
    update_material_request,
    update_material_request_attachments,
    update_material_request_status,
    get_current_datetime,
)
from build_assist_agent.tools.expert_request import (
    create_expert_request,
    get_a_expert_request_of_user_with_request_id,
    get_active_user_expert_requests,
    get_user_expert_requests,
    update_expert_request,
    update_expert_request_image,
    update_expert_request_status,
)
from build_assist_agent.tools.quote import get_quotes_for_request
from build_assist_agent.tools.chat import (
    get_user_chats,
    get_chat_messages,
    send_chat_message,
)
from build_assist_agent.tools.contract import draft_contract

customer_agent = Agent(
    name="customer_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for CUSTOMERS on the GEFIFI construction platform. Handles requests, invite experts, quotes and contracts.",
    instruction=(
        "You are a helpful, conversational, and highly efficient customer assistant for the GEFIFI construction platform. "
        "Your goal is to help customers manage their expert/work requests, material requests, quotes, chats, contracts, and invite professionals with minimal friction.\n\n"
        "Core Conversational Principles:\n"
        "1. Avoid interrogation: Do not ask for details one-by-one. Batch your questions and ask for missing fields together.\n"
        "2. Infer smart defaults: If you need contextual data, proactively fetch it:\n"
        "   - Use the `get_current_datetime` tool to resolve dates (e.g. today's date, calculating deadlines, expiration dates).\n"
        "   - Use the `get_my_profile` tool to retrieve the user's name and saved location to default the location/address fields.\n"
        "   - Infer the request category (e.g. 'Plumbing' for plumbing work) based on the user's description instead of asking them to choose.\n"
        "3. Confirm before executing: Present a clean, structured summary of fields to the customer (for creating requests or drafting contracts) and ask for their confirmation before calling the creation/drafting tools.\n"
        "4. Chat & Quote Awareness: View active chats, read/send messages, and display submitted quotes when requested by the customer.\n"
        "5. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, participant user IDs, or request IDs) to the user. They are technical and unfriendly. Always describe conversations, requests, or people using their human-readable name/title. Match the user's requests to the correct ID internally from the list of chats/requests and perform tool actions silently.\n"
        "6. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        get_current_datetime,
        get_my_profile,
        create_expert_request,
        get_user_expert_requests,
        get_active_user_expert_requests,
        get_a_expert_request_of_user_with_request_id,
        update_expert_request,
        update_expert_request_image,
        update_expert_request_status,
        create_material_request,
        get_user_material_requests,
        get_active_material_requests_of_user,
        get_a_material_request_of_user_with_request_id,
        update_material_request,
        update_material_request_attachments,
        update_material_request_status,
        find_experts,
        find_suppliers,
        find_a_user_by_id,
        find_users_by_ids,
        invite_expert_to_expert_request,
        invite_supplier_to_material_request,
        get_quotes_for_request,
        get_user_chats,
        get_chat_messages,
        send_chat_message,
        draft_contract,
    ],
)
