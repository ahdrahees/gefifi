import asyncio
from typing import Any, Literal, Optional, TypedDict

import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse


class UserProfile(TypedDict):
    """User profile information
    // --- Common Fields ---
        fullName
        avatarUrl// URL to the profile picture in GCS
        location// General location, e.g., "City, State"
        phoneNumber
        experience e.g., "5 years"

        // --- Expert-Specific Fields ---
        expertise e.g., "Plumbing", "Electrical Work"

        // --- Supplier-Specific Fields ---
        companyName e.g., "ABC Building Materials"
        category e.g., "Cement & Steel", "Paints & Finishes"
    """

    fullName: str | None
    avatarUrl: str | None
    location: str | None
    phoneNumber: str | None

    # expert and supplier
    experience: str | None
    # expert
    expertise: str | None
    # supplier
    companyName: str | None
    category: str | None


class User(TypedDict):
    """User info from backend"""

    id: str
    email: str
    password: str | None
    googleId: str | None
    userType: Literal["customer", "expert", "supplier"]
    profile: UserProfile
    createdAt: str
    updatedAt: str
    isActive: bool | None


# Tool to get experts
async def find_experts(
    tool_context: ToolContext,
    expertise: Optional[str],
    location: Optional[str],
    experience: Optional[str],
) -> dict[str, Any]:
    """
    This tool is used to find experts based on the given criteria.
    Use this tool when you need to find experts based on their expertise, experience, and location.
    Args:
        expertise (Optional[str]): The expertise of the expert. Optional parameter used to filter experts by their area of expertise.
        location (Optional[str]): The general location or area of the expert e.g., "Bangalore", "Kochi". Optional parameter used to filter experts by their location.
        experience (Optional[str]): The number of years of experience of the expert. Optional parameter used to filter experts by their years of experience.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'list_of_experts' key this will contain a list of experts and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    # fix add authentication header
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE_URL}/api/users/experts")

            list_of_experts: list[User] = response.raise_for_status().json()

        # filter expertise
        if expertise:
            list_of_experts = [
                expert
                for expert in list_of_experts
                if expert["profile"]["expertise"]
                and expertise.casefold() in expert["profile"]["expertise"].casefold()
            ]

        # filter location
        if location:
            list_of_experts = [
                expert
                for expert in list_of_experts
                if expert["profile"]["location"]
                and location.casefold() in expert["profile"]["location"].casefold()
            ]

        # filter experience
        if experience:
            list_of_experts = [
                expert
                for expert in list_of_experts
                if expert["profile"]["experience"]
                and experience.casefold() in expert["profile"]["experience"].casefold()
            ]

        # Sanitize the expert list to show only the required fields to agent
        sanitized_experts_list = [
            {
                "expert_id": expert["id"],
                "user_type": expert["userType"],
                "name": expert["profile"]["fullName"],
                "profile_picture": expert["profile"]["avatarUrl"],
                "location": expert["profile"]["location"],
                "experience": expert["profile"]["experience"],
                "expertise": expert["profile"]["expertise"],
                "is_active": expert["isActive"],
                "registration_date": expert["createdAt"],
            }
            for expert in list_of_experts
        ]

        return {
            "status": "success",
            "list_of_experts": sanitized_experts_list,
            "message": "List of experts retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve experts list. "
        print_message = "ERROR@ TOOL[find_experts]: "

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
        print(f"ERROR@ TOOL[find_experts]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve experts list. Reason error: {str(e)}",
        }


# Tool to get suppliers
async def find_suppliers(
    tool_context: ToolContext,
    material_category: Optional[str],
    location: Optional[str],
    experience: Optional[str],
) -> dict[str, Any]:
    """
    This tool is used to find suppliers based on the given criteria.
    Use this tool when you need to find suppliers based on their material category they are selling(supplies), experience, and location.
    Args:
        material_category (Optional[str]): The material category of the supplier e.g., "Cement & Steel", "Paints & Finishes". Optional parameter used to filter suppliers by the category of materials they sell.
        location (Optional[str]): The general location or area of the supplier shop e.g., "Bangalore", "Kochi". Optional parameter used to filter suppliers by their location.
        experience (Optional[str]): The number of years of experience of the supplier. Optional parameter used to filter suppliers by their years of experience.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'list_of_suppliers' key this will contain a list of suppliers and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    # fix add authentication header
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE_URL}/api/users/suppliers")

            list_of_suppliers: list[User] = response.raise_for_status().json()

        # filter material_category
        if material_category:
            list_of_suppliers = [
                supplier
                for supplier in list_of_suppliers
                if supplier["profile"]["category"]
                and material_category.casefold()
                in supplier["profile"]["category"].casefold()
            ]

        # filter location
        if location:
            list_of_suppliers = [
                supplier
                for supplier in list_of_suppliers
                if supplier["profile"]["location"]
                and location.casefold() in supplier["profile"]["location"].casefold()
            ]

        # filter experience
        if experience:
            list_of_suppliers = [
                supplier
                for supplier in list_of_suppliers
                if supplier["profile"]["experience"]
                and experience.casefold()
                in supplier["profile"]["experience"].casefold()
            ]

        # Sanitize the supplier list to show only the required fields to agent
        sanitized_suppliers_list = [
            {
                "supplier_id": supplier["id"],
                "user_type": supplier["userType"],
                "supplier_name": supplier["profile"]["companyName"],
                "profile_picture": supplier["profile"]["avatarUrl"],
                "location": supplier["profile"]["location"],
                "experience": supplier["profile"]["experience"],
                "category": supplier["profile"]["category"],
                "is_active": supplier["isActive"],
                "registration_date": supplier["createdAt"],
            }
            for supplier in list_of_suppliers
        ]

        return {
            "status": "success",
            "list_of_suppliers": sanitized_suppliers_list,
            "message": "List of suppliers retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve suppliers list. "
        print_message = "ERROR@ TOOL[find_suppliers]: "

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
        print(f"ERROR@ TOOL[find_suppliers]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve suppliers list. Reason error: {str(e)}",
        }


# Tool to get a user by id
async def find_a_user_by_id(user_id: str, tool_context: ToolContext) -> dict[str, Any]:
    """Retrieves information for any user (customer, expert, or supplier) by their ID.

    Use this tool in the following scenarios:
    - To get details about an expert or supplier involved in a contract.
    - To get details for an expert from the 'interestedExperts' or 'invitedExperts' lists of an expert request.
    - To get details for a supplier from the 'interestedSuppliers' or 'invitedSuppliers' lists of a material request.

    Args:
        user_id: The ID of the user to retrieve.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'user' key this will contain a user details and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
    """
    try:
        token: str = tool_context.state.get("auth_token")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_BASE_URL}/api/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
            )

        user: User = response.raise_for_status().json()

        sanitized_user = sanitize_user(user)
        return {
            "status": "success",
            "user": sanitized_user,
            "message": "User details retrieved successfully",
        }
    except httpx.HTTPError as e:
        error_message = "Failed to retrieve User details. "
        print_message = "ERROR@ TOOL[find_a_user_by_id]: "

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
        print(f"ERROR@ TOOL[find_a_user_by_id]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve User details. Reason error: {str(e)}",
        }


def sanitize_user(user: User) -> dict[str, str | bool | None]:
    if user["userType"] == "expert":
        return {
            "expert_id": user["id"],
            "user_type": user["userType"],
            "name": user["profile"]["fullName"],
            "profile_picture": user["profile"]["avatarUrl"],
            "location": user["profile"]["location"],
            "experience": user["profile"]["experience"],
            "expertise": user["profile"]["expertise"],
            "is_active": user["isActive"],
            "registration_date": user["createdAt"],
        }
    elif user["userType"] == "supplier":
        return {
            "supplier_id": user["id"],
            "user_type": user["userType"],
            "supplier_name": user["profile"]["companyName"],
            "profile_picture": user["profile"]["avatarUrl"],
            "location": user["profile"]["location"],
            "experience": user["profile"]["experience"],
            "category": user["profile"]["category"],
            "is_active": user["isActive"],
            "registration_date": user["createdAt"],
        }
    else:
        return {
            "customer_id": user["id"],
            "user_type": user["userType"],
            "name": user["profile"]["fullName"],
            "profile_picture": user["profile"]["avatarUrl"],
            "location": user["profile"]["location"],
            "is_active": user["isActive"],
            "registration_date": user["createdAt"],
        }


# Tool to get a list of users by their id
async def find_users_by_ids(
    users_ids: list[str], tool_context: ToolContext
) -> dict[str, Any]:
    """Retrieves information for any user (customer, expert, or supplier) by their ID.

    Use this tool in the following scenarios:
    - To get details for experts from the 'interestedExperts' or 'invitedExperts' lists of an expert request.
    - To get details for suppliers from the 'interestedSuppliers' or 'invitedSuppliers' lists of a material request.

    Args:
        users_ids: The IDs of the users to retrieve.
    Returns:
        dict: A dictionary containing the following:
            Includes a 'status' key ('success' or 'error').
            If 'status' is 'success', includes 'users' key this will contain a list of user details and 'message' key with the success message and what to do next.
            If 'status' is 'error', includes an 'error_message' key.
            In both status may also include a 'failed_users' key with a list of users that could not be fetched (element is dict includes the `user_id` key for user_id and `error` key for reason).
            The 'failed_users' key is included if fetching details for any user fails, even if other users are retrieved successfully.
    """
    try:
        token: str = tool_context.state.get("auth_token")

        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [
                client.get(
                    f"{API_BASE_URL}/api/users/{user_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                for user_id in users_ids
            ]
            results: list[httpx.Response | BaseException] = await asyncio.gather(
                *tasks, return_exceptions=True
            )

        successful_users: list[dict[str, str | bool | None]] = []
        failed_users_ids_and_reasons: list[dict[str, str]] = []
        for index, result in enumerate(results):
            if isinstance(result, BaseException):
                failed_users_ids_and_reasons.append(
                    {"user_id": users_ids[index], "error": str(result)}
                )
            else:
                try:
                    # Check for HTTP errors like 404 or 500
                    user = result.raise_for_status().json()
                    sanitized_user = sanitize_user(user)
                    successful_users.append(sanitized_user)

                except httpx.HTTPStatusError as e:
                    response_json: HTTPStatusErrorResponse = (
                        e.response.json()
                    )  # Response body as JSON (if valid)
                    failed_users_ids_and_reasons.append(
                        {
                            "user_id": users_ids[index],
                            "error": f"Failed to retrieve User details. Gefifi Backend responded with message: {response_json['message']}",
                        }
                    )

        # return
        if successful_users and not failed_users_ids_and_reasons:
            # All requests were successful.
            return {
                "status": "success",
                "users": successful_users,
                "message": "All User details retrieved successfully",
            }
        elif successful_users and failed_users_ids_and_reasons:
            # Some requests were successful, some failed.
            return {
                "status": "success",  # "partial_success",
                "users": successful_users,
                "failed_users": failed_users_ids_and_reasons,
                "message": "Some User details retrieved successfully",
            }
        else:
            # All requests failed.
            return {
                "status": "error",
                "error_message": "Failed to retrieve details for any of the requested users",
                "failed_users": failed_users_ids_and_reasons,
            }
    except Exception as e:
        print(f"ERROR@ TOOL[find_a_user_by_id]: Unexpected error - {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve User details. Reason error: {str(e)}",
        }


# Tool to invite expert to a expert request
# Tool to invite supplier to a material request
