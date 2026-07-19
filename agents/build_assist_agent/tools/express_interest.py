import logging
from typing import Any, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse
from build_assist_agent.auth_types import AuthData

logger = logging.getLogger(__name__)


async def express_interest_in_expert_request(
    work_request_id: str,
    tool_context: ToolContext,
    opt_message: Optional[str] = None,
) -> dict[str, Any]:
    """
    Express interest in an open work/expert request as an expert.

    Use this tool when an expert user wants to signal interest in a customer's work request. This tool fetches the work request details to identify the customer, adds the expert to the interested list, and opens a chat conversation.

    Args:
        work_request_id (str): The ID of the work request to express interest in.
        opt_message (str, optional): Custom initial message content to send to the customer.

    Returns:
        dict: Status, interest details, chat ID, and message.
    """
    logger.info("TOOL[express_interest_in_expert_request]: expressing interest in work request %s", work_request_id)
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data", {})
        user_id = auth_data.get("user_id")

        if not token or not user_id:
            return {"status": "error", "error_message": "Authentication required."}

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            # 1. Fetch work request details to get customer ID
            req_resp = await client.get(f"{API_BASE_URL}/api/work-requests/{work_request_id}", headers=headers)
            work_request = req_resp.raise_for_status().json()
            customer_id = work_request.get("customerId")

            if not customer_id:
                return {"status": "error", "error_message": "Customer ID not found for this work request."}

            # 2. Call express interest endpoint
            body = {
                "targetUserId": customer_id,
                "workRequestId": work_request_id,
                "predefinedMessageKey": "PROVIDER_INTEREST_IN_WORK_REQUEST",
            }
            if opt_message and opt_message.strip():
                body["initialMessageContent"] = opt_message.strip()

            interest_resp = await client.post(f"{API_BASE_URL}/api/users/interest", json=body, headers=headers)
            result = interest_resp.raise_for_status().json()

        logger.info("TOOL[express_interest_in_expert_request]: interest successfully registered")
        return {
            "status": "success",
            "request_title": work_request.get("title"),
            "customer_id": customer_id,
            "chat": result.get("chat"),
            "message": result.get("message", "Interest expressed successfully. A chat thread has been started with the customer."),
        }

    except httpx.HTTPError as e:
        logger.error("HTTP error in express_interest_in_expert_request: %s", e)
        error_msg = str(e)
        if isinstance(e, httpx.HTTPStatusError):
            try:
                error_msg = e.response.json().get("message", str(e))
            except Exception:
                pass
        return {"status": "error", "error_message": f"Failed to express interest: {error_msg}"}
    except Exception as e:
        logger.exception("Unexpected error in express_interest_in_expert_request")
        return {"status": "error", "error_message": f"Failed to express interest: {str(e)}"}


async def express_interest_in_material_request(
    material_request_id: str,
    tool_context: ToolContext,
    opt_message: Optional[str] = None,
) -> dict[str, Any]:
    """
    Express interest in an open material procurement request as a supplier.

    Use this tool when a supplier user wants to signal interest in a customer's material request. This tool fetches the material request details to identify the customer, adds the supplier to the interested list, and opens a chat conversation.

    Args:
        material_request_id (str): The ID of the material request to express interest in.
        opt_message (str, optional): Custom initial message content to send to the customer.

    Returns:
        dict: Status, interest details, chat ID, and message.
    """
    logger.info("TOOL[express_interest_in_material_request]: expressing interest in material request %s", material_request_id)
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data", {})
        user_id = auth_data.get("user_id")

        if not token or not user_id:
            return {"status": "error", "error_message": "Authentication required."}

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            # 1. Fetch material request details to get customer ID
            req_resp = await client.get(f"{API_BASE_URL}/api/material-requests/{material_request_id}", headers=headers)
            material_request = req_resp.raise_for_status().json()
            customer_id = material_request.get("customerId")

            if not customer_id:
                return {"status": "error", "error_message": "Customer ID not found for this material request."}

            # 2. Call express interest endpoint
            body = {
                "targetUserId": customer_id,
                "materialRequestId": material_request_id,
                "predefinedMessageKey": "SUPPLIER_INTEREST_IN_MATERIAL_REQUEST",
            }
            if opt_message and opt_message.strip():
                body["initialMessageContent"] = opt_message.strip()

            interest_resp = await client.post(f"{API_BASE_URL}/api/users/interest", json=body, headers=headers)
            result = interest_resp.raise_for_status().json()

        logger.info("TOOL[express_interest_in_material_request]: interest successfully registered")
        return {
            "status": "success",
            "request_title": material_request.get("title"),
            "customer_id": customer_id,
            "chat": result.get("chat"),
            "message": result.get("message", "Interest expressed successfully. A chat thread has been started with the customer."),
        }

    except httpx.HTTPError as e:
        logger.error("HTTP error in express_interest_in_material_request: %s", e)
        error_msg = str(e)
        if isinstance(e, httpx.HTTPStatusError):
            try:
                error_msg = e.response.json().get("message", str(e))
            except Exception:
                pass
        return {"status": "error", "error_message": f"Failed to express interest: {error_msg}"}
    except Exception as e:
        logger.exception("Unexpected error in express_interest_in_material_request")
        return {"status": "error", "error_message": f"Failed to express interest: {str(e)}"}
