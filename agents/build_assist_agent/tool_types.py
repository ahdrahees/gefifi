from typing import TypedDict


class HTTPStatusErrorResponse(TypedDict):
    """Expected response from backend when status of HTTP response is 4xx or 5xx.."""

    message: str


class UploadResponse(TypedDict):
    """Expected response from upload endpoint."""

    message: str
    filePath: str
    fileName: str
    originalName: str
    mimeType: str
    size: int
