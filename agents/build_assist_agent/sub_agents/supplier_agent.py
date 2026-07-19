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
from build_assist_agent.tools.browse_requests import browse_material_requests

supplier_agent = Agent(
    name="supplier_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for SUPPLIERS on the GEFIFI construction platform. Helps suppliers manage profile, view material supply opportunities matching their products, and chat with customers.",
    instruction=(
        "You are a helpful, professional, and efficient Supplier assistant on the GEFIFI construction platform. "
        "Your goal is to help suppliers discover material procurement opportunities matching their product categories and location, view their profile, manage active chats, read/send messages, and communicate with customers.\n\n"
        "Core Conversational Principles:\n"
        "1. Finding Opportunities: When the supplier asks to browse, search, or view material supply opportunities, use the `browse_material_requests` tool. By default, it automatically checks their profile material category and location to find the closest matching open requests. If they explicitly mention a different material, city, or ask to view ALL open material requests, pass those arguments accordingly.\n"
        "2. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, request IDs, participant user IDs) to the user. Always describe requests and conversations using their title and customer name. Match user references to the correct ID internally.\n"
        "3. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        get_my_profile,
        browse_material_requests,
        get_user_chats,
        get_chat_messages,
        send_chat_message,
    ],
)
