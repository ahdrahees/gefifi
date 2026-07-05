"""
Tools for handling expert requests.
"""

import asyncio
import os
from typing import Any, Dict, Literal, Optional, TypedDict

import httpx
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai.types import Part

from build_assist_agent.tool_types import HTTPStatusErrorResponse, UploadResponse

from ..auth_types import AuthData

# from google.adk.agents import Artifact


# import google.genai.types as types

API_BASE_URL = os.getenv("API_BASE_URL")

if API_BASE_URL is None:
    print("FATAL ERROR: API_BASE_URL is not defined in .env")
    raise ValueError("FATAL ERROR: API_BASE_URL is not defined. Halting application.")

WorkRequestCategory = Literal[
    "General Construction",
    "Renovation",
    "Repair",
    "Plumbing",
    "Electrical",
    "Painting",
    "Masonry",
    "Carpentry",
    "Interior Design",
    "Landscaping",
    "Other",
]


def attach_string(first: str, second: str) -> str:
    """Concatenates two strings with a space between them."""
    if not first:
        return second
    if not second:
        return first
    return first + ", " + second


def truncate_string(input_string: str, max_length: int) -> str:
    """Truncates a string to a maximum length."""
    if len(input_string) <= max_length:
        return input_string
    return input_string[:max_length] + "..."


def create_expert_request_tool_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """Guardrail for the create_expert_request tool. Validate the arguments and return an error message if the arguments are not valid."""
    print(
        f"GUARDRAIL[create_expert_request_tool_guardrail]: running for tool: {tool.name} with args: {args}"
    )

    title = args.get("title", "")
    description = args.get("description", "")
    location_or_address = args.get("location_or_address", "")
    opt_expected_cost = args.get("opt_expected_cost", None)
    # opt_timeline = args.get("opt_timeline", "")
    # opt_materials_suggested = args.get("opt_materials_suggested", "")
    image_filenames: Optional[list[str]] = args.get("image_filenames")
    opt_expiration_date = args.get("opt_expiration_date", None)

    error_message: str = ""

    if not title:
        error_message = "Title is required"
    if not description:
        error_message = attach_string(error_message, "Description is required")
    if not location_or_address:
        error_message = attach_string(error_message, "Location or address is required")
    if not category:
        error_message = attach_string(error_message, "Category is required")

    if opt_expected_cost and opt_expected_cost < 0:
        error_message = attach_string(
            error_message, "Expected cost must be non-negative"
        )

    if opt_expiration_date:
        try:
            from datetime import datetime
            parsed_date = datetime.strptime(opt_expiration_date, "%Y-%m-%d")
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            if parsed_date < today:
                error_message = attach_string(
                    error_message, "Expiration date cannot be in the past"
                )
        except ValueError:
            error_message = attach_string(
                error_message, "Expiration date must be a valid date in YYYY-MM-DD format"
            )

    if image_filenames:
        for filename in image_filenames:
            if not filename:
                error_message = attach_string(
                    error_message, "Proper filename are required (not empty)"
                )
            elif not filename.endswith(
                (".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".avif")
            ):
                error_message = attach_string(
                    error_message,
                    f"File '{filename}' has invalid format. Only image files (.jpg, .jpeg, .png, .gif, .svg, .webp, .avif) are accepted",
                )

    if error_message:
        print(
            f"GUARDRAIL[create_expert_request_tool_guardrail]: error: {error_message}"
        )
        return {"status": "error", "error_message": error_message}

    print(
        "GUARDRAIL[create_expert_request_tool_guardrail]: arguments are valid, proceeding with tool execution"
    )
    return None  # Proceed with tool execution


# Tool
async def create_expert_request(
    title: str,
    description: str,
    location_or_address: str,
    category: str,
    tool_context: ToolContext,
    opt_expected_cost: Optional[float] = None,
    opt_timeline: Optional[str] = None,
    opt_materials_suggested: Optional[str] = None,
    image_filenames: Optional[list[str]] = None,
    opt_expiration_date: Optional[str] = None,
) -> dict[str, Any]:
    """
    Create an expert/work request post for a customer.

    Use this tool in two specific scenarios:
    1. When the user explicitly asks to create an expert/work request.
    2. When the user uploads images that appear to be related to construction or home improvement projects. In this case, ask the user to confirm if they want to create an expert/work request. If they confirm, gather the required information (title, description, location) and any optional details (expected cost, timeline, suggested materials) before creating the request.

    Remember that title, description, location, and category are mandatory fields that cannot be empty strings.

    Args:
        title (str): Title of the Expert/Work request (This can not be empty string)
        description (str): Description of the request (This can not be empty string)
        location_or_address (str): Location or address where the work needs to be done (This can not be empty string)
        category (str): Category of the request, you can select an appropriate category "General Construction","Renovation","Repair","Plumbing","Electrical","Painting","Masonry","Carpentry","Interior Design","Landscaping","Other", or you can provide a suitable category as string. (This can not be empty string)
        opt_expected_cost (float, optional): Optional expected cost for the work. Defaults to None.
        opt_timeline (str, optional): Optional timeline for the work. Defaults to None.
        opt_materials_suggested (str, optional): Optional materials suggested for the work. Defaults to None.
        image_filenames (list[str], optional): Optional images filenames related to the request Maximum 3 (Highly recommended to provide images that are relevant to the request). Only provide image files if available. Defaults to None. Supported files ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".avif"
        opt_expiration_date (str, optional): Optional request expiration date or deadline (YYYY-MM-DD format). Defaults to None.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'created_expert_request' key with the expert request data and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print(
        f"TOOL[create_expert_request]: called with args, title: {truncate_string(title, 20)}, description: {truncate_string(description, 50)}, category: {category}, location_or_address: {truncate_string(location_or_address, 20)}"
    )

    try:
        token: str = tool_context.state.get("auth_token")

        images_urls: list[str] = []

        # image upload part if image files are available
        if image_filenames and len(image_filenames) > 0:
            loading_image_file_artifacts = [
                tool_context.load_artifact(filename=filename)
                for filename in image_filenames
            ]
            # Promise all
            image_file_artifacts: list[Part | None] = await asyncio.gather(
                *loading_image_file_artifacts
            )

            image_file_upload_args: list[tuple[str, bytes, str]] = [
                (
                    image_file.inline_data.display_name,  # filename
                    image_file.inline_data.data,  # bytes_data
                    image_file.inline_data.mime_type,  # mime_type
                )
                for image_file in image_file_artifacts
                if image_file
                and image_file.inline_data  # Make sure not None
                and image_file.inline_data.display_name  # Make sure not None
                and image_file.inline_data.data  # Make sure not None
                and image_file.inline_data.mime_type  # Make sure not None
            ]

            upload_file_responses: list[UploadResponse] = await asyncio.gather(
                *[
                    upload_file(
                        *upload_args,
                        token,
                    )
                    for upload_args in image_file_upload_args
                ]
            )

            images_urls = [response["filePath"] for response in upload_file_responses]

        final_expert_request: dict[str, Any] = {
            "title": title,
            "description": description,
            "location": location_or_address,
            "category": category,
            "images": images_urls,
        }

        if opt_expected_cost is not None:
            final_expert_request["expectedCost"] = opt_expected_cost
        if opt_timeline is not None:
            final_expert_request["timeline"] = opt_timeline
        if opt_materials_suggested is not None:
            final_expert_request["materialsSuggested"] = opt_materials_suggested
        if opt_expiration_date is not None:
            final_expert_request["expirationDate"] = opt_expiration_date

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.post(
                f"{API_BASE_URL}/api/work-requests",
                json=final_expert_request,
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

        result = {
            "status": "success",
            "created_expert_request": response.json(),
            "message": "Expert request created successfully. Please wait for an expert to respond.",
        }

        print(
            f"TOOL[create_expert_request]: Work request created successfully {result.get('created_expert_request')}"
        )

        return result

    except httpx.HTTPStatusError as e:
        # message = str(e)  # The error message
        # request = e.request  # The request object
        # response = e.response  # The response object

        # Useful response attributes
        status_code = e.response.status_code  # 404, 500, etc.
        # response_text = e.response.text  # Response body as string
        response_json: HTTPStatusErrorResponse = (
            e.response.json()
        )  # Response body as JSON (if valid)
        url = e.request.url  # The URL that was called
        # method = e.request.method  # GET, POST, etc.

        if url == f"{API_BASE_URL}/api/upload":
            print(
                f"ERROR@ TOOL[create_expert_request]: Failed to upload image to backend - status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            return {
                "status": "error",
                "error_message": f"Failed to upload image to backend. Backend responded with message: {response_json['message']}",
            }
        elif url == f"{API_BASE_URL}/api/work-requests":
            print(
                f"ERROR@ TOOL[create_expert_request]: Failed to create work request - status_code: {status_code}, url: {url}, response_json: {response_json}"
            )
            return {
                "status": "error",
                "error_message": f"Failed to create work request. Backend responded with message: {response_json['message']}",
            }

        print(
            f"ERROR@ TOOL[create_expert_request]: HTTP status error - status_code: {status_code}, url: {url}, response_json: {response_json}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to create work request. HTTP Gefifi backend api call error occurred: {e}. Backend responded with message: {response_json['message']}",
        }

    except httpx.TimeoutException as e:
        print(f"ERROR@ TOOL[create_expert_request]: HTTP timeout error - {e}")
        return {
            "status": "error",
            "error_message": f"Failed to create work request. HTTP Gefifi backend api call Timeout error occurred: {e}",
        }

    except httpx.HTTPError as e:
        print(f"ERROR@ TOOL[create_expert_request]: HTTP error - {e}")
        return {
            "status": "error",
            "error_message": f"Failed to create work request. HTTP Gefifi backend api call error occurred: {e}",
        }

    except Exception as e:
        print(f"ERROR@ TOOL[create_expert_request]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to create expert request. Reason error: {str(e)}",
        }


async def upload_file(
    filename: str, bytes_data: bytes, mime_type: str, token: str
) -> UploadResponse:
    """
    Uploads a file to the backend.

    Args:
        filename: The name of the file
        bytes_data: The bytes data of the file
        mime_type: The MIME type of the file
        token: The authentication token

    Returns:
        A dictionary with the status and data of the upload
    """
    print(
        f"API[upload_file]: uploading file '{filename}' ({len(bytes_data)} bytes, {mime_type})"
    )

    # Non-blocking
    async with httpx.AsyncClient(timeout=30.0) as client:
        files = [("file", (filename, bytes_data, mime_type))]
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post(
            f"{API_BASE_URL}/api/upload", files=files, headers=headers
        )
        # Raise the HTTPStatusError if one occurred.
        _ = response.raise_for_status()

    result: UploadResponse = response.json()
    print(f"API[upload_file]: file uploaded successfully - {result.get('filePath')}")
    return result


# Tool
async def get_user_expert_requests(tool_context: ToolContext) -> dict[str, Any]:
    """
    Get a customer's all expert/work request posts and its details.

    Use this tool when customer wants to view their all existing expert/work request posts.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'expert_requests_list' key this will contain a list of expert/work request posts and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print("TOOL[get_user_expert_requests]: fetching user's expert requests")
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data")
        user_id = auth_data["user_id"]

        print(f"TOOL[get_user_expert_requests]: requesting for user_id: {user_id}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/work-requests?customerId={user_id}",
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            # response = response.raise_for_status()
            result = response.raise_for_status().json()

        print(
            f"TOOL[get_user_expert_requests]: retrieved {len(result)} expert requests"
        )
        return {
            "status": "success",
            "expert_requests_list": result,
            "message": "Expert requests retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve expert requests. "
        print_message = "ERROR@ TOOL[get_user_expert_requests]: "

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
        print(f"ERROR@ TOOL[get_user_expert_requests]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve expert requests. Reason error: {str(e)}",
        }


class ExpertRequest(TypedDict):
    """Expert request"""

    id: str
    customerId: str
    title: str
    description: str
    images: list[str]
    location: int
    expectedCost: float | None
    timeline: str | None
    materialsSuggested: str | None
    status: Literal[
        "open",
        "in_discussion",
        "awaiting_quotes",
        "contracted",
        "in_progress",
        "completed",
        "cancelled",
        "closed",
    ]  #  "open" | "in_discussion" | "awaiting_quotes" | "contracted" | "in_progress" | "completed" | "cancelled" | "closed"
    createdAt: str
    updatedAt: str
    category: str
    interestedExperts: list[str]
    invitedExperts: list[str]
    quotes: list[str] | None


# Tool
async def get_active_user_expert_requests(tool_context: ToolContext) -> dict[str, Any]:
    """
    Get a customer's active expert/work request posts and its details.
    active expert requests have these status: "open", "in_discussion", "awaiting_quotes", "contracted", "in_progress"
    Use this tool when customer wants to view their active expert/work request posts.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'active_expert_requests_list' key this will contain a list of active expert/work request posts and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print("TOOL[get_active_user_expert_requests]: fetching user's expert requests")
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data")
        user_id = auth_data["user_id"]

        print(
            f"TOOL[get_active_user_expert_requests]: requesting for user_id: {user_id}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/work-requests?customerId={user_id}",
                headers=headers,
            )

            # Raise the HTTPStatusError if one occurred.
            # response = response.raise_for_status()
            expert_requests_list: list[ExpertRequest] = (
                response.raise_for_status().json()
            )

            ACTIVE_STATUSES = {
                "open",
                "in_discussion",
                "awaiting_quotes",
                "contracted",
                "in_progress",
            }

            result = [
                expert_request
                for expert_request in expert_requests_list
                if expert_request["status"] in ACTIVE_STATUSES
            ]
        print(
            f"TOOL[get_active_user_expert_requests]: retrieved {len(result)} active expert requests"
        )
        return {
            "status": "success",
            "active_expert_requests_list": result,
            "message": "Active expert requests retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve active expert requests. "
        print_message = "ERROR@ TOOL[get_active_user_expert_requests]: "

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
            f"ERROR@ TOOL[get_active_user_expert_requests]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to active retrieve expert requests. Reason error: {str(e)}",
        }


async def get_a_expert_request_of_user_with_request_id(
    request_id: str, tool_context: ToolContext
) -> dict[str, Any]:
    """
    Get a expert/work request posts of customer.

    Use this tool when you have a expert or work request ID and you want to retrieve or display the details of a specific request.

    Args:
        request_id (str): ID of the expert/work request to retrieve.

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'expert_request' key this will contain a expert/work request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print(
        f"TOOL[get_a_expert_request_of_user_with_request_id]: called with request_id: {request_id}"
    )
    try:
        token: str = tool_context.state.get("auth_token")
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/work-requests/{request_id}",
                headers=headers,
            )

            return {
                "status": "success",
                "expert_request": response.raise_for_status().json(),
                "message": "Expert request retrieved successfully",
            }
    except httpx.HTTPError as e:
        error_message = "Failed to retrieve expert request. "
        print_message = "ERROR@ TOOL[get_a_expert_request_of_user_with_request_id]: "

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
            f"ERROR@ TOOL[get_a_expert_request_of_user_with_request_id]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to retrieve expert request. Reason error: {str(e)}",
        }


def update_expert_request_tool_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """Guardrail for update_expert_request_tool. Validate the arguments and return an error message if the arguments are not valid."""
    print(
        f"GUARDRAIL[update_expert_request_tool_guardrail]: running for tool: {tool.name} with args: {args}"
    )
    title: str | None = args.get("title")
    description: str | None = args.get("description")
    location: str | None = args.get("location")
    category: str | None = args.get("category")
    expected_cost: float | None = args.get("expected_cost")
    timeline: str | None = args.get("timeline")
    materials_suggested: str | None = args.get("materials_suggested")

    # Remove leading and trailing whitespaces from the strings
    title = title.strip() if title else None
    description = description.strip() if description else None
    location = location.strip() if location else None
    category = category.strip() if category else None
    materials_suggested = materials_suggested.strip() if materials_suggested else None
    timeline = timeline.strip() if timeline else None

    if (
        title is None
        and description is None
        and location is None
        and category is None
        and expected_cost is None
        and timeline is None
        and materials_suggested is None
    ):
        return {
            "status": "error",
            "error_message": "All arguments are None. Expert request is not updated. Please provide at least one argument to update.",
        }

    error_message: str = ""
    if title is not None and not title:
        error_message = attach_string(error_message, "Title can not be empty")
    if description is not None and not description:
        error_message = attach_string(error_message, "Description can not be empty")
    if location is not None and not location:
        error_message = attach_string(error_message, "Location can not be empty")
    if category is not None and not category:
        error_message = attach_string(error_message, "Category can not be empty.")
    if expected_cost is not None and expected_cost <= 0:
        error_message = attach_string(
            error_message,
            "Expected cost can not be empty or less than or equal to zero.",
        )
    if timeline is not None and not timeline:
        error_message = attach_string(error_message, "Timeline can not be empty")
    if materials_suggested is not None and not materials_suggested:
        error_message = attach_string(
            error_message, "Materials suggested can not be empty"
        )

    if error_message:
        print(
            f"ERROR@ GUARDRAIL[update_expert_request_tool_guardrail]: error: {error_message}"
        )
        return {
            "status": "error",
            "error_message": error_message,
        }
    else:
        # update the args with remove white spaces
        args["title"] = title
        args["description"] = description
        args["location"] = location
        args["category"] = category
        args["timeline"] = timeline
        args["materials_suggested"] = materials_suggested
        print(
            "GUARDRAIL[update_expert_request_tool_guardrail]: arguments are valid, proceeding with tool execution"
        )
        return None


# Tool update an exsisting expert request
async def update_expert_request(
    request_id: str,
    tool_context: ToolContext,
    title: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    expected_cost: Optional[float] = None,
    timeline: Optional[str] = None,
    materials_suggested: Optional[str] = None,
) -> dict[str, Any]:
    """
    Update an exsisting open status expert request post of a customer.

    Use this tool only for updating an existing expert request that is open.

    Remember passed argument will replace the already existing values

    Args:
        request_id (str): The ID of the expert request to update.
        Pass the following optional args to update the request. Default is None (This will not be update field):
            title (Optional[str]): Pass title of the request to update
            description (Optional[str]): Pass description of the request to update
            location (Optional[str]): Pass location of the request to update
            category (Optional[str]): Pass category of the request to update
            expected_cost (Optional[float]): Pass value > 0 to update the
            timeline (Optional[str]): Pass timeline of the request to update expected cost
            materials_suggested (Optional[str]): Pass materials suggested of the request to update

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_expert_request' key this will contain the updated expert/work request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print(f"TOOL[update_expert_request]: called with request_id: {request_id}")
    try:
        token: str = tool_context.state.get("auth_token")

        updated_expert_request: dict[str, str | list[str] | float] = {}

        if title:
            updated_expert_request["title"] = title
        if description:
            updated_expert_request["description"] = description
        if location:
            updated_expert_request["location"] = location
        if category:
            updated_expert_request["category"] = category
        if expected_cost:
            updated_expert_request["expectedCost"] = expected_cost
        if timeline:
            updated_expert_request["timeline"] = timeline
        if materials_suggested:
            updated_expert_request["materialsSuggested"] = materials_suggested

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.put(
                f"{API_BASE_URL}/api/work-requests/{request_id}",
                json=updated_expert_request,
                headers=headers,
            )
            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

            return {
                "status": "success",
                "updated_expert_request": response.json(),
                "message": "Expert request updated successfully.",
            }

    except httpx.HTTPError as e:
        error_message = "Failed to update expert request. "
        print_message = "ERROR@ TOOL[update_expert_request]: "

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
        print(f"ERROR@ TOOL[update_expert_request]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to update expert request. Reason error: {str(e)}",
        }


# Tool to update image of an existing expert request
async def update_expert_request_image(
    request_id: str,
    tool_context: ToolContext,
    url_of_images_to_remove: Optional[list[str]],
    filenames_of_images_to_add: Optional[list[str]],
) -> dict[str, Any]:
    """
    Update the images of an existing open status expert request post of a customer.
    Use this tool only when updating images of an existing expert request that is open

    Args:
        url_of_images_to_remove (Optional[list[str]]): Pass list of strings contains url of images to remove from the request. Pass None for not removing existing images.
        filenames_of_images_to_add (Optional[list[str]]): Pass list of strings contains filenames of images to add to request. Pass None for not adding

    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_expert_request' key this will contain the updated expert/work request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print(
        f"TOOL[update_expert_request_image]: called with request_id: {request_id}, url_of_images_to_remove: {url_of_images_to_remove}, filenames_of_images_to_add: {filenames_of_images_to_add}"
    )
    try:
        token: str = tool_context.state.get("auth_token")

        if url_of_images_to_remove is None and filenames_of_images_to_add is None:
            return {
                "status": "error",
                "error_message": "Can not update the images of expert request. Both arg for adding and removing is not passed or None",
            }

        if (
            url_of_images_to_remove
            and filenames_of_images_to_add
            and len(url_of_images_to_remove) == 0
            and len(filenames_of_images_to_add) == 0
        ):
            return {
                "status": "error",
                "error_message": "Can not update the images of expert request. Both arg for adding and removing is empty list",
            }

        # Fetch the expert request to get existing image_url
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }

            response = await client.get(
                f"{API_BASE_URL}/api/work-requests/{request_id}",
                headers=headers,
            )
            expert_request: ExpertRequest = response.raise_for_status().json()

        existing_images_urls: list[str] = expert_request["images"]
        updated_images_urls: list[str] = []

        # Removing images
        if url_of_images_to_remove:
            updated_images_urls = [
                image_url
                for image_url in existing_images_urls
                if image_url not in url_of_images_to_remove
            ]

        # Adding new images
        if filenames_of_images_to_add:
            # createing list of images to load (Like list of promises in js)
            loading_image_file_artifacts = [
                tool_context.load_artifact(filename=filename)
                for filename in filenames_of_images_to_add
            ]
            # Loaded images from artifacts (like await Promise.all all in js for concurrent loading)
            image_file_artifacts: list[Part | None] = await asyncio.gather(
                *loading_image_file_artifacts
            )

            # Creating list of args for upload_file function
            image_file_upload_args: list[tuple[str, bytes, str]] = [
                (
                    image_file.inline_data.display_name,  # filename
                    image_file.inline_data.data,  # bytes_data
                    image_file.inline_data.mime_type,  # mime_type
                )
                for image_file in image_file_artifacts
                if image_file
                and image_file.inline_data  # Make sure not None
                and image_file.inline_data.display_name  # Make sure not None
                and image_file.inline_data.data  # Make sure not None
                and image_file.inline_data.mime_type  # Make sure not None
            ]

            # Uploading images concurrently (like await Promise.all all in js )
            upload_file_responses: list[UploadResponse] = await asyncio.gather(
                *[
                    upload_file(
                        *upload_args,
                        token,
                    )
                    for upload_args in image_file_upload_args
                ]
            )

            uploaded_images_urls = [
                response["filePath"] for response in upload_file_responses
            ]

            # update
            updated_images_urls.extend(uploaded_images_urls)

        # This condition is impossible to happen
        if existing_images_urls == updated_images_urls:
            return {
                "status": "error",
                "error_message": "Existing images are the same as updated images",
            }
        else:
            # API call to update the expert request
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                }

                response = await client.put(
                    f"{API_BASE_URL}/api/work-requests/{request_id}",
                    json={"images": updated_images_urls},
                    headers=headers,
                )
                # Raise the HTTPStatusError if one occurred.
                response = response.raise_for_status()

                return {
                    "status": "success",
                    "updated_expert_request": response.json(),
                    "message": "Images of Expert request updated successfully.",
                }
    except httpx.HTTPError as e:
        error_message = "Failed to update images of expert request. "
        print_message = "ERROR@ TOOL[update_images_of_expert_request]: "

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
                + (
                    "Failed to upload image to backend. "
                    if url == f"{API_BASE_URL}/api/upload"
                    else ""
                )
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
            f"ERROR@ TOOL[update_images_of_expert_request]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "error_message": f"Failed to update images of expert request. Reason error: {str(e)}",
        }


async def update_expert_request_status_tool_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """Guardrail for updating expert request status of a customer"""
    print(
        f"GUARDRAIL[update_expert_request_status_tool_guardrail]: running for tool: {tool.name} with args: {args}"
    )

    request_id: str | None = args.get("request_id")
    status: str | None = args.get("status")

    if not request_id:
        print(
            "ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Request ID is empty"
        )
        return {
            "status": "error",
            "message": "Request ID is empty. Please provide a valid request ID.",
        }

    if not status:
        print(
            "ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Status is empty"
        )
        return {
            "status": "error",
            "message": "Status is empty. Please provide a valid status.",
        }

    try:
        response: dict[str, Any] = await get_a_expert_request_of_user_with_request_id(
            request_id, tool_context
        )

        # function status
        response_status: str | None = response.get("status")
        expert_request: ExpertRequest | None = response.get("expert_request")
        message: str | None = response.get("message")

        if expert_request:
            current_status: str = expert_request["status"]

            # Define valid status transitions that a customer can make.
            valid_transitions: dict[str, set[str]] = {
                "open": {"in_discussion", "cancelled"},
                "in_discussion": {"awaiting_quotes", "cancelled"},
                "awaiting_quotes": {"contracted", "cancelled"},
                "in_progress": {"completed", "disputed"},
            }

            # Check if the current status is one that the customer is allowed to change.
            # This implicitly handles terminal states (completed, cancelled, closed) and states
            # requiring expert action (contracted).
            if current_status not in valid_transitions:
                print(
                    f"ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Invalid status transition from {current_status}"
                )
                return {
                    "status": "error",
                    "message": f"The request's status cannot be updated from its current state of '{current_status}'. It may be in a final state or require action from an expert.",
                }

            # Check if the requested new status is a valid transition from the current status.
            allowed_next_statuses: set[str] = valid_transitions[current_status]
            if status not in allowed_next_statuses:
                print(
                    f"ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Invalid status transition from '{current_status}' to '{status}'"
                )
                return {
                    "status": "error",
                    "message": f"Invalid status transition from '{current_status}' to '{status}'. Allowed next statuses are: {', '.join(allowed_next_statuses)}.",
                }

            return None
        else:
            print(
                f"ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Failed to fetch expert request for checking current status. {message}"
            )
            return {
                "status": "error",
                "message": f"Failed to update the status of expert request. Because failed to fetch expert request for checking current status. {message}",
            }

    except Exception as e:
        print(
            f"ERROR@ GUARDRAIL[update_expert_request_status_tool_guardrail]: Unexpected error - {str(e)}"
        )
        return {
            "status": "error",
            "message": f"Failed to update the status of expert request. {e}",
        }


# Tool to update the status of an expert request of customer
async def update_expert_request_status(
    request_id: str, status: str, tool_context: ToolContext
):
    """Update the status of an expert request of customer.

    Use this function tool to update the status of an expert request of customer. You are updating the status on behalf of the customer, so customers are allowed to update certain status (which are mentioned under the Args docstring) of a request.
    Use this tool when current status of a request is one of the following:
        - open
        - in_discussion
        - awaiting_quotes
        - in_progress
    If a request has the status of `completed`, `closed`, or `cancelled`, it cannot be updated further through this tool. Those are considered final or "terminal" statuses.
    If the current status is `contracted`, only experts can update the status to `in_progress` (when they start the work).

    Expert Request status:
        - open: The initial status when a customer creates a new request. It is visible to experts and ready for discussion.
        - in_discussion: The customer and one or more experts are actively discussing the project details before any quotes are sent.
        - awaiting_quotes: The customer has formally requested quotes. Interested experts can now submit their cost proposals.
        - contracted: The customer has accepted a quote, and a contract has been established with an expert to perform the work.
        - in_progress: The expert has officially started working on the project.
        - completed: The work has been finished by the expert and approved by the customer. The request was successful.
        - cancelled: The request was actively stopped by the customer. The project will not move forward.
        - disputed: A problem was reported by either the customer or the expert while the work was "In Progress." This pauses the project and requires resolution.
        - closed: This is a final status for a request that is no longer active but wasn't successfully completed or cancelled. It can be used for requests that are abandoned, expire, or are manually closed after a dispute is settled.

    Args:
        request_id (str): The ID of the expert request to update.
        status (str): The new status for the expert request. The value must be a valid next step from the current status.
            - If current is `open`, next can be `in_discussion` or `cancelled`.
            - If current is `in_discussion`, next can be `awaiting_quotes` or `cancelled`.
            - If current is `awaiting_quotes`, next can be `contracted` or `cancelled`.
            - If current is `in_progress`, next can be `completed` or `disputed`.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'updated_expert_request' key this will contain the updated expert/work request post and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    print(
        f"TOOL[update_expert_request_status]: called with request_id: {request_id}, status: {status}"
    )
    try:
        token: str = tool_context.state.get("auth_token")
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }

            response = await client.put(
                f"{API_BASE_URL}/api/work-requests/{request_id}/status",
                json={"status": status},
                headers=headers,
            )
            # Raise the HTTPStatusError if one occurred.
            response = response.raise_for_status()

            return {
                "status": "success",
                "updated_expert_request": response.json(),
                "message": "Expert request status updated successfully.",
            }

    except httpx.HTTPError as e:
        error_message = "Failed to update status of expert request. "
        print_message = "ERROR@ TOOL[update_expert_request_status]: "

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
        print(f"ERROR@ TOOL[update_expert_request_status]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to update status of expert request. Reason error: {str(e)}",
        }
