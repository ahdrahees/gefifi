import logging
from typing import Any, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse
from build_assist_agent.auth_types import AuthData

logger = logging.getLogger(__name__)


async def _fetch_user_profile_helper(user_id: str, token: str) -> dict[str, Any]:
    """Helper to fetch user profile directly from backend."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(f"{API_BASE_URL}/api/users/{user_id}", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            return user_data.get("profile", {})
    return {}


async def browse_work_requests(
    tool_context: ToolContext,
    opt_expertise: Optional[str] = None,
    opt_location: Optional[str] = None,
    opt_keyword: Optional[str] = None,
    opt_all_open: bool = False,
) -> dict[str, Any]:
    """
    Browse open work/construction requests posted by customers for experts to bid on.

    Use this tool when an expert user wants to view available work opportunities, find jobs matching their expertise, or search for work requests.

    Behavior:
    - If `opt_expertise` or `opt_location` are omitted, this tool automatically retrieves the current expert's profile (expertise skills & location) to filter and rank the closest matching requests.
    - If `opt_all_open` is True (or if the user explicitly asks for general/all open requests), category filtering is relaxed to show all open requests.

    Args:
        opt_expertise (str, optional): Explicit expertise/category override (e.g., "Plumbing", "Electrical").
        opt_location (str, optional): Explicit location/city override (e.g., "Bangalore", "Kochi").
        opt_keyword (str, optional): Keyword search within request title/description (e.g., "kitchen", "roofing").
        opt_all_open (bool, optional): Set to True to retrieve all active open requests regardless of category matching.

    Returns:
        dict: Status, list of matching work requests, and summary message.
    """
    logger.info("TOOL[browse_work_requests]: fetching open work requests for expert")
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data", {})
        user_id = auth_data.get("user_id")

        if not token or not user_id:
            return {"status": "error", "error_message": "Authentication required."}

        # Automatically fetch expert's profile if parameters are not explicitly provided
        user_profile = {}
        if not opt_expertise or not opt_location:
            user_profile = await _fetch_user_profile_helper(user_id, token)

        target_expertise = opt_expertise or user_profile.get("expertise") or ""
        target_location = opt_location or user_profile.get("location") or ""

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            response = await client.get(f"{API_BASE_URL}/api/work-requests", headers=headers)
            all_requests = response.raise_for_status().json()

        # Filter only active open requests
        active_statuses = ["open", "in_discussion", "awaiting_quotes"]
        open_requests = [
            req for req in all_requests if req.get("status") in active_statuses
        ]

        filtered_requests = []
        for req in open_requests:
            req_title = req.get("title", "")
            req_desc = req.get("description", "")
            req_cat = req.get("category", "")
            req_loc = req.get("location", "")

            # 1. Keyword check
            if opt_keyword:
                kw = opt_keyword.casefold()
                if kw not in req_title.casefold() and kw not in req_desc.casefold() and kw not in req_cat.casefold():
                    continue

            # If opt_all_open is True, skip strict category & location filtering
            if opt_all_open:
                filtered_requests.append(req)
                continue

            # 2. Expertise / Category matching
            matches_expertise = True
            if target_expertise:
                exp_clean = target_expertise.casefold()
                matches_expertise = (
                    exp_clean in req_cat.casefold()
                    or exp_clean in req_title.casefold()
                    or exp_clean in req_desc.casefold()
                )

            # 3. Location matching
            matches_location = True
            if target_location:
                loc_clean = target_location.casefold()
                matches_location = (
                    loc_clean in req_loc.casefold() or req_loc.casefold() in loc_clean
                )

            # Accept if matches expertise or location
            if matches_expertise or matches_location:
                filtered_requests.append(req)

        # Fallback: If strict filter yields 0 results, return all open requests with a friendly notice
        is_fallback = False
        if not filtered_requests and open_requests and not opt_all_open:
            filtered_requests = open_requests
            is_fallback = True

        # Sanitize and format for response
        formatted_requests = []
        for req in filtered_requests:
            formatted_requests.append({
                "id": req.get("id"),
                "title": req.get("title"),
                "description": req.get("description"),
                "category": req.get("category", "General"),
                "location": req.get("location"),
                "expectedCost": req.get("expectedCost"),
                "timeline": req.get("timeline"),
                "status": req.get("status"),
                "createdAt": req.get("createdAt"),
                "expirationDate": req.get("expirationDate"),
            })

        msg = f"Found {len(formatted_requests)} open work requests matching your profile expertise ({target_expertise}) and location ({target_location})."
        if is_fallback:
            msg = f"No exact matches found for expertise '{target_expertise}' or location '{target_location}'. Showing all {len(formatted_requests)} available open work requests."

        logger.info("TOOL[browse_work_requests]: returning %s requests", len(formatted_requests))
        return {
            "status": "success",
            "matching_criteria": {
                "expertise": target_expertise,
                "location": target_location,
                "keyword": opt_keyword,
                "all_open_mode": opt_all_open or is_fallback,
            },
            "work_requests": formatted_requests,
            "message": msg,
        }

    except httpx.HTTPError as e:
        logger.error(f"HTTP error in browse_work_requests: {e}")
        return {"status": "error", "error_message": f"Failed to fetch work requests: {e}"}
    except Exception as e:
        logger.exception("Unexpected error in browse_work_requests")
        return {"status": "error", "error_message": f"Failed to browse work requests: {e}"}


async def browse_material_requests(
    tool_context: ToolContext,
    opt_category: Optional[str] = None,
    opt_location: Optional[str] = None,
    opt_keyword: Optional[str] = None,
    opt_all_open: bool = False,
) -> dict[str, Any]:
    """
    Browse open material procurement requests posted by customers for suppliers to quote on.

    Use this tool when a supplier user wants to view available material supply opportunities, find material requests matching their product categories, or search for supply requests.

    Behavior:
    - If `opt_category` or `opt_location` are omitted, this tool automatically retrieves the current supplier's profile (company category & location) to filter and rank the closest matching requests.
    - If `opt_all_open` is True (or if the user explicitly asks for general/all open material requests), category filtering is relaxed to show all open material requests.

    Args:
        opt_category (str, optional): Explicit material category override (e.g., "Cement & Steel", "Paints & Finishes").
        opt_location (str, optional): Explicit delivery location/city override (e.g., "Bangalore", "Kochi").
        opt_keyword (str, optional): Keyword search within item names, notes, title, or description (e.g., "cement", "bricks").
        opt_all_open (bool, optional): Set to True to retrieve all active open material requests regardless of category matching.

    Returns:
        dict: Status, list of matching material requests with item details, and summary message.
    """
    logger.info("TOOL[browse_material_requests]: fetching open material requests for supplier")
    try:
        token: str = tool_context.state.get("auth_token")
        auth_data: AuthData = tool_context.state.get("auth_data", {})
        user_id = auth_data.get("user_id")

        if not token or not user_id:
            return {"status": "error", "error_message": "Authentication required."}

        # Automatically fetch supplier's profile if parameters are not explicitly provided
        user_profile = {}
        if not opt_category or not opt_location:
            user_profile = await _fetch_user_profile_helper(user_id, token)

        target_category = opt_category or user_profile.get("category") or ""
        target_location = opt_location or user_profile.get("location") or ""

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            response = await client.get(f"{API_BASE_URL}/api/material-requests", headers=headers)
            all_requests = response.raise_for_status().json()

        # Filter active open material requests
        active_statuses = ["open", "quoting"]
        open_requests = [
            req for req in all_requests if req.get("status") in active_statuses
        ]

        filtered_requests = []
        for req in open_requests:
            req_title = req.get("title", "")
            req_desc = req.get("description", "")
            req_loc = req.get("deliveryLocation", "")
            req_items = req.get("items", [])

            # Flatten item names and notes for search
            items_str = " ".join(
                [f"{it.get('itemName', '')} {it.get('notes', '')}" for it in req_items]
            )

            # 1. Keyword check
            if opt_keyword:
                kw = opt_keyword.casefold()
                if (
                    kw not in req_title.casefold()
                    and kw not in req_desc.casefold()
                    and kw not in items_str.casefold()
                ):
                    continue

            # If opt_all_open is True, skip strict category & location filtering
            if opt_all_open:
                filtered_requests.append(req)
                continue

            # 2. Category matching (check title, description, or items string against supplier category)
            matches_category = True
            if target_category:
                cat_clean = target_category.casefold()
                matches_category = (
                    cat_clean in req_title.casefold()
                    or cat_clean in req_desc.casefold()
                    or cat_clean in items_str.casefold()
                    or any(cat_clean in it.get("itemName", "").casefold() for it in req_items)
                )

            # 3. Location matching
            matches_location = True
            if target_location:
                loc_clean = target_location.casefold()
                matches_location = (
                    loc_clean in req_loc.casefold() or req_loc.casefold() in loc_clean
                )

            if matches_category or matches_location:
                filtered_requests.append(req)

        # Fallback: If strict filter yields 0 results, return all open requests with a friendly notice
        is_fallback = False
        if not filtered_requests and open_requests and not opt_all_open:
            filtered_requests = open_requests
            is_fallback = True

        # Sanitize and format for response
        formatted_requests = []
        for req in filtered_requests:
            formatted_requests.append({
                "id": req.get("id"),
                "title": req.get("title"),
                "description": req.get("description"),
                "deliveryLocation": req.get("deliveryLocation"),
                "deliveryDate": req.get("deliveryDate"),
                "items": req.get("items", []),
                "status": req.get("status"),
                "createdAt": req.get("createdAt"),
                "expirationDate": req.get("expirationDate"),
            })

        msg = f"Found {len(formatted_requests)} open material requests matching your category ({target_category}) and location ({target_location})."
        if is_fallback:
            msg = f"No exact matches found for category '{target_category}' or location '{target_location}'. Showing all {len(formatted_requests)} available open material requests."

        logger.info("TOOL[browse_material_requests]: returning %s requests", len(formatted_requests))
        return {
            "status": "success",
            "matching_criteria": {
                "category": target_category,
                "location": target_location,
                "keyword": opt_keyword,
                "all_open_mode": opt_all_open or is_fallback,
            },
            "material_requests": formatted_requests,
            "message": msg,
        }

    except httpx.HTTPError as e:
        logger.error(f"HTTP error in browse_material_requests: {e}")
        return {"status": "error", "error_message": f"Failed to fetch material requests: {e}"}
    except Exception as e:
        logger.exception("Unexpected error in browse_material_requests")
        return {"status": "error", "error_message": f"Failed to browse material requests: {e}"}
