import logging
import os
from typing import Any, AsyncGenerator
from contextlib import aclosing

import jwt
from google.adk.agents import BaseAgent, Agent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.callback_context import CallbackContext
from google.adk.apps import App
from google.adk.models.lite_llm import LiteLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.save_files_as_artifacts_plugin import SaveFilesAsArtifactsPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.load_artifacts_tool import load_artifacts_tool
from google.adk.tools.tool_context import ToolContext
from google.adk.runners import Event
from google.genai import types

# Import tool guardrails
from build_assist_agent.tools.expert_request import (
    create_expert_request_tool_guardrail,
    update_expert_request_status_tool_guardrail,
    update_expert_request_tool_guardrail,
)
from build_assist_agent.tools.material_request import (
    update_material_request_status_tool_guardrail,
)

# Import sub-agents
from build_assist_agent.sub_agents.customer_agent import customer_agent
from build_assist_agent.sub_agents.expert_agent import expert_agent
from build_assist_agent.sub_agents.supplier_agent import supplier_agent

from .auth_types import AuthData

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

    # store auth_data in persistent state
    callback_context.state["auth_data"] = auth_data

    # In development mode, we need to persist the auth token in the state
    if DEV_MODE and auth_token:
        callback_context.state["auth_token"] = auth_token

    logger.info(
        "auth_before_agent_callback: User %s authenticated successfully", auth_data['user_id']
    )

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
    )
    logger.debug("auth_before_model_callback: running for agent: %s", agent_name)

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

    callback_context.state["auth_data"] = auth_data

    logger.info(
        "before_model_callback: User %s authenticated successfully", auth_data['user_id']
    )

    return None  # Proceed with normal execution


# Tool callback - runs before each tool call
async def before_tool_callback(
    tool: BaseTool, args: dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Inject auth_token and user_id into tool calls.
    """
    auth_data: AuthData = tool_context.state.get("auth_data")
    user_id = auth_data["user_id"]

    auth_token: str | None = (
        os.getenv("ADK_TEST_AUTH_TOKEN")
        if DEV_MODE
        else tool_context.state.get("auth_token")
    )

    logger.info(
        "before_tool_callback: running for tool: %s with user_id: %s", tool.name, user_id
    )

    if not user_id or not auth_token:
        return {"status": "error", "error_message": "Authentication required"}

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
    return None


class RoleRouterAgent(BaseAgent):
    """
    Programmatic router agent that delegates execution directly to the sub-agent
    matching the user's authenticated type (customer, expert, supplier).
    """

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        auth_data = ctx.session.state.get("auth_data", {})
        user_type = auth_data.get("user_type") if auth_data else None

        logger.info("RoleRouterAgent: Routing conversation for userType: '%s'", user_type)

        target_agent = None
        for sub in self.sub_agents:
            if sub.name == f"{user_type}_agent":
                target_agent = sub
                break

        # Fallback to customer_agent if no userType matches
        if not target_agent:
            logger.warning("RoleRouterAgent: Target sub-agent '%s_agent' not found. Defaulting to customer_agent.", user_type)
            for sub in self.sub_agents:
                if sub.name == "customer_agent":
                    target_agent = sub
                    break

        if not target_agent:
            logger.error("RoleRouterAgent: No valid sub-agents registered.")
            return

        async with aclosing(target_agent.run_async(ctx)) as agen:
            async for event in agen:
                yield event


# Register tool callback to sub-agents
customer_agent.before_tool_callback = before_tool_callback
expert_agent.before_tool_callback = before_tool_callback
supplier_agent.before_tool_callback = before_tool_callback

# Instantiate root agent
root_agent = RoleRouterAgent(
    name="gefifi_router_agent",
    sub_agents=[customer_agent, expert_agent, supplier_agent],
    before_agent_callback=auth_before_agent_callback,
)

app = App(
    name="build_assist_agent",
    root_agent=root_agent,
    plugins=[SaveFilesAsArtifactsPlugin()],
)
