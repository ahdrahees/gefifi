from typing import TypedDict


class AuthData(TypedDict):
    """AuthData represents the data extracted from a JWT token."""

    user_id: str
    # email: str
    user_type: str
