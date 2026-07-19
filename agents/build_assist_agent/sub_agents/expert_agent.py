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
from build_assist_agent.tools.browse_requests import browse_expert_requests

expert_agent = Agent(
    name="expert_agent",
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description="Specialized assistant for EXPERTS on the GEFIFI construction platform. Helps experts manage profile, view expert work opportunities matching their skills, and chat with customers.",
    instruction=(
        "You are a helpful, professional, and efficient Expert assistant on the GEFIFI construction platform. "
        "Your goal is to help experts discover work/expert opportunities matching their skills and location, view their profile, manage active chats, read/send messages, and communicate with customers.\n\n"
        "Core Conversational Principles:\n"
        "1. Finding Opportunities: When the expert asks to browse, search, or view work opportunities or expert requests, use the `browse_expert_requests` tool. By default, it automatically checks their profile expertise and location to find the closest matching open requests. If they explicitly mention a different skill, city, or want to see ALL open requests, pass those arguments accordingly.\n"
        "2. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs, request IDs, participant user IDs) to the user. Always describe requests and conversations using their title and participant names. Match user references to the correct ID internally.\n"
        "3. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        get_my_profile,
        browse_expert_requests,
        get_user_chats,
        get_chat_messages,
        send_chat_message,
    ],
)
