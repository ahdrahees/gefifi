import os
from typing import Any, Literal, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse

async def draft_contract(
    request_id: str,
    request_type: Literal["work", "material"],
    expert_supplier_id: str,
    work_details: str,
    agreement_summary: str,
    tool_context: ToolContext,
    opt_total_amount: Optional[float] = None,
    opt_payment_terms: Optional[str] = None,
    opt_advance_amount: Optional[float] = None,
    opt_start_date: Optional[str] = None,
    opt_expected_completion_date: Optional[str] = None,
    opt_terms_and_conditions: Optional[str] = None,
    opt_warranty_period: Optional[str] = None,
    opt_cancellation_policy: Optional[str] = None,
) -> dict[str, Any]:
    """
    Draft a new contract in 'draft' status with an expert or supplier.

    Use this tool when a customer explicitly requests to draft a contract for a request.

    Args:
        request_id (str): The ID of the work request or material request.
        request_type (Literal["work", "material"]): The type of request: "work" or "material".
        expert_supplier_id (str): The ID of the expert/supplier participant.
        work_details (str): Detailed scope of the work or materials to be provided.
        agreement_summary (str): Brief summary of the agreement terms.
        opt_total_amount (float, optional): Total financial cost of the contract.
        opt_payment_terms (str, optional): Schedule or terms of payments.
        opt_advance_amount (float, optional): Initial upfront payment required.
        opt_start_date (str, optional): Planned start date of work (ISO format).
        opt_expected_completion_date (str, optional): Expected completion date (ISO format).
        opt_terms_and_conditions (str, optional): Detailed legal terms and conditions.
        opt_warranty_period (str, optional): Period of warranty for work/materials.
        opt_cancellation_policy (str, optional): Rules and terms for cancellation.

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - contract (dict): The created contract object.
            - message (str): Explanation of success or failure.
    """
    print(f"TOOL[draft_contract]: validation checking active contracts for request {request_id}")
    try:
        token: str = tool_context.state.get("auth_token")
        customer_id: str = tool_context.state.get("auth_data", {}).get("user_id")

        if not customer_id:
            return {
                "status": "error",
                "error_message": "Authentication error: Customer ID not found in session state.",
            }

        # 1. Active Contract Validation
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            contracts_resp = await client.get(
                f"{API_BASE_URL}/api/contracts",
                headers=headers,
            )
            contracts_list = contracts_resp.raise_for_status().json()

        # Check for active contracts for this request
        for contract in contracts_list:
            is_same_request = (
                (request_type == "work" and contract.get("workRequestId") == request_id) or
                (request_type == "material" and contract.get("materialRequestId") == request_id)
            )
            is_active = contract.get("status") not in ["cancelled", "terminated"]
            if is_same_request and is_active:
                print(f"TOOL[draft_contract]: active contract already exists (ID: {contract['id']})")
                return {
                    "status": "error",
                    "error_message": (
                        f"Failed to draft contract. An active contract already exists for this "
                        f"request (Contract ID: {contract['id']}, Status: {contract.get('status')}). "
                        "You must cancel or terminate the existing contract before drafting a new one."
                    ),
                }

        # 2. Build POST request body
        body = {
            "customerId": customer_id,
            "expertSupplierId": expert_supplier_id,
            "workDetails": work_details,
            "agreementSummary": agreement_summary,
        }

        if request_type == "work":
            body["workRequestId"] = request_id
        else:
            body["materialRequestId"] = request_id

        if opt_total_amount is not None:
            body["totalAmount"] = opt_total_amount
        if opt_payment_terms is not None:
            body["paymentTerms"] = opt_payment_terms
        if opt_advance_amount is not None:
            body["advanceAmount"] = opt_advance_amount
        if opt_start_date is not None:
            body["startDate"] = opt_start_date
        if opt_expected_completion_date is not None:
            body["expectedCompletionDate"] = opt_expected_completion_date
        if opt_terms_and_conditions is not None:
            body["termsAndConditions"] = opt_terms_and_conditions
        if opt_warranty_period is not None:
            body["warrantyPeriod"] = opt_warranty_period
        if opt_cancellation_policy is not None:
            body["cancellationPolicy"] = opt_cancellation_policy

        print(f"TOOL[draft_contract]: sending POST request to create draft contract")
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            response = await client.post(
                f"{API_BASE_URL}/api/contracts",
                json=body,
                headers=headers,
            )
            result = response.raise_for_status().json()

        print(f"TOOL[draft_contract]: contract successfully drafted (ID: {result.get('id')})")
        return {
            "status": "success",
            "contract": result,
            "message": "Contract drafted successfully.",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to draft contract. "
        print_message = "ERROR@ TOOL[draft_contract]: "

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

        print(print_message)
        return {
            "status": "error",
            "error_message": error_message,
        }
    except Exception as e:
        print(f"ERROR@ TOOL[draft_contract]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to draft contract. Reason error: {str(e)}",
        }


async def request_contract_revision(
    contract_id: str,
    comment: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """
    Request revisions or post comments on a draft contract.

    Use this tool when an expert, supplier, or customer wants to request changes/revisions to contract terms or add comments to a contract.

    Args:
        contract_id (str): The ID of the contract to request revisions on.
        comment (str): Detailed explanation of the requested changes or terms revision.

    Returns:
        dict: Status, updated contract details, and summary message.
    """
    print(f"TOOL[request_contract_revision]: posting revision request comment for contract {contract_id}")
    try:
        token: str = tool_context.state.get("auth_token")

        body = {
            "comment": comment.strip(),
            "type": "revision_request",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            response = await client.post(
                f"{API_BASE_URL}/api/contracts/{contract_id}/comments",
                json=body,
                headers=headers,
            )
            result = response.raise_for_status().json()

        print(f"TOOL[request_contract_revision]: revision request posted successfully")
        return {
            "status": "success",
            "contract": result.get("contract"),
            "message": "Contract revision request submitted successfully.",
        }
    except httpx.HTTPError as e:
        print(f"ERROR@ TOOL[request_contract_revision]: HTTP error - {e}")
        error_msg = str(e)
        if isinstance(e, httpx.HTTPStatusError):
            try:
                error_msg = e.response.json().get("message", str(e))
            except Exception:
                pass
        return {"status": "error", "error_message": f"Failed to request contract revision: {error_msg}"}
    except Exception as e:
        print(f"ERROR@ TOOL[request_contract_revision]: Unexpected error - {str(e)}")
        return {"status": "error", "error_message": f"Failed to request contract revision: {str(e)}"}
