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
    """
    Concatenate two strings with a comma and space, returning the non-empty input if the other is empty.
    
    If both inputs are non-empty the result is "first, second". If one input is empty, the other input is returned unchanged.
    
    Returns:
        str: The resulting concatenated string.
    """
    if not first:
        return second
    if not second:
        return first
    return first + ", " + second


def truncate_string(input_string: str, max_length: int) -> str:
    """
    Truncates a string to at most max_length characters, appending an ellipsis when truncation occurs.
    
    Parameters:
        input_string (str): The string to truncate.
        max_length (int): The maximum number of characters to keep from the original string before appending `"..."`.
    
    Returns:
        str: The original string if its length is less than or equal to max_length; otherwise the first max_length characters followed by `"..."`.
    """
    if len(input_string) <= max_length:
        return input_string
    return input_string[:max_length] + "..."


def create_expert_request_tool_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> dict[str, Any] | None:
    """
    Validate arguments for creating an expert/work request and return an error payload when validation fails.
    
    Checks that title, description, location_or_address, and category are present; that expected cost, if provided, is greater than or equal to zero; and that any provided image filenames are non-empty and end with an allowed image extension (.jpg, .jpeg, .png, .gif, .svg, .webp, .avif). If any validation fails, returns a dict with "status": "error" and an "error_message" describing the problems; otherwise returns None to indicate the arguments are valid.
     
    Returns:
        dict[str, Any]: On validation failure, a dictionary with keys "status" (set to "error") and "error_message" (a concatenated string of validation errors).
        None: If all arguments pass validation.
    """
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
    category = args.get("category", "")

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
) -> dict[str, Any]:
    """
    Create a new expert/work request post for the authenticated customer.
    
    Creates a work request with required fields (title, description, location, category), optionally uploads provided images, and includes optional metadata (expected cost, timeline, suggested materials) in the created request.
    
    Parameters:
        title (str): Non-empty title of the request.
        description (str): Non-empty description of the work.
        location_or_address (str): Non-empty location or address for the work.
        category (str): Non-empty category for the request.
        tool_context (ToolContext): Execution context containing authentication state and artifact loaders.
        opt_expected_cost (float, optional): Estimated cost for the work.
        opt_timeline (str, optional): Proposed timeline or schedule for the work.
        opt_materials_suggested (str, optional): Suggested materials for the job.
        image_filenames (list[str], optional): Filenames of images to upload (recommended max 3). Supported extensions: .jpg, .jpeg, .png, .gif, .svg, .webp, .avif.
    
    Returns:
        dict: A result dictionary with a 'status' key.
            If 'status' == 'success', includes 'created_expert_request' with the backend response and 'message'.
            If 'status' == 'error', includes 'error_message' describing the failure.
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

        final_expert_request: dict[str, str | list[str] | float] = {
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
    Upload a file to the backend upload endpoint and return the parsed upload response.
    
    Parameters:
        filename (str): The filename to use for the upload.
        bytes_data (bytes): Raw file bytes to send.
        mime_type (str): MIME type of the file (e.g., "image/png").
        token (str): Bearer authentication token sent in the Authorization header.
    
    Returns:
        UploadResponse: Parsed JSON response from the upload endpoint (e.g., contains `filePath` and related metadata).
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
    Retrieve all expert/work requests for the authenticated customer.
    
    Returns:
        dict: Contains a 'status' key ('success' or 'error'). If 'status' is 'success', includes
            'expert_requests_list' (list of expert request objects) and 'message' (success message).
            If 'status' is 'error', includes 'error_message' (string describing the failure).
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
    Retrieve the current customer's expert/work requests whose status is one of: "open", "in_discussion", "awaiting_quotes", "contracted", or "in_progress".
    
    Returns:
        dict: Contains a 'status' key ('success' or 'error'). If 'status' is 'success', includes 'active_expert_requests_list' (a list of expert request objects) and 'message'. If 'status' is 'error', includes 'error_message'.
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
    Retrieve a specific expert/work request by its ID for the authenticated user.
    
    Parameters:
        request_id (str): The ID of the expert/work request to retrieve.
    
    Returns:
        dict: If successful, contains `status: "success"`, `expert_request` with the request data, and a `message`. On failure, contains `status: "error"` and `error_message` describing the problem.
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
    """
    Validate and normalize arguments for updating an expert request; return an error payload if validation fails.
    
    Parameters:
        tool (BaseTool): The tool instance invoking the guardrail (not modified).
        args (Dict[str, Any]): Candidate update fields; recognized keys: "title", "description", "location",
            "category", "expected_cost", "timeline", "materials_suggested". String values will be trimmed in-place.
        tool_context (ToolContext): Execution context providing auth and environment (not modified).
    
    Returns:
        dict: If validation fails, returns {"status": "error", "error_message": <details>} describing one or more
            validation problems (e.g., all arguments None, empty strings for provided fields, expected_cost <= 0).
        None: If validation succeeds; args is mutated with trimmed string values and execution may proceed.
    """
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
    Update an open expert request by applying any provided fields; fields with value None are left unchanged.
    
    Only requests in an open state can be updated. If provided, `expected_cost` must be greater than 0.
    
    Parameters:
        request_id (str): ID of the expert request to update.
        expected_cost (Optional[float]): New expected cost; must be greater than 0 when supplied.
    
    Returns:
        dict: A result dictionary with a 'status' key. On success, includes 'updated_expert_request' (the updated request object) and 'message'. On error, includes 'error_message'.
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
    Update the image list for an existing expert/work request.
    
    If successful, returns the updated expert request with the new set of image URLs.
    
    Parameters:
        request_id (str): ID of the expert request to modify.
        url_of_images_to_remove (Optional[list[str]]): URLs of images to remove; pass None to not remove any.
        filenames_of_images_to_add (Optional[list[str]]): Local artifact filenames to upload and add; pass None to not add any.
    
    Returns:
        dict: `{"status": "success", "updated_expert_request": <obj>, "message": <str>}` on success; `{"status": "error", "error_message": <str>}` on failure or when no changes are applied.
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
    """
    Validate that a requested status update for a customer's expert request is allowed.
    
    Checks that `request_id` and `status` are present in `args`, fetches the current expert request, and verifies the requested status is an allowed customer-initiated transition. Does not perform the update; returns None to indicate the tool may proceed.
    
    Returns:
        None if the transition is permitted; otherwise a dict with `"status": "error"` and a user-facing `"message"` describing why the update is disallowed.
    """
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
    """
    Update the customer's expert request to a new status.
    
    Parameters:
        request_id (str): Identifier of the expert/work request to update.
        status (str): Desired next status. Allowed transitions from the current status:
            - open -> in_discussion, cancelled
            - in_discussion -> awaiting_quotes, cancelled
            - awaiting_quotes -> contracted, cancelled
            - in_progress -> completed, disputed
    
    Returns:
        dict: On success, contains
            - 'status': 'success'
            - 'updated_expert_request': the updated expert request object
            - 'message': human-readable success message.
        On error, contains
            - 'status': 'error'
            - 'error_message': human-readable error description.
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