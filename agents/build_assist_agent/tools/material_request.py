import asyncio
from typing import Any, Literal, Optional, TypedDict

from google.adk.tools.tool_context import ToolContext
import httpx

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
    material_items: list[MaterialItem],
    tool_context: ToolContext,
    delivery_date: Optional[str] = None,
    attachment_list: Optional[list[str]] = None,
    expert_request_id_to_link: Optional[str] = None,
) -> dict[str, Any]:
    """
    Create a material request post for a customer

    Args:
        title (str): The title of the material request.
        description (str): The description of the material request.
        delivery_location (str): The delivery location of the material request.
        material_items (list[MaterialItem]): The list of material items in the request. Example: [{"item_name": "Wood", "quantity_of_item_with_unit": "10Nos of 2x4 feet"},{"item_name": "Portland Cement", "quantity_of_item_with_unit": "50 bags", "notes": "Grade 43"}, {"item_name": "Nails", "quantity_of_item_with_unit": "50 Nos of 1 inch", "notes": "Please provide high-quality nails"}]
        delivery_date (Optional[str]): The delivery date of the material request. Defaults to None.
        attachment_list (Optional[list[str]]): The list of filenames of attachments for the material request. Supported file types are pdf, doc, docx, xls, xlsx, dwg, dxf, png, jpeg, jpg, webp, and gif. Defaults to None.
        expert_request_id_to_link (Optional[str]): The ID of the expert request to link with this material request. Defaults to None.

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
        print(
            f"ERROR@ TOOL[update_images_of_expert_request]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to update images of expert request. Reason error: {str(e)}",
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
        entity_type (Literal["material_request", "expert_request", "contracts"]): The type of entity to upload attachments to.
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
