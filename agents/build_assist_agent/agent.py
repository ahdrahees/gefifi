import os
from google.adk.agents.callback_context import CallbackContext
from google.adk.apps import App
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.save_files_as_artifacts_plugin import SaveFilesAsArtifactsPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai import types
import jwt
from google.adk.agents import Agent
from google.adk.tools import load_artifacts
from typing import Any
from .auth_types import AuthData

# Load environment variables from .env file
from . import config

from .tools.expert_request import (
    create_expert_request,
    create_expert_request_tool_guardrail,
    update_expert_request_status_tool_guardrail,
    update_expert_request_tool_guardrail,
)

MODEL_GEMINI_2_0_FLASH: str = "gemini-2.0-flash"
MODEL_GEMINI_2_5_FLASH: str = "gemini-2.5-flash"
MODEL_GEMINI_2_5_PRO: str = "gemini-2.5-pro"
OPENROUTER_MODEL_DEEPSEEK: str = "openrouter/deepseek/deepseek-chat-v3.1:free"

AGENT_ENV: str = os.getenv("AGENT_ENV", "development")
DEV_MODE: bool = AGENT_ENV == "development"


###### Auth
JWT_SECRET = os.getenv("JWT_SECRET")

if JWT_SECRET is None:
    print(
        "FATAL ERROR: JWT_SECRET is not defined in .env. Authentication will not work."
    )
    raise ValueError("FATAL ERROR: JWT_SECRET is not defined. Halting application.")


def verify_auth_token(auth_token: str) -> AuthData | None:
    """
    Verify JWT token and return user_id if valid.

    Args:
        auth_token: JWT token from the user

    Returns:
        user_id if valid, None if invalid
    """
    print("HELPER[verify_auth_token]: verifying JWT token")
    try:
        # Remove "Bearer " prefix if present
        if auth_token.startswith("Bearer "):
            auth_token = auth_token[7:]

        # Decode the JWT token (use your JWT secret from backend)
        jwt_secret = os.getenv("JWT_SECRET", "your-secret-key")
        decoded = jwt.decode(auth_token, jwt_secret, algorithms=["HS256"])

        user_id = decoded.get("id")
        print(
            f"HELPER[verify_auth_token]: token verified successfully for user_id: {user_id}"
        )
        return decoded  # or "uid" depending on your token structure
    except jwt.ExpiredSignatureError as e:
        print(f"ERROR@ HELPER[verify_auth_token]: token expired - {e}")
        return None
    except jwt.InvalidTokenError as e:
        print(f"ERROR@ HELPER[verify_auth_token]: invalid token - {e}")
        return None


######


# callback
async def auth_before_agent_callback(
    callback_context: CallbackContext,
) -> types.Content | None:
    """
    Authenticate user before processing any agent request.
    """
    agent_name = (
        callback_context.agent_name
    )  # Get the name of the agent whose model call is being intercepted
    print(f"CALLBACK[auth_before_agent_callback]: running for agent: {agent_name} ---")

    # The token should be passed from your app as state_delta in api call. If it is a development environment we will get token from environment variable
    auth_token: str | None = (
        os.getenv("ADK_TEST_AUTH_TOKEN")
        if DEV_MODE
        else callback_context.state.get("auth_token")
    )

    if not auth_token:
        return types.Content(
            role="model",
            parts=[
                types.Part(
                    text="Authentication required. Please log in to use this agent."
                )
            ],
        )

    # Verify the token
    auth_data = verify_auth_token(auth_token)

    if not auth_data:
        print(
            f"CALLBACK[auth_before_agent_callback]: Authentication failed for token: {auth_token}"
        )
        return types.Content(
            role="model",
            parts=[types.Part(text="Authentication failed. Invalid or expired token.")],
        )

    # ✅ ONLY store auth_data in persistent state (not sensitive, doesn't expire)
    callback_context.state["auth_data"] = auth_data
    # ❌ DO NOT store auth_token in persistent state for security reasons:
    # - Token is passed via state_delta (transient) and should not be persisted
    # - Storing tokens increases security risk if session is compromised
    # - Tokens expire and shouldn't be reused across requests
    # - Token is still accessible via callback_context.state.get("auth_token")
    #   during THIS invocation (due to state_delta merge)

    # In development mode, we need to persist the auth token in the state
    # to simulate the state_delta behavior across requests
    if DEV_MODE and auth_token:
        callback_context.state["auth_token"] = auth_token

    print(
        f"CALLBACK[auth_before_agent_callback]: User {auth_data['user_id']} authenticated successfully"
    )

    # available_files = await callback_context.list_artifacts()
    # print(f"Files[auth_before_agent_callback]: available files: {available_files}")

    return None  # Proceed with normal execution


# Authentication callback - runs before model calls
async def auth_before_model_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> LlmResponse | None:
    """
    Authenticate user before processing any model request.
    """
    agent_name = (
        callback_context.agent_name
    )  # Get the name of the agent whose model call is being intercepted
    print(f"CALLBACK[auth_before_model_callback]: running for agent: {agent_name} ---")

    # The token should be passed from your app as state_delta in api call. If it is a development environment we will get token from environment variable
    auth_token: str | None = (
        os.getenv("ADK_TEST_AUTH_TOKEN")
        if DEV_MODE
        else callback_context.state.get("auth_token")
    )

    if not auth_token:
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[
                    types.Part(
                        text="Authentication required. Please log in to use this agent."
                    )
                ],
            )
        )

    # Verify the token
    auth_data = verify_auth_token(auth_token)

    if not auth_data:
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[
                    types.Part(text="Authentication failed. Invalid or expired token.")
                ],
            )
        )

    # ✅ ONLY store user_id in persistent state (not sensitive, doesn't expire)
    callback_context.state["auth_data"] = auth_data

    # ❌ DO NOT store auth_token in persistent state for security reasons:
    # - Token is passed via state_delta (transient) and should not be persisted
    # - Storing tokens increases security risk if session is compromised
    # - Tokens expire and shouldn't be reused across requests
    # - Token is still accessible via callback_context.state.get("auth_token")
    #   during THIS invocation (due to state_delta merge)

    print(
        f"CALLBACK[before_model_callback]: User {auth_data['user_id']} authenticated successfully"
    )

    # available_files = await callback_context.list_artifacts()
    # print(f"Files[before_model_callback]: available files: {available_files}")

    return None  # Proceed with normal execution


# Tool callback - runs before each tool call
async def before_tool_callback(
    tool: BaseTool, args: dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Inject auth_token and user_id into tool calls.

    Note: auth_token is accessible here even though we don't persist it, because
    it was passed via state_delta and is merged into the current invocation's state.
    """

    # Get user_id from persistent state (stored in before_model_callback or before_tool_callback)
    auth_data: AuthData = tool_context.state.get("auth_data")
    user_id = auth_data["user_id"]

    # The token should be passed from your app as state_delta in api call. If it is a development environment we will get token from environment variable
    auth_token: str | None = (
        os.getenv("ADK_TEST_AUTH_TOKEN")
        if DEV_MODE
        else tool_context.state.get("auth_token")
    )

    print(
        f"CALLBACK[before_tool_callback]: running for tool: {tool.name} with user_id: {user_id}"
    )

    # Check if user_id and auth_token are present (all tool relay on this to call backend)
    if not user_id or not auth_token:
        return {"status": "error", "error_message": "Authentication required"}

    # Automatically add auth_token to tool arguments if the tool needs it
    # This allows your tools to receive the token without user explicitly providing it
    if "auth_token" in args:
        args["auth_token"] = auth_token

    if "user_id" in args:
        args["user_id"] = user_id

    available_files = await tool_context.list_artifacts()

    print(f"CALLBACK[before_tool_callback]: available files: {available_files}")

    return await run_tool_specific_guardrail(tool, args, tool_context)


async def run_tool_specific_guardrail(
    tool: BaseTool, args: dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Run a tool specific guardrail for the given tool.
    """
    print(
        f"HELPER[run_tool_specific_guardrail]: checking for tool-specific guardrail for tool: {tool.name}"
    )
    if tool.name == "create_expert_request":
        return create_expert_request_tool_guardrail(tool, args, tool_context)
    elif tool.name == "update_expert_request":
        return update_expert_request_tool_guardrail(tool, args, tool_context)
    elif tool.name == "update_expert_request_status":
        return await update_expert_request_status_tool_guardrail(
            tool, args, tool_context
        )

    print(
        f"HELPER[run_tool_specific_guardrail]: no specific guardrail found for tool: {tool.name}"
    )
    return None


root_agent = Agent(
    name="customer_assist_agent",
    # LiteLLM model options (choose one):
    # - Gemini: "gemini-2.0-flash", "gemini-1.5-pro"
    # - OpenAI: "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"
    # - Claude: "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"
    # - Local: "ollama/llama3", "ollama/mistral"
    model=MODEL_GEMINI_2_5_FLASH,
    description=(
        "help customer to create and edit expert/work request, material request, contract. "
        "Specialized assistant for CUSTOMERS on the GEFIFI construction platform. "
        "Helps customers create and manage work requests (expert requests) for construction projects, "
        "Handles all customer-facing construction project needs from initial request creation to project completion."
    ),
    instruction=(
        "You are a helpful customer assistant for GEFIFI construction platform. "
        ""
        "Use `create_expert_request` tool in two specific scenarios:"
        "1. When a user wants to create a new expert request."
        "2. When a user wants to edit an existing expert request."
    ),
    tools=[load_artifacts, create_expert_request],
    # Register authentication callbacks
    before_agent_callback=auth_before_agent_callback,
    before_tool_callback=before_tool_callback,
)

# build_assist_agent

app = App(
    name="build_assist_agent",  # name should be the agent directory name
    root_agent=root_agent,
    plugins=[SaveFilesAsArtifactsPlugin()],
)
