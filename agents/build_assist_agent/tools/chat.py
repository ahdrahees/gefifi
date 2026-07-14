import asyncio
import logging
import os
from typing import Any, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse

logger = logging.getLogger(__name__)


async def _fetch_user_profile(user_id: str, token: str) -> dict:
    """Fetch user profile from the backend API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            response = await client.get(
                f"{API_BASE_URL}/api/users/{user_id}",
                headers=headers,
            )
            if response.status_code == 200:
                user_data = response.json()
                profile = user_data.get("profile", {})
                fullName = profile.get("fullName", "")
                email = user_data.get("email", "")
                userType = user_data.get("userType", "")
                return {
                    "fullName": fullName or email.split("@")[0] or "User",
                    "userType": userType,
                }
    except Exception as e:
        logger.error(f"Error fetching user profile for {user_id}: {e}")
    return {"fullName": "Unknown User", "userType": "unknown"}


async def _fetch_request_title(request_id: str, request_type: str, token: str) -> str:
    """Fetch the request title (work or material request) from the backend API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            endpoint = "work-requests" if request_type == "work" else "material-requests"
            response = await client.get(
                f"{API_BASE_URL}/api/{endpoint}/{request_id}",
                headers=headers,
            )
            if response.status_code == 200:
                return response.json().get("title", "")
    except Exception as e:
        logger.error(f"Error fetching request title for {request_id} ({request_type}): {e}")
    return ""


# Tool to list chats
async def get_user_chats(tool_context: ToolContext) -> dict[str, Any]:
    """
    Get all active chat sessions of the current user, fully resolved with participant names and request titles.

    Use this tool when the user wants to list their active chats, check who they are talking to, or see recent messages.

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - chats (list): List of active chat rooms with resolved names, request titles, and last messages.
    """
    logger.info("TOOL[get_user_chats]: fetching user's active chats")
    try:
        token: str = tool_context.state.get("auth_token")
        current_user_id = tool_context.state.get("auth_data", {}).get("user_id")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }
            response = await client.get(
                f"{API_BASE_URL}/api/chat",
                headers=headers,
            )
            result = response.raise_for_status().json()

        # Collect unique other user IDs and request IDs
        other_user_ids = set()
        request_ids = []  # list of tuples (id, type)

        for chat in result:
            for p_id in chat.get("participants", []):
                if p_id != current_user_id:
                    other_user_ids.add(p_id)
            
            w_req = chat.get("workRequestId")
            m_req = chat.get("materialRequestId")
            if w_req:
                request_ids.append((w_req, "work"))
            elif m_req:
                request_ids.append((m_req, "material"))

        # Fetch profiles concurrently
        user_tasks = {
            u_id: _fetch_user_profile(u_id, token)
            for u_id in other_user_ids
        }
        user_results = {}
        if user_tasks:
            resolved_keys = list(user_tasks.keys())
            resolved_vals = await asyncio.gather(*[user_tasks[k] for k in resolved_keys])
            user_results = dict(zip(resolved_keys, resolved_vals))

        # Fetch request titles concurrently
        request_tasks = {
            (r_id, r_type): _fetch_request_title(r_id, r_type, token)
            for r_id, r_type in set(request_ids)
        }
        request_results = {}
        if request_tasks:
            resolved_keys = list(request_tasks.keys())
            resolved_vals = await asyncio.gather(*[request_tasks[k] for k in resolved_keys])
            request_results = dict(zip(resolved_keys, resolved_vals))

        # Build clean user-facing response
        enriched_chats = []
        for chat in result:
            other_participants = []
            participants_details = []
            for p_id in chat.get("participants", []):
                if p_id != current_user_id:
                    p_info = user_results.get(p_id, {"fullName": "Unknown User", "userType": "unknown"})
                    other_participants.append(f"{p_info['fullName']} ({p_info['userType']})")
                    participants_details.append({
                        "id": p_id,
                        "name": p_info['fullName'],
                        "role": p_info['userType']
                    })
                else:
                    other_participants.append("You")
                    participants_details.append({
                        "id": p_id,
                        "name": "You",
                        "role": "customer"
                    })

            req_title = "General Inquiry"
            w_req = chat.get("workRequestId")
            m_req = chat.get("materialRequestId")
            if w_req:
                req_title = request_results.get((w_req, "work"), "Work Request")
            elif m_req:
                req_title = request_results.get((m_req, "material"), "Material Request")

            last_msg = chat.get("lastMessage")
            last_msg_sender = "System"
            if last_msg:
                sender_id = last_msg.get("senderId")
                if sender_id == current_user_id:
                    last_msg_sender = "You"
                elif sender_id in user_results:
                    last_msg_sender = user_results[sender_id]["fullName"]

            enriched_chats.append({
                "chat_id": chat["id"],
                "participants_names": other_participants,
                "participants": participants_details,
                "related_request": {
                    "id": w_req or m_req or "none",
                    "title": req_title,
                    "type": "work" if w_req else ("material" if m_req else "none")
                },
                "last_message": {
                    "content": last_msg.get("content", ""),
                    "sender": last_msg_sender,
                    "timestamp": last_msg.get("timestamp", "")
                } if last_msg else None
            })

        logger.info("TOOL[get_user_chats]: enriched and returned %s chats", len(enriched_chats))
        return {
            "status": "success",
            "chats": enriched_chats,
            "message": "Chats retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve chats. "
        print_message = "ERROR@ TOOL[get_user_chats]: "

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
        logger.exception("Unexpected error in get_user_chats")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve chats. Reason error: {str(e)}",
        }


# Tool to fetch messages
async def get_chat_messages(
    chat_id: str,
    tool_context: ToolContext,
    opt_limit: Optional[int] = 50,
    opt_offset: Optional[int] = 0,
) -> dict[str, Any]:
    """
    Get recent messages from a specific chat session with sender user IDs resolved to human names.

    Use this tool when the user wants to read or view conversation history in a specific chat room.

    Args:
        chat_id (str): The ID of the chat room.
        opt_limit (int, optional): The number of messages to fetch (default: 50).
        opt_offset (int, optional): The offset pagination parameter (default: 0).

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - messages (list): Sorted list of messages with human-readable sender names.
    """
    logger.info("TOOL[get_chat_messages]: fetching messages for chat %s", chat_id)
    try:
        token: str = tool_context.state.get("auth_token")
        current_user_id = tool_context.state.get("auth_data", {}).get("user_id")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }
            response = await client.get(
                f"{API_BASE_URL}/api/chat/{chat_id}/messages?limit={opt_limit}&offset={opt_offset}",
                headers=headers,
            )
            result = response.raise_for_status().json()

        messages_list = result.get("messages", [])

        # Collect unique sender IDs (excluding system/current user)
        sender_ids = set()
        for msg in messages_list:
            s_id = msg.get("senderId")
            if s_id and s_id != current_user_id and s_id != "system":
                sender_ids.add(s_id)

        # Resolve sender names concurrently
        user_tasks = {
            u_id: _fetch_user_profile(u_id, token)
            for u_id in sender_ids
        }
        user_results = {}
        if user_tasks:
            resolved_keys = list(user_tasks.keys())
            resolved_vals = await asyncio.gather(*[user_tasks[k] for k in resolved_keys])
            user_results = dict(zip(resolved_keys, resolved_vals))

        # Enriched messages
        enriched_messages = []
        for msg in messages_list:
            s_id = msg.get("senderId")
            sender_name = "System"
            if s_id == current_user_id:
                sender_name = "You"
            elif s_id in user_results:
                sender_name = user_results[s_id]["fullName"]

            enriched_messages.append({
                "message_id": msg["id"],
                "sender_name": sender_name,
                "content": msg.get("content", ""),
                "timestamp": msg.get("timestamp", ""),
                "has_images": len(msg.get("images", [])) > 0,
                "has_attachments": len(msg.get("attachments", [])) > 0,
            })

        logger.info("TOOL[get_chat_messages]: retrieved and enriched %s messages", len(enriched_messages))
        return {
            "status": "success",
            "messages": enriched_messages,
            "message": "Messages retrieved successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to retrieve messages. "
        print_message = "ERROR@ TOOL[get_chat_messages]: "

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
        logger.exception("Unexpected error in get_chat_messages")
        return {
            "status": "error",
            "error_message": f"Failed to retrieve messages. Reason error: {str(e)}",
        }


# Tool to send messages
async def send_chat_message(
    chat_id: str,
    content: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """
    Send a new text message to a specific chat session.

    Use this tool when the user asks you to send a message to someone in a chat room.

    Args:
        chat_id (str): The ID of the chat room.
        content (str): The text message content to send.

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - created_message (dict): The message object returned by the backend.
    """
    logger.info("TOOL[send_chat_message]: sending message to chat %s", chat_id)
    try:
        token: str = tool_context.state.get("auth_token")

        body = {
            "content": content,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            response = await client.post(
                f"{API_BASE_URL}/api/chat/{chat_id}/messages",
                json=body,
                headers=headers,
            )
            result = response.raise_for_status().json()

        logger.info("TOOL[send_chat_message]: message sent successfully")
        return {
            "status": "success",
            "created_message": result,
            "message": "Message sent successfully",
        }

    except httpx.HTTPError as e:
        error_message = "Failed to send message. "
        print_message = "ERROR@ TOOL[send_chat_message]: "

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
        logger.exception("Unexpected error in send_chat_message")
        return {
            "status": "error",
            "error_message": f"Failed to send message. Reason error: {str(e)}",
        }
