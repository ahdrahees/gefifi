import logging
import os
from typing import Any, Optional
import httpx
from google.adk.tools import ToolContext

from build_assist_agent.config import API_BASE_URL
from build_assist_agent.tool_types import HTTPStatusErrorResponse

logger = logging.getLogger(__name__)

# Tool to list chats
async def get_user_chats(tool_context: ToolContext) -> dict[str, Any]:
    """
    Get all active chat sessions of the current user.

    Use this tool when the user wants to list their active chats, check who they are talking to, or see recent messages.

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - chats (list): List of active chat rooms with participant details.
    """
    logger.info("TOOL[get_user_chats]: fetching user's active chats")
    try:
        token: str = tool_context.state.get("auth_token")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }
            response = await client.get(
                f"{API_BASE_URL}/api/chat",
                headers=headers,
            )
            result = response.raise_for_status().json()

        logger.info("TOOL[get_user_chats]: retrieved %s chats", len(result))
        return {
            "status": "success",
            "chats": result,
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
    Get recent messages from a specific chat session.

    Use this tool when the user wants to read or view conversation history in a specific chat room.

    Args:
        chat_id (str): The ID of the chat room.
        opt_limit (int, optional): The number of messages to fetch (default: 50).
        opt_offset (int, optional): The offset pagination parameter (default: 0).

    Returns:
        dict: A dictionary containing:
            - status (str): 'success' or 'error'
            - messages (list): Sorted list of messages.
    """
    logger.info("TOOL[get_chat_messages]: fetching messages for chat %s", chat_id)
    try:
        token: str = tool_context.state.get("auth_token")

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
        logger.info("TOOL[get_chat_messages]: retrieved %s messages", len(messages_list))
        return {
            "status": "success",
            "messages": messages_list,
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
