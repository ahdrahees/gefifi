import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from parent directory (agents/.env)
env_path = Path(__file__).parent.parent / ".env"
_ = load_dotenv(dotenv_path=env_path)


API_BASE_URL = os.getenv("API_BASE_URL")
MODEL_ENV_PASSED = os.getenv("LLM_MODEL", "gemini/gemini-3.1-flash-lite")
