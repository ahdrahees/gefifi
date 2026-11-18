import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from parent directory (agents/.env)
env_path = Path(__file__).parent.parent / ".env"
_ = load_dotenv(dotenv_path=env_path)


API_BASE_URL = os.getenv("API_BASE_URL")
MODEL_ENV_PASSED = os.getenv("LLM_MODEL", "gemini/gemini-3.1-flash-lite")

# OpenCode Go inference (opencode_go/* models) requires an
# `x-opencode-session` request header for routing, otherwise the gateway
# rejects calls with 400 MissingSessionID. LiteLLM derives it from a litellm
# session id, which ADK never sets, so send a stable static value instead.
# Only applied for opencode_go models; other providers get no extra headers.
OPENCODE_SESSION_ID = os.getenv("OPENCODE_SESSION_ID", "gefifi-build-assist-agent")
LITELLM_EXTRA_HEADERS: dict[str, str] = (
    {"x-opencode-session": OPENCODE_SESSION_ID}
    if MODEL_ENV_PASSED.startswith("opencode_go/")
    else {}
)
