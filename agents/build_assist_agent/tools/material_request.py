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
    Create a material request post for a customer

    Use this tool when customer wants to create a new material request post or when customer uploads files that probably related to materials you can suggest the customer to create a new material request post.

    Args:
        title (str): The title of the material request.
        description (str): The description of the material request.
        delivery_location (str): The delivery location of the material request.
        material_items (list[dict[str, str]]): The list of material items in the request. Each Material Item should be a dictionary with keys 'item_name', 'quantity_of_item_with_unit', and optionally 'notes'. Example: [{"item_name": "Wood", "quantity_of_item_with_unit": "10Nos of 2x4 feet"},{"item_name": "Portland Cement", "quantity_of_item_with_unit": "50 bags", "notes": "Grade 43"}, {"item_name": "Nails", "quantity_of_item_with_unit": "50 Nos of 1 inch", "notes": "Please provide high-quality nails"}]
        delivery_date (Optional[str]): The delivery date of the material request. Defaults to None.
        attachment_list (Optional[list[str]]): The list of filenames of attachments for the material request. Supported file types are pdf, doc, docx, xls, xlsx, dwg, dxf, png, jpeg, jpg, webp, and gif. Defaults to None.
        expert_request_id_to_link (Optional[str]): The ID of the expert request to link with this material request. The expert/work request must be in `open` or `contracted` status. Defaults to None.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'created_material_request' key with the material request data and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key. may include 'created_material_request' if api call for creating material request is successful but uploading attachments is failed or after successfully uploaded attachments but failed to get the updated material request the uploaded attachments.
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
    Uploads attachments to the specified entity.

    Args:
        entity_type (Literal["material-requests", "work-requests", "contracts"]): The type of entity to upload attachments to.
        entity_id (str): The ID of the entity to upload attachments to.
        attachments (list[tuple[str, bytes, str]]): A list of tuples containing the attachment name, content, and content type (The MIME type of the file).
        token (str): The authentication token.

    Returns:
        None
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
    Get a customer's all material request posts and its details.

    Use this tool when customer wants to view their all existing material request posts.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'material_requests_list' key this will contain a list of material request posts and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
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
    Get a customer's active material request posts and its details.
    active material request have these status: 'open', 'quoting', 'ordered', 'contracted'

    Use this tool when customer wants to view their active material request posts.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'active_material_requests_list' key this will contain a list of active material request posts and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
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
    Get a material request posts of customer.

    Use this tool when you have a material request ID and you want to retrieve or display the details of a specific request.

    Args:
        request_id (str): ID of the material request to retrieve.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'material_request' key this will contain a material request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
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
    Update an exsisting open status material request post of a customer.

    Use this tool only for updating an existing material request that is open.

    Remember passed argument will replace the already existing values

    Args:
        request_id (str): The ID of the material request to update.
        Pass the following optional args to update the request. Default is None (This will not be update field):
            title (Optional[str]): Pass updated title of the request to update
            description (Optional[str]): Pass updated description of the request to update
            delivery_location (Optional[str]): Pass updated delivery location of the request to update
            material_items (Optional[List[dict[str, str]]]): Pass updated material items of the request to update. Note this will replace all the existing material items with the new ones. Each Material Item should be a dictionary with keys 'item_name', 'quantity_of_item_with_unit', and optionally 'notes'.
            delivery_date (Optional[str]): Pass updated delivery_date of the request to update
            expert_request_id_to_link (Optional[str]): To update linked expert/work request post. Pass the ID of the expert/work request to link. The expert/work request must be in `open` or `contracted` status.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_material_request' key this will contain the updated material request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
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
    Update the attachments of an existing open status material request post of a customer.
    Use this tool only when updating attachments of an existing material request that is open

    Args:
        url_or_path_of_attachments_to_remove (Optional[list[str]]): Pass list of strings contains url or path (`filePath` field of attachment object) of attachments file to remove from the request. Pass None for not removing existing file attachments.
        filenames_of_attachments_to_add (Optional[list[str]]): Pass list of strings contains filenames of attachments to add to request. Pass None for not adding

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_material_request' key this will contain the updated material request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key. may include `updated_material_request` if attachments removed successfully but failed to add new attachments.
            If 'status' is 'no changes', includes a 'message' key with the message that no changes were made and `existing_material_request` key contains the existing material request.
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
    """Guardrail for updating material request status of a customer"""
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
    """Update the status of a material request of customer.

    Use this function tool to update the status of a material request of customer. You are updating the status on behalf of the customer, so customers are allowed to update certain status (which are mentioned under the Args docstring) of a request.
    Use this tool when current status of a request is one of the following: `open`, `quoting`, `ordered`, and `contracted`

    If a request has the status of `completed` or `cancelled`, it cannot be updated further through this tool. Those are considered final or "terminal" statuses.

    Material Request status:
        - open: This is the initial status. The customer has created the request and is now waiting for suppliers to show interest or for the customer to invite them.
        - quoting: The customer is actively seeking price quotes from one or more interested or invited suppliers. This stage involves communication and negotiation between the customer and potential suppliers.
        - ordered: The customer has officially selected a supplier and placed an order based on the agreed-upon quote. This is a commitment from the customer's side.
        - contracted:  A formal agreement has been established. The supplier has accepted the order, and the customer has confirmed the contract. This is the stage where the actual fulfillment of the order begins.
        - completed: This is a final status indicating that the transaction is finished.
            *   From the **Supplier's** perspective, it means the materials have been delivered.
            *   From the **Customer's** perspective, it means the materials have been received.
        - cancelled: The request has been terminated by either the customer or the supplier. This can happen at any stage before completion.

    Args:
        request_id (str): The ID of the material request to update.
        status (str): The new status for the material request. The value must be a valid next step from the current status.
            - If current is `open`, next can be `quoting` or `cancelled`.
            - If current is `quoting`, next can be `ordered` or `cancelled`.
            - If current is `ordered`, next can be `contracted`.
            - If current is `contracted`, next can be `completed` or `cancelled`.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_material_request' key this will contain the updated material request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
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
