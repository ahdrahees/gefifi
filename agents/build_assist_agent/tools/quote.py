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


async def submit_expert_quote(
    work_request_id: str,
    title: str,
    amount: float,
    tool_context: ToolContext,
    opt_description: Optional[str] = None,
    opt_validity_days: int = 30,
    opt_additional_terms: Optional[str] = None,
) -> dict[str, Any]:
    """
    Submit a formal bid/quote for a work request as an expert.

    Use this tool when an expert explicitly asks to submit a quote or estimate for a work request.

    Args:
        work_request_id (str): The ID of the work request.
        title (str): Concise title for the quote (e.g., "Full Plumbing Services Bid").
        amount (float): Total price/cost for the work.
        opt_description (str, optional): Detailed breakdown of the bid and scope of work.
        opt_validity_days (int, optional): Number of days the quote remains valid (default: 30).
        opt_additional_terms (str, optional): Payment terms, conditions, or milestone requirements.

    Returns:
        dict: Status, created quote details, and summary message.
    """
    logger.info("TOOL[submit_expert_quote]: submitting quote for work request %s", work_request_id)
    try:
        token: str = tool_context.state.get("auth_token")
        body = {
            "requestId": work_request_id,
            "requestType": "work",
            "title": title.strip(),
            "amount": amount,
            "validityDays": opt_validity_days,
        }
        if opt_description:
            body["description"] = opt_description.strip()
        if opt_additional_terms:
            body["additionalTerms"] = opt_additional_terms.strip()

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            response = await client.post(f"{API_BASE_URL}/api/quotes", json=body, headers=headers)
            result = response.raise_for_status().json()

        logger.info("TOOL[submit_expert_quote]: quote submitted successfully (ID: %s)", result.get("id"))
        return {
            "status": "success",
            "quote": result,
            "message": "Quote submitted successfully.",
        }
    except httpx.HTTPError as e:
        logger.error("HTTP error in submit_expert_quote: %s", e)
        error_msg = str(e)
        if isinstance(e, httpx.HTTPStatusError):
            try:
                error_msg = e.response.json().get("message", str(e))
            except Exception:
                pass
        return {"status": "error", "error_message": f"Failed to submit quote: {error_msg}"}
    except Exception as e:
        logger.exception("Unexpected error in submit_expert_quote")
        return {"status": "error", "error_message": f"Failed to submit quote: {str(e)}"}


async def submit_material_quote(
    material_request_id: str,
    title: str,
    amount: float,
    tool_context: ToolContext,
    opt_description: Optional[str] = None,
    opt_validity_days: int = 30,
    opt_additional_terms: Optional[str] = None,
) -> dict[str, Any]:
    """
    Submit a formal material supply quote for a material request as a supplier.

    Use this tool when a supplier explicitly asks to submit a quote for a material request.

    Args:
        material_request_id (str): The ID of the material request.
        title (str): Concise title for the quote (e.g., "Cement & Steel Procurement Quote").
        amount (float): Total price/cost for the materials.
        opt_description (str, optional): Itemized breakdown of materials, brand specs, and delivery schedule.
        opt_validity_days (int, optional): Number of days the quote remains valid (default: 30).
        opt_additional_terms (str, optional): Payment terms, delivery conditions, or notes.

    Returns:
        dict: Status, created quote details, and summary message.
    """
    logger.info("TOOL[submit_material_quote]: submitting quote for material request %s", material_request_id)
    try:
        token: str = tool_context.state.get("auth_token")
        body = {
            "requestId": material_request_id,
            "requestType": "material",
            "title": title.strip(),
            "amount": amount,
            "validityDays": opt_validity_days,
        }
        if opt_description:
            body["description"] = opt_description.strip()
        if opt_additional_terms:
            body["additionalTerms"] = opt_additional_terms.strip()

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            response = await client.post(f"{API_BASE_URL}/api/quotes", json=body, headers=headers)
            result = response.raise_for_status().json()

        logger.info("TOOL[submit_material_quote]: quote submitted successfully (ID: %s)", result.get("id"))
        return {
            "status": "success",
            "quote": result,
            "message": "Material quote submitted successfully.",
        }
    except httpx.HTTPError as e:
        logger.error("HTTP error in submit_material_quote: %s", e)
        error_msg = str(e)
        if isinstance(e, httpx.HTTPStatusError):
            try:
                error_msg = e.response.json().get("message", str(e))
            except Exception:
                pass
        return {"status": "error", "error_message": f"Failed to submit material quote: {error_msg}"}
    except Exception as e:
        logger.exception("Unexpected error in submit_material_quote")
        return {"status": "error", "error_message": f"Failed to submit material quote: {str(e)}"}
