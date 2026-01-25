import asyncio
from typing import Any, Literal, Optional, TypedDict

import httpx
from google.adk.tools import BaseTool
from google.adk.tools.tool_context import ToolContext

from build_assist_agent.auth_types import AuthData
from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse


# Arg
class MaterialItem(TypedDict):
    """Material item for a material request

    Example:
        {
            "item_name": "Portland Cement",
            "quantity_of_item_with_unit": "50 bags"
            "notes": "Grade 43"
        }
    """

    item_name: str
    quantity_of_item_with_unit: str
    notes: Optional[str]


class Attachment(TypedDict):
    """Represents a file attachment, used in Material Requests, Contracts, etc.

    fileName: str  # Original name of the file
    filePath: str  # Path/URL in GCS
    fileType: str  # MIME type
    size: int  # Size in bytes
    """

    fileName: str  # Original name of the file
    filePath: str  # Path/URL in GCS
    fileType: str  # MIME type
    size: int  # Size in bytes


class MaterialItemBackend(TypedDict):
    """Material items in the Material request"""

    itemName: str
    quantity: str
    notes: str | None


class MaterialRequest(TypedDict):
    """Material request. Represents a request for materials, either standalone or linked to a WorkRequest."""

    id: str
    customerId: str
    title: str
    description: str
    deliveryLocation: str
    deliveryDate: str | None
    linkedWorkRequestId: str | None
    attachments: list[Attachment] | None
    items: list[MaterialItemBackend]
    status: Literal[
        "open", "quoting", "ordered", "contracted", "completed", "cancelled"
    ]
    createdAt: str
    updatedAt: str
    interestedSuppliers: list[str] | None
    invitedSuppliers: list[str] | None
    quotes: list[str] | None


async def create_material_request(
    title: str,
    description: str,
    delivery_location: str,
    material_items: list[dict[str, str]],
    tool_context: ToolContext,
    delivery_date: Optional[str] = None,
    attachment_list: Optional[list[str]] = None,
    expert_request_id_to_link: Optional[str] = None,
) -> dict[str, Any]:
    """
    Create a new material request for the authenticated customer and optionally upload attachments.
    
    Parameters:
        title (str): Material request title.
        description (str): Material request description.
        delivery_location (str): Delivery location for the request.
        material_items (list[dict[str, str]]): List of items where each item must include keys
            'item_name' and 'quantity_of_item_with_unit', and may include 'notes'.
        tool_context (ToolContext): Execution context (provides auth token and artifact loading).
        delivery_date (Optional[str]): Optional delivery date (string) to include on the request.
        attachment_list (Optional[list[str]]): Optional list of filenames to attach; supported file types include
            pdf, doc, docx, xls, xlsx, dwg, dxf, png, jpeg, jpg, webp, and gif.
        expert_request_id_to_link (Optional[str]): Optional work/expert request ID to link to this material request.
    
    Returns:
        dict: Result object with a 'status' key ('success' or 'error').
            On success: includes 'created_material_request' (the created request object) and 'message'.
            On error: includes 'error_message'; may include 'created_material_request' if creation succeeded but
            subsequent attachment upload or fetch of the updated request failed.
    """
    # Initialize to None to ensure the variable is always bound
    created_material_request: MaterialRequest | None = None
    try:
        token: str = tool_context.state.get("auth_token")

        items: list[dict[str, str]] = [
            {
                "itemName": item["item_name"],
                "quantity": item["quantity_of_item_with_unit"],
                **({"notes": item["notes"]} if (item["notes"] is not None) else {}),
            }
            for item in material_items
        ]

        material_request_data = {
            "title": title,
            "description": description,
            "deliveryLocation": delivery_location,
            "items": items,
        }

        if delivery_date is not None:
            material_request_data["deliveryDate"] = delivery_date
        if expert_request_id_to_link is not None:
            material_request_data["linkedWorkRequestId"] = expert_request_id_to_link

        # creating material request
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.post(
                f"{API_BASE_URL}/api/material-requests",
                json=material_request_data,
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

        created_material_request = response.json()

        # upload attachments
        if attachment_list and len(attachment_list) > 0 and created_material_request:
            loading_file_artifacts = [
                tool_context.load_artifact(filename=filename)
                for filename in attachment_list
            ]
            # Promise all to get all the files concurrently
            file_artifacts = await asyncio.gather(*loading_file_artifacts)

            attachments: list[tuple[str, bytes, str]] = [
                (
                    file.inline_data.display_name,
                    file.inline_data.data,
                    file.inline_data.mime_type,
                )
                for file in file_artifacts
                if file
                and file.inline_data
                and file.inline_data.display_name
                and file.inline_data.data
                and file.inline_data.mime_type
            ]
            # Upload attachments
            _ = await upload_entity_attachments(
                "material-requests", created_material_request["id"], attachments, token
            )
            # get the material request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{API_BASE_URL}/api/material-requests/{created_material_request['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                created_material_request = response.raise_for_status().json()

        return {
            "status": "success",
            "created_material_request": created_material_request,
            "message": "Material request created successfully. Please wait for supplier to respond.",
        }
    except httpx.HTTPError as e:
        url = e.request.url

        result: dict[str, Any] = {"status": "error"}

        error_message = "Failed to create material request. "
        print_message = "ERROR@ TOOL[create_material_request]: "

        is_material_request_exists = created_material_request is not None
        if is_material_request_exists:
            result["created_material_request"] = created_material_request

        if isinstance(e, httpx.TimeoutException):
            if (
                is_material_request_exists
                and url
                == f"{API_BASE_URL}/api/material-requests/{created_material_request['id']}"
            ):
                print_message = (
                    print_message
                    + f"HTTP timeout at url `{url}` for getting updated material request after material request creation and uploaded attachments. error - {e}"
                )
                error_message = f"Successfully created material request and uploaded attachments, but failed to get updated material request after creation and attachment upload. HTTP Gefifi backend api call Timeout error occurred: {e}"
            elif (
                is_material_request_exists
                and url
                == f"{API_BASE_URL}/api/attachments/material-requests/{created_material_request['id']}"
            ):
                print_message = (
                    print_message
                    + f"HTTP timeout at url `{url}` for uploading attachments of material request after material request creation. error - {e}"
                )
                error_message = f"Successfully created material request, but failed to upload attachments. HTTP Gefifi backend api call Timeout error occurred: {e}"
            else:
                print_message = print_message + f"HTTP timeout error - {e}"
                error_message = (
                    error_message
                    + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
                )

        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)

            if (
                is_material_request_exists
                and url
                == f"{API_BASE_URL}/api/material-requests/{created_material_request['id']}"
            ):
                print_message = (
                    print_message
                    + "Created material request and uploaded attachments, but failed to get updated material request. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    "Successfully created material request and uploaded attachments, but failed to get updated material request after creation and attachment upload. "
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            elif (
                is_material_request_exists
                and url
                == f"{API_BASE_URL}/api/attachments/material-requests/{created_material_request['id']}"
            ):
                print_message = (
                    print_message
                    + "Created material request, but failed to upload attachments. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    "Successfully created material request, but failed to upload attachments. "
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            else:
                print_message = (
                    print_message
                    + error_message
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    error_message
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
        else:
            print_message = print_message + f"HTTP error - {e}"
            error_message = (
                "Material request is created but tool call is failed. "
                if is_material_request_exists
                else error_message + f"HTTP error: {e}"
            )

        print(print_message)
        result["error_message"] = error_message
        return result
    except Exception as e:
        print(f"ERROR@ TOOL[create_material_request]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to create material request. Reason error: {str(e)}",
        }


class UploadAttachmentsResponse(TypedDict):
    """Response from the upload attachments API."""

    message: str
    attachments: list[Attachment]
    totalAttachments: int


async def upload_entity_attachments(
    entity_type: Literal["material-requests", "work-requests", "contracts"],
    entity_id: str,
    attachments: list[tuple[str, bytes, str]],
    token: str,
) -> UploadAttachmentsResponse:
    """
    Upload files as attachments for a given entity.
    
    Parameters:
        entity_type: Which entity to attach files to; one of "material-requests", "work-requests", or "contracts".
        entity_id: ID of the target entity.
        attachments: List of tuples (filename, content_bytes, mime_type) representing each file to upload.
        token: Bearer authentication token used for the request.
    
    Returns:
        UploadAttachmentsResponse: Parsed JSON response containing `message`, `attachments`, and `totalAttachments`.
    """
    files = [("files", file) for file in attachments]
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/api/attachments/{entity_type}/{entity_id}",
            files=files,
            headers=headers,
        )

        # Raise the HTTPStatusError if one occurred.
        response = response.raise_for_status()

    return response.json()


# Tool
async def get_user_material_requests(tool_context: ToolContext) -> dict[str, Any]:
    """
    Retrieve all material requests for the authenticated customer.
    
    Parameters:
        tool_context (ToolContext): Context that must provide "auth_token" and "auth_data" (containing "user_id") used to authenticate and identify the customer.
    
    Returns:
        dict: A dictionary with a 'status' key set to 'success' or 'error'.
            - If 'status' is 'success', includes:
                - 'material_requests_list': list of material request objects retrieved from the backend.
                - 'message': success message.
            - If 'status' is 'error', includes:
                - 'error_message': human-readable error description.
    """
    print("TOOL[get_user_material_requests]: fetching user's material requests")
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data")
        user_id = auth_data["user_id"]

        print(f"TOOL[get_user_material_requests]: requesting for user_id: {user_id}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/material-requests?customerId={user_id}",
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            # response = response.raise_for_status()
            result = response.raise_for_status().json()

        print(
            f"TOOL[get_user_material_requests]: retrieved {len(result)} material requests"
        )
        return {
            "status": "success",
            "material_requests_list": result,
            "message": "Material requests retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve material requests. "
        print_message = "ERROR@ TOOL[get_user_material_requests]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)
            url = e.request.url
            print_message = (
                print_message
                + error_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json['message']}"
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
        print(f"ERROR@ TOOL[get_user_material_requests]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve material requests. Reason error: {str(e)}",
        }


# Tool
async def get_active_material_requests_of_user(
    tool_context: ToolContext,
) -> dict[str, Any]:
    """
    Retrieve the authenticated customer's material requests filtered to active statuses.
    
    Active statuses considered: "open", "quoting", "ordered", and "contracted".
    
    Returns:
        dict: A result dictionary containing:
            - `status`: `"success"` or `"error"`.
            - On success: `active_material_requests_list` (list of material request objects) and `message` (success message).
            - On error: `error_message` (description of the failure).
    """
    print(
        "TOOL[get_active_material_requests_of_user]: fetching user's material requests"
    )
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data")
        user_id = auth_data["user_id"]

        print(
            f"TOOL[get_active_material_requests_of_user]: requesting for user_id: {user_id}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/material-requests?customerId={user_id}",
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            # response = response.raise_for_status()
            material_requests_list: list[MaterialRequest] = (
                response.raise_for_status().json()
            )

            ACTIVE_STATUSES = {"open", "quoting", "ordered", "contracted"}

            active_material_requests_list = [
                material_request
                for material_request in material_requests_list
                if material_request["status"] in ACTIVE_STATUSES
            ]

        print(
            f"TOOL[get_active_material_requests_of_user]: retrieved {len(active_material_requests_list)} material requests"
        )
        return {
            "status": "success",
            "active_material_requests_list": active_material_requests_list,
            "message": "Active material requests retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve active material requests. "
        print_message = "ERROR@ TOOL[get_active_material_requests_of_user]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)
            url = e.request.url
            print_message = (
                print_message
                + error_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json['message']}"
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
        print(
            f"ERROR@ TOOL[get_active_material_requests_of_user]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to retrieve active material requests. Reason error: {str(e)}",
        }


async def get_a_material_request_of_user_with_request_id(
    request_id: str, tool_context: ToolContext
) -> dict[str, Any]:
    """
    Retrieve a material request by its ID for the authenticated user.
    
    Parameters:
        request_id (str): ID of the material request to fetch.
    
    Returns:
        dict: On success, contains
            - 'status': 'success'
            - 'material_request': the material request object returned by the backend
            - 'message': success message
          On error, contains
            - 'status': 'error'
            - 'error_message': explanation of the failure
    """
    print(
        f"TOOL[get_a_material_request_of_user_with_request_id]: called with request_id: {request_id}"
    )
    try:
        token: str = tool_context.state.get("auth_token")
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/material-requests/{request_id}",
                headers=headers,
            )

            return {
                "status": "success",
                "material_request": response.raise_for_status().json(),
                "message": "Material request retrieved successfully",
            }
    except httpx.HTTPError as e:
        error_message = "Failed to retrieve material request. "
        print_message = "ERROR@ TOOL[get_a_material_request_of_user_with_request_id]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)
            url = e.request.url
            print_message = (
                print_message
                + error_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json['message']}"
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
        print(
            f"ERROR@ TOOL[get_a_material_request_of_user_with_request_id]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to retrieve material request. Reason error: {str(e)}",
        }


# Tool update an exsisting material request
async def update_material_request(
    request_id: str,
    tool_context: ToolContext,
    title: Optional[str] = None,
    description: Optional[str] = None,
    delivery_location: Optional[str] = None,
    material_items: Optional[list[dict[str, str]]] = None,
    delivery_date: Optional[str] = None,
    expert_request_id_to_link: Optional[str] = None,
) -> dict[str, Any]:
    """
    Update fields of an existing open material request.
    
    Only the arguments provided (non-None) will replace the corresponding fields on the server. If `material_items` is provided, it replaces the request's entire items list.
    
    Parameters:
        request_id (str): ID of the material request to update.
        material_items (Optional[list[dict[str, str]]]): New list of material items where each item dict must include 'item_name' and 'quantity_of_item_with_unit', and may include 'notes'. This list replaces existing items.
        expert_request_id_to_link (Optional[str]): ID of an expert/work request to link via `linkedWorkRequestId` (the linked request must be in an appropriate state).
    
    Returns:
        dict: On success, contains `"status": "success"`, `"updated_material_request"` with the server response, and `"message"`; on error, contains `"status": "error"` and `"error_message"` describing the failure.
    """
    print(f"TOOL[update_material_request]: called with request_id: {request_id}")
    try:
        token: str = tool_context.state.get("auth_token")

        updated_material_request: dict[str, str | list[dict[str, str]]] = {}

        if title:
            updated_material_request["title"] = title
        if description:
            updated_material_request["description"] = description
        if delivery_location:
            updated_material_request["deliveryLocation"] = delivery_location
        if delivery_date:
            updated_material_request["deliveryDate"] = delivery_date
        if expert_request_id_to_link:
            updated_material_request["linkedWorkRequestId"] = expert_request_id_to_link
        if material_items:
            items: list[dict[str, str]] = [
                {
                    "itemName": item["item_name"],
                    "quantity": item["quantity_of_item_with_unit"],
                    **({"notes": item["notes"]} if (item["notes"] is not None) else {}),
                }
                for item in material_items
            ]
            updated_material_request["items"] = items

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.put(
                f"{API_BASE_URL}/api/material-requests/{request_id}",
                json=updated_material_request,
                headers=headers,
            )
            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

            return {
                "status": "success",
                "updated_material_request": response.json(),
                "message": "Material request updated successfully.",
            }

    except httpx.HTTPError as e:
        error_message = "Failed to update material request. "
        print_message = "ERROR@ TOOL[update_material_request]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)
            url = e.request.url
            print_message = (
                print_message
                + error_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json['message']}"
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
        print(f"ERROR@ TOOL[update_material_request]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to update material request. Reason error: {str(e)}",
        }


# Tool to update attachments of an existing material request
async def update_material_request_attachments(
    request_id: str,
    tool_context: ToolContext,
    url_or_path_of_attachments_to_remove: Optional[list[str]],
    filenames_of_attachments_to_add: Optional[list[str]],
) -> dict[str, Any]:
    """
    Update attachments on an existing material request by removing specified attachments and/or adding new files.
    
    Parameters:
        request_id (str): ID of the material request to update.
        url_or_path_of_attachments_to_remove (Optional[list[str]]): List of attachment `filePath` values to remove from the request; pass None to skip removals.
        filenames_of_attachments_to_add (Optional[list[str]]): List of filenames (in tool_context) to add as attachments; pass None to skip additions.
    
    Returns:
        dict: Result object with a `status` key (`"success"`, `"error"`, or `"no changes"`). On `"success"` includes `updated_material_request` and `message`. On `"no changes"` includes `existing_material_request` and `message`. On `"error"` includes `error_message` and may include `updated_material_request` if a partial change succeeded.
    """
    print(
        f"TOOL[update_material_request_attachments]: called with request_id: {request_id}, url_of_attachments_to_remove: {url_or_path_of_attachments_to_remove}, filenames_of_attachments_to_add: {filenames_of_attachments_to_add}"
    )

    updated_material_request: MaterialRequest | None = None
    try:
        token: str = tool_context.state.get("auth_token")

        if (
            url_or_path_of_attachments_to_remove is None
            and filenames_of_attachments_to_add is None
        ):
            return {
                "status": "error",
                "error_message": "Can not update the attachments of material request. Both arg for adding and removing is not passed or None",
            }

        if (
            url_or_path_of_attachments_to_remove
            and filenames_of_attachments_to_add
            and len(url_or_path_of_attachments_to_remove) == 0
            and len(filenames_of_attachments_to_add) == 0
        ):
            return {
                "status": "error",
                "error_message": "Can not update the attachments of material request. Both arg for adding and removing is empty list",
            }

        if url_or_path_of_attachments_to_remove:
            # Fetch the Material request to get existing attachments
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{API_BASE_URL}/api/material-requests/{request_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                existing_material_request: MaterialRequest = (
                    response.raise_for_status().json()
                )
            existing_attachments = existing_material_request["attachments"]

            if existing_attachments:  # existing_attachments is not None and empty
                updated_attachments: list[Attachment] = [
                    attachment
                    for attachment in existing_attachments
                    if attachment["filePath"]
                    not in set(
                        url_or_path_of_attachments_to_remove
                    )  # Faster: 'in' on a set is O(1) - an instant lookup
                ]
                if updated_attachments != existing_attachments:  # if both are different
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        headers = {
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {token}",
                        }

                        response = await client.put(
                            f"{API_BASE_URL}/api/material-requests/{request_id}",
                            json={"attachments": updated_attachments},
                            headers=headers,
                        )
                        # Raise the HTTPStatusError if one occurred.
                        updated_material_request = response.raise_for_status().json()
                else:
                    # No changes to attachments, no need to update the request
                    if filenames_of_attachments_to_add is None:
                        return {
                            "status": "no changes",
                            "existing_material_request": existing_material_request,
                            "message": "No changes to attachments",
                        }

        # Adding new attachments
        if filenames_of_attachments_to_add and len(filenames_of_attachments_to_add) > 0:
            loading_file_artifacts = [
                tool_context.load_artifact(filename=filename)
                for filename in filenames_of_attachments_to_add
            ]
            # Promise all to get all the files concurrently
            file_artifacts = await asyncio.gather(*loading_file_artifacts)

            attachments: list[tuple[str, bytes, str]] = [
                (
                    file.inline_data.display_name,
                    file.inline_data.data,
                    file.inline_data.mime_type,
                )
                for file in file_artifacts
                if file
                and file.inline_data
                and file.inline_data.display_name
                and file.inline_data.data
                and file.inline_data.mime_type
            ]
            # Upload attachments
            _ = await upload_entity_attachments(
                "material-requests", request_id, attachments, token
            )
            # get the material request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{API_BASE_URL}/api/material-requests/{request_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                updated_material_request = response.raise_for_status().json()

        return {
            "status": "success",
            "updated_material_request": updated_material_request,
            "message": "Attachments of Material request updated successfully.",
        }

    # Error handling
    except httpx.HTTPError as e:
        url = e.request.url
        method = e.request.method  # GET

        error_message = "Failed to update attachments of material request. "
        print_message = "ERROR@ TOOL[update_material_request_attachments]: "

        if isinstance(e, httpx.TimeoutException):
            # Fetch Existing Material Request api fails
            if (
                method == "GET"
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
                and url_or_path_of_attachments_to_remove
            ):
                print_message = (
                    print_message
                    + f"Failed to get Existing Material Request HTTP timeout error - {e}"
                )
                error_message = (
                    error_message
                    + "Failed to get Existing Material Request to remove attachments. "
                    + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
                )
            # Update Material Request api fails
            elif (
                method == "PUT"
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + f"Failed to remove attachments from Material Request HTTP timeout error - {e}"
                )
                error_message = (
                    error_message
                    + f"Failed to remove attachments {url_or_path_of_attachments_to_remove} from Material Request. "
                    + f"Failed to add attachments {filenames_of_attachments_to_add} to Material Request. Tool broke because of "
                    + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
                )
            # Uploading attachments failed. but may be removal of existing attachments is successful if it passed as argument
            elif (
                url == f"{API_BASE_URL}/api/attachments/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + f"Failed to upload attachments HTTP timeout error - {e}"
                )
                error_message = (
                    error_message
                    + (
                        # If there is attachment to remove and it is successful
                        "Successfully removed attachments from Material Request. but "
                        if url_or_path_of_attachments_to_remove
                        and updated_material_request
                        else ""
                    )
                    + "Failed to upload new attachments to Material Request. "
                    + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
                )
            # Successfully uploaded attachments but failed to get updated request
            elif (
                filenames_of_attachments_to_add
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + f"Failed to get updated Material Request after uploading attachments. HTTP timeout error - {e}"
                )
                error_message = (
                    (
                        # If there is attachment to remove and it is successful
                        "Successfully removed attachments from Material Request."
                        if url_or_path_of_attachments_to_remove
                        and updated_material_request
                        else ""
                    )
                    + " Successfully uploaded new attachments to material request but failed to get the new updated material request."
                    + " You can call the `get_a_material_request_of_user_with_request_id` tool to get the updated material request."
                    + f" HTTP Gefifi backend api call Timeout error occurred: {e}"
                )
            else:
                print_message = print_message + f"HTTP timeout error - {e}"
                error_message = (
                    error_message
                    + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
                )

        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)

            # Fetch Existing Material Request api fails
            if (
                method == "GET"
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
                and url_or_path_of_attachments_to_remove
            ):
                print_message = (
                    print_message
                    + "Failed to get Existing Material Request. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    error_message
                    + "Failed to get Existing Material Request to remove attachments. "
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            # Update Material Request api fails . Removing attachments fails
            elif (
                method == "PUT"
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + "Failed to remove attachments from Material Request. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    error_message
                    + f"Failed to remove attachments {url_or_path_of_attachments_to_remove} from Material Request. "
                    + f"Failed to add attachments {filenames_of_attachments_to_add} to Material Request. Tool broke because of "
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            # Uploading attachments failed. but may be removal of existing attachments is successful if it passed as argument
            elif (
                url == f"{API_BASE_URL}/api/attachments/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + "Failed to upload attachments. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    error_message
                    + (
                        # If there is attachment to remove and it is successful
                        "Successfully removed attachments from Material Request. but "
                        if url_or_path_of_attachments_to_remove
                        and updated_material_request
                        else ""
                    )
                    + "Failed to upload new attachments to Material Request. "
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            # Successfully uploaded attachments but failed to get updated request
            elif (
                filenames_of_attachments_to_add
                and url == f"{API_BASE_URL}/api/material-requests/{request_id}"
            ):
                print_message = (
                    print_message
                    + "Failed to get updated Material Request after uploading attachments. "
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    (
                        # If there is attachment to remove and it is successful
                        "Successfully removed attachments from Material Request."
                        if url_or_path_of_attachments_to_remove
                        and updated_material_request
                        else ""
                    )
                    + " Successfully uploaded new attachments to material request but failed to get the new updated material request."
                    + " You can call the `get_a_material_request_of_user_with_request_id` tool to get the updated material request."
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
            else:
                print_message = (
                    print_message
                    + error_message
                    + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
                )
                error_message = (
                    error_message
                    + f"Gefifi Backend responded with message: {response_json['message']}"
                )
        else:
            print_message = print_message + f"HTTP error - {e}"
            error_message = error_message + f"HTTP error: {e}"

        print(print_message)

        result: dict[str, Any] = {
            "status": "error",
            "error_message": error_message,
        }
        if updated_material_request:
            result["updated_material_request"] = updated_material_request
        return result
    except Exception as e:
        print(
            f"ERROR@ TOOL[update_material_request_attachments]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to update attachments of material request. Reason error: {str(e)}",
        }


async def update_material_request_status_tool_guardrail(
    tool: BaseTool, args: dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Validate a requested material-request status transition for a customer before the update is performed.
    
    Checks that `args` contains `request_id` and `status`, fetches the existing material request, and verifies the requested status is an allowed next state from the current status. If the transition is permitted, returns `None`; otherwise returns a dict with `"status": "error"` and a human-readable `"message"` describing the problem.
    
    Parameters:
        args (dict[str, Any]): Expected to include:
            - "request_id" (str): ID of the material request to check.
            - "status" (str): Desired target status.
    
    Returns:
        None if the transition is allowed; otherwise a dict with keys:
            - "status" (str): `"error"`.
            - "message" (str): Explanation of why the transition is invalid or why the check failed.
    """
    print(
        f"GUARDRAIL[update_material_request_status_tool_guardrail]: running for tool: {tool.name} with args: {args}"
    )

    request_id: str | None = args.get("request_id")
    status: str | None = args.get("status")

    if not request_id:
        print(
            "ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Request ID is empty"
        )
        return {
            "status": "error",
            "message": "Request ID is empty. Please provide a valid request ID.",
        }

    if not status:
        print(
            "ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Status is empty"
        )
        return {
            "status": "error",
            "message": "Status is empty. Please provide a valid status.",
        }

    try:
        response: dict[str, Any] = await get_a_material_request_of_user_with_request_id(
            request_id, tool_context
        )

        # function status
        response_status: str | None = response.get("status")
        material_request: MaterialRequest | None = response.get("material_request")
        message: str | None = response.get("message")

        if material_request:
            current_status: str = material_request["status"]

            # Define valid status transitions that a customer can make.
            valid_transitions: dict[str, set[str]] = {
                "open": {"quoting", "cancelled"},
                "quoting": {"ordered", "cancelled"},
                "ordered": {"contracted"},
                "contracted": {"completed", "cancelled"},
            }

            # Check if the current status is one that the customer is allowed to change.
            # This implicitly handles terminal states (completed, cancelled) and states
            if current_status not in valid_transitions:
                print(
                    f"ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Invalid status transition from {current_status}"
                )
                return {
                    "status": "error",
                    "message": f"The request's status cannot be updated from its current state of '{current_status}'. It may be in a final state or require action from supplier.",
                }

            # Check if the requested new status is a valid transition from the current status.
            allowed_next_statuses: set[str] = valid_transitions[current_status]
            if status not in allowed_next_statuses:
                print(
                    f"ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Invalid status transition from '{current_status}' to '{status}'"
                )
                return {
                    "status": "error",
                    "message": f"Invalid status transition from '{current_status}' to '{status}'. Allowed next statuses are: {', '.join(allowed_next_statuses)}.",
                }

            return None
        else:
            print(
                f"ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Failed to fetch material request for checking current status. {message}"
            )
            return {
                "status": "error",
                "message": f"Failed to update the status of material request. Because failed to fetch material request for checking current status. {message}",
            }

    except Exception as e:
        print(
            f"ERROR@ GUARDRAIL[update_material_request_status_tool_guardrail]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "message": f"Failed to update the status of material request. {e}",
        }


# Tool to update the status of a material request of customer
async def update_material_request_status(
    request_id: str, status: str, tool_context: ToolContext
):
    """
    Change the status of a material request to the specified next status.
    
    Allowed transitions:
    - open -> quoting, cancelled
    - quoting -> ordered, cancelled
    - ordered -> contracted
    - contracted -> completed, cancelled
    
    Terminal statuses that cannot be changed: completed, cancelled.
    
    Parameters:
        request_id (str): ID of the material request to update.
        status (str): Desired next status; must be a valid next step from the request's current status.
    
    Returns:
        dict: A result object with a 'status' key ('success' or 'error').
            On success, includes 'updated_material_request' with the updated resource and a 'message'.
            On error, includes an 'error_message' describing the failure.
    """
    print(
        f"TOOL[update_material_request_status]: called with request_id: {request_id}, status: {status}"
    )
    try:
        token: str = tool_context.state.get("auth_token")
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.put(
                f"{API_BASE_URL}/api/material-requests/{request_id}/status",
                json={"status": status},
                headers=headers,
            )
            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

            return {
                "status": "success",
                "updated_material_request": response.json(),
                "message": "Material request status updated successfully.",
            }

    except httpx.HTTPError as e:
        error_message = "Failed to update status of material request. "
        print_message = "ERROR@ TOOL[update_material_request_status]: "

        if isinstance(e, httpx.TimeoutException):
            print_message = print_message + f"HTTP timeout error - {e}"
            error_message = (
                error_message
                + f"HTTP Gefifi backend api call Timeout error occurred: {e}"
            )
        elif isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code  # 404, 500, etc.
            response_json: HTTPStatusErrorResponse = (
                e.response.json()
            )  # Response body as JSON (if valid)
            url = e.request.url
            print_message = (
                print_message
                + error_message
                + f"status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            error_message = (
                error_message
                + f"Gefifi Backend responded with message: {response_json['message']}"
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
        print(
            f"ERROR@ TOOL[update_material_request_status]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to update status of material request. Reason error: {str(e)}",
        }