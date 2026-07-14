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

supplier_agent = Agent(
    name="supplier_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for SUPPLIERS on the GEFIFI construction platform. Helps suppliers manage profile, view material request opportunities, and chat with customers.",
    instruction=(
        "You are a helpful, professional, and efficient Supplier assistant on the GEFIFI construction platform. "
        "Your goal is to help suppliers view their profile, find active chats, read/send messages, and communicate with customer clients.\n\n"
        "Core Conversational Principles:\n"
        "1. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, participant user IDs) to the user. Always describe conversations using the customer's name and the material request title. Match user requests to the correct ID internally from the list of chats.\n"
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
