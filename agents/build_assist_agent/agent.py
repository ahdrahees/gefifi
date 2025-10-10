import datetime
from inspect import AGEN_CREATED
import os
import jwt
from zoneinfo import ZoneInfo
from google.adk.agents import Agent

# Load environment variables from .env file
from . import config


MODEL_GEMINI_2_0_FLASH = "gemini-2.0-flash"
MODEL_GEMINI_2_5_PRO = "models/gemini-2.5-pro"
OPENROUTER_MODEL_DEEPSEEK = "openrouter/deepseek/deepseek-chat-v3.1:free"

AGENT_ENV = os.getenv("AGENT_ENV", "development")
DEV_MODE = AGENT_ENV == "development"


def get_weather(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Args:
        city (str): The name of the city for which to retrieve the weather report.

    Returns:
        dict: status and result or error msg.
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": (
                "The weather in New York is sunny with a temperature of 25 degrees"
                " Celsius (77 degrees Fahrenheit)."
            ),
        }
    else:
        return {
            "status": "error",
            "error_message": f"Weather information for '{city}' is not available.",
        }


def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city.

    Args:
        city (str): The name of the city for which to retrieve the current time.

    Returns:
        dict: status and result or error msg.
    """

    if city.lower() == "new york":
        tz_identifier = "America/New_York"
    else:
        return {
            "status": "error",
            "error_message": (f"Sorry, I don't have timezone information for {city}."),
        }

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    report = f"The current time in {city} is {now.strftime('%Y-%m-%d %H:%M:%S %Z%z')}"
    return {"status": "success", "report": report}


root_agent = Agent(
    name="build_assist_agent",
    # LiteLLM model options (choose one):
    # - Gemini: "gemini-2.0-flash", "gemini-1.5-pro"
    # - OpenAI: "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"
    # - Claude: "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"
    # - Local: "ollama/llama3", "ollama/mistral"
    model="gemini-2.0-flash",
    description=(
        "Agent to assist with construction project management, including weather, time, and file uploads."
    ),
    instruction=(
        "You are a helpful construction management assistant. "
        "You can answer questions about weather and time in different cities. "
        "You can also help users upload files and attachments to their material requests, work requests, and contracts. "
        "When a user uploads files, you can analyze them and upload them to the appropriate entity in the backend."
    ),
    tools=[
        get_weather,
        get_current_time,
    ],
)
