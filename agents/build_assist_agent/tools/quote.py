import logging
import os
from typing import Any, Literal, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse

logger = logging.getLogger(__name__)

# Tool to get quotes for a request
async def get_quotes_for_request(
    request_id: str,
    request_type: Literal["work", "material"],
    tool_context: ToolContext,
) -> dict[str, Any]:
    """
    Get all quotes submitted by experts or suppliers for a specific work or material request.

    Use this tool when a customer wants to view quotes submitted for their work requests or material requests.

    Args:
        request_id (str): The ID of the work request or material request.
        request_type (Literal["work", "material"]): The type of request: "work" (for expert/work request) or "material" (for material request).

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - quotes (list): List of quotes with details of the sender and amount.
            - message (str): Success/Error message.
    """
    logger.info("TOOL[get_quotes_for_request]: fetching quotes for request %s (type: %s)", request_id, request_type)
    try:
        token: str = tool_context.state.get("auth_token")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }
            response = await client.get(
                f"{API_BASE_URL}/api/quotes/request/{request_id}?requestType={request_type}",
                headers=headers,
            )
            result = response.raise_for_status().json()

        quotes_list = result.get("quotes", [])
        logger.info("TOOL[get_quotes_for_request]: retrieved %s quotes", len(quotes_list))

        return {
            "status": "success",
            "quotes": quotes_list,
            "message": "Quotes retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve quotes. "
        print_message = "ERROR@ TOOL[get_quotes_for_request]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code
            response_json: HTTPStatusErrorResponse = e.response.json()
            url = e.request.url
            print_message = (
                print_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json.get('message', 'Unknown error')}"
            )
        else:
            print_message = print_message + f"HTTP error - {e}"
            error_message = error_message + f"HTTP error: {e}"

        logger.error(print_message)
        return {
            "status": "error",
            "error_message": error_message,
        }
    except Exception as e:
        logger.exception("Unexpected error in get_quotes_for_request")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve quotes. Reason error: {str(e)}",
        }
