from pathlib import Path
from dotenv import load_dotenv

# Load .env file from parent directory (agents/.env)
env_path = Path(__file__).parent.parent / ".env"
_ = load_dotenv(dotenv_path=env_path)
