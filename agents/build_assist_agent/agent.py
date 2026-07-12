import logging
import os
from typing import Any

import jwt
from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.apps import App
from google.adk.models.lite_llm import LiteLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.save_files_as_artifacts_plugin import SaveFilesAsArtifactsPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.load_artifacts_tool import load_artifacts_tool
from google.adk.tools.tool_context import ToolContext
from google.genai import types

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
    update_material_request_status_tool_guardrail,
    get_current_datetime,
)
from build_assist_agent.tools.quote import get_quotes_for_request
from build_assist_agent.tools.chat import (
    get_user_chats,
    get_chat_messages,
    send_chat_message,
)

# Load environment variables from .env file
from . import config
from .auth_types import AuthData
from .tools.expert_request import (
    create_expert_request,
    create_expert_request_tool_guardrail,
    get_a_expert_request_of_user_with_request_id,
    get_active_user_expert_requests,
    get_user_expert_requests,
    update_expert_request,
    update_expert_request_image,
    update_expert_request_status,
    update_expert_request_status_tool_guardrail,
    update_expert_request_tool_guardrail,
)

# Configure basic logging level based on environment (defaults to INFO in production)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)

logger = logging.getLogger(__name__)

MODEL_ENV_PASSED = os.getenv("LLM_MODEL", "gemini/gemini-3.1-flash-lite")
AGENT_ENV: str = os.getenv("AGENT_ENV", "development")
DEV_MODE: bool = AGENT_ENV == "development"

###### Auth
JWT_SECRET = os.getenv("JWT_SECRET")

if JWT_SECRET is None:
    logger.critical(
        "JWT_SECRET is not defined in .env. Authentication will not work."
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
    logger.debug("verify_auth_token: verifying JWT token")
    try:
        # Remove "Bearer " prefix if present
        if auth_token.startswith("Bearer "):
            auth_token = auth_token[7:]

        # Decode the JWT token (use your JWT secret from backend)
        jwt_secret = os.getenv("JWT_SECRET", "your-secret-key")
        decoded = jwt.decode(auth_token, jwt_secret, algorithms=["HS256"])

        user_id = decoded.get("id")
        # email = decoded.get("email")
        user_type = decoded.get("userType")

        if user_id is None:
            logger.warning("verify_auth_token: user_id not found in token")
            return None
        elif user_type is None:
            logger.warning("verify_auth_token: user_type not found in token")
            return None

        auth_data = AuthData(user_id=user_id, user_type=user_type)

        logger.debug(
            "verify_auth_token: token verified successfully for user_id: %s", user_id
        )
        return auth_data
    except jwt.ExpiredSignatureError as e:
        logger.warning("verify_auth_token: token expired - %s", e)
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("verify_auth_token: invalid token - %s", e)
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
    logger.debug("auth_before_agent_callback: running for agent: %s", agent_name)

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
        logger.warning(
            "auth_before_agent_callback: Authentication failed for token"
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

    logger.info(
        "auth_before_agent_callback: User %s authenticated successfully", auth_data['user_id']
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
    logger.debug("auth_before_model_callback: running for agent: %s", agent_name)

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

    logger.info(
        "before_model_callback: User %s authenticated successfully", auth_data['user_id']
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

    logger.info(
        "before_tool_callback: running for tool: %s with user_id: %s", tool.name, user_id
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

    logger.debug("before_tool_callback: available files: %s", available_files)

    return await run_tool_specific_guardrail(tool, args, tool_context)


async def run_tool_specific_guardrail(
    tool: BaseTool, args: dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Run a tool specific guardrail for the given tool.
    """
    logger.debug(
        "run_tool_specific_guardrail: checking for tool-specific guardrail for tool: %s", tool.name
    )
    if tool.name == "create_expert_request":
        return create_expert_request_tool_guardrail(tool, args, tool_context)
    elif tool.name == "update_expert_request":
        return update_expert_request_tool_guardrail(tool, args, tool_context)
    elif tool.name == "update_expert_request_status":
        return await update_expert_request_status_tool_guardrail(
            tool, args, tool_context
        )
    elif tool.name == "update_material_request_status":
        return await update_material_request_status_tool_guardrail(
            tool, args, tool_context
        )

    logger.debug(
        "run_tool_specific_guardrail: no specific guardrail found for tool: %s", tool.name
    )
    return None


root_agent = Agent(
    name="customer_assist_agent",
    # LiteLLM model options (choose one):
    # - Gemini: "gemini-2.0-flash", "gemini-1.5-pro"
    # - OpenAI: "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"
    # - Claude: "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"
    # - Local: "ollama/llama3", "ollama/mistral"
    model=LiteLlm(model=MODEL_ENV_PASSED),
    description=(
        "help customer to create and edit expert/work request, material request, contract. "
        "Specialized assistant for CUSTOMERS on the GEFIFI construction platform. "
        "Helps customers create and manage expert requests (AKA work requests) for construction projects, "
        "Handles all customer-facing construction project needs from initial request creation to project completion."
    ),
    instruction=(
        "You are a helpful, conversational, and highly efficient customer assistant for the GEFIFI construction platform. "
        "Your goal is to help customers manage their expert/work requests, material requests, quotes, chats, and invite professionals with minimal friction.\n\n"
        "Core Conversational Principles:\n"
        "1. Avoid interrogation: Do not ask for details one-by-one. Batch your questions and ask for missing fields together.\n"
        "2. Infer smart defaults: If you need contextual data, proactively fetch it:\n"
        "   - Use the `get_current_datetime` tool to resolve dates (e.g. today's date, calculating deadlines, expiration dates).\n"
        "   - Use the `get_my_profile` tool to retrieve the user's name and saved location to default the location/address fields.\n"
        "   - Infer the request category (e.g. 'Plumbing' for plumbing work) based on the user's description instead of asking them to choose.\n"
        "3. Confirm before executing: Present a clean, structured summary of the request fields to the customer and ask for their confirmation before calling the creation tools.\n"
        "4. Chat & Quote Awareness: View active chats, read/send messages, and display submitted quotes when requested by the customer.\n"
        "5. ID Abstraction (CRITICAL): Never show raw UUIDs (e.g., chat IDs like `93d2af17-b73a-4404-b5c8-22cf4db92ec0` or participant user IDs) to the user. They are technical and unfriendly. Always describe conversations using the participant's name and request title (e.g., 'your chat with Ramesh Kumar about Deck Construction'). Match the user's requests to the correct ID internally from the list of chats and perform tool actions silently.\n"
        "6. Be friendly and professional, and present responses in a clean, human-readable format rather than raw JSON or API outputs."
    ),
    tools=[
        load_artifacts_tool,
        # Context and Utility Tools
        get_current_datetime,
        get_my_profile,
        # Expert Request Tools
        create_expert_request,
        get_user_expert_requests,
        get_active_user_expert_requests,
        get_a_expert_request_of_user_with_request_id,
        update_expert_request,
        update_expert_request_image,
        update_expert_request_status,
        # Material Request Tools
        create_material_request,
        get_user_material_requests,
        get_active_material_requests_of_user,
        get_a_material_request_of_user_with_request_id,
        update_material_request,
        update_material_request_attachments,
        update_material_request_status,
        # User interaction tools
        find_experts,
        find_suppliers,
        find_a_user_by_id,
        find_users_by_ids,
        invite_expert_to_expert_request,
        invite_supplier_to_material_request,
        # Quote Tools
        get_quotes_for_request,
        # Chat Tools
        get_user_chats,
        get_chat_messages,
        send_chat_message,
        # TODO: Contract creation and management tools
    ],
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
