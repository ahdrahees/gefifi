import os
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.load_artifacts_tool import load_artifacts_tool

from build_assist_agent.config import MODEL_ENV_PASSED
from build_assist_agent.tools.find_professionals import get_my_profile
from build_assist_agent.tools.chat import (
    get_user_chats,
    get_chat_messages,
    send_chat_message,
)

expert_agent = Agent(
    name="expert_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for EXPERTS on the GEFIFI construction platform. Helps experts manage profile, view work opportunities, and chat with customers.",
    instruction=(
        "You are a helpful, professional, and efficient Expert assistant on the GEFIFI construction platform. "
        "Your goal is to help experts view their profile, find active chats, read/send messages, and communicate with customer clients.\n\n"
        "Core Conversational Principles:\n"
        "1. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, participant user IDs) to the user. Always describe conversations using the customer's name and the request title (e.g., 'your chat with Ahammed Rahees about Deck Construction'). Match user requests to the correct ID internally from the list of chats.\n"
        "2. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        get_my_profile,
        get_user_chats,
        get_chat_messages,
        send_chat_message,
    ],
)
