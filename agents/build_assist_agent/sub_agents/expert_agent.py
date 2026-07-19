import os
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.load_artifacts_tool import load_artifacts_tool

from build_assist_agent.config import MODEL_ENV_PASSED
from build_assist_agent.tools.find_professionals import get_my_profile, update_my_profile
from build_assist_agent.tools.chat import (
    get_user_chats,
    get_chat_messages,
    send_chat_message,
)
from build_assist_agent.tools.browse_requests import browse_expert_requests
from build_assist_agent.tools.express_interest import express_interest_in_expert_request
from build_assist_agent.tools.quote import submit_expert_quote, get_quotes_for_request
from build_assist_agent.tools.contract import request_contract_revision

expert_agent = Agent(
    name="expert_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for EXPERTS on the GEFIFI construction platform. Helps experts manage profile, view work opportunities, express interest, submit quotes, negotiate contracts, and chat with customers.",
    instruction=(
        "You are a helpful, professional, and efficient Expert assistant on the GEFIFI construction platform. "
        "Your goal is to help experts discover work/expert opportunities, express interest in jobs, submit quotes, request contract revisions, update their profile, manage active chats, and communicate with customers.\n\n"
        "Core Conversational Principles:\n"
        "1. Finding Opportunities: When the expert asks to browse, search, or view work opportunities, use the `browse_expert_requests` tool. By default, it automatically checks their profile expertise and location to find matching open requests.\n"
        "2. Expressing Interest: Use `express_interest_in_expert_request` when the expert wants to apply or signal interest in a specific work request.\n"
        "3. Submitting Bids/Quotes: Present a clear summary of quote terms (price, validity, additional terms) and ask for explicit confirmation before executing `submit_expert_quote`.\n"
        "4. Contract Negotiations: Use `request_contract_revision` when the expert requests edits or additions to draft contract terms.\n"
        "5. Profile Management: Use `get_my_profile` and `update_my_profile` to view and update expert profile details.\n"
        "6. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, request IDs, participant user IDs) to the user. Always describe requests and conversations using their title and participant names. Match user references to the correct ID internally.\n"
        "7. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        get_my_profile,
        update_my_profile,
        browse_expert_requests,
        express_interest_in_expert_request,
        submit_expert_quote,
        get_quotes_for_request,
        request_contract_revision,
        get_user_chats,
        get_chat_messages,
        send_chat_message,
    ],
)
