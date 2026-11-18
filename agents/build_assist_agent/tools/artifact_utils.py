"""Shared helpers for resolving user-uploaded session artifacts by filename.

User uploads are saved as session artifacts by ADK's SaveFilesAsArtifactsPlugin
under their original ``display_name`` (e.g. ``photo.jpg``). Tools take those
filenames and load them via ``tool_context.load_artifact()``, which returns
``None`` for unknown names. Guessing names therefore fails silently unless the
tool reports *which* names actually exist -- this module centralises that.
"""

import asyncio
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _is_complete_upload(part: Any) -> bool:
    """Check an artifact Part has everything needed for a backend upload."""
    inline_data = getattr(part, "inline_data", None)
    return bool(
        part is not None
        and inline_data is not None
        and getattr(inline_data, "display_name", None)
        and getattr(inline_data, "data", None)
        and getattr(inline_data, "mime_type", None)
    )


async def resolve_upload_filenames(
    tool_context: Any,
    requested_filenames: list[str],
    *,
    label: str = "files",
) -> tuple[list[Any], Optional[dict[str, Any]]]:
    """Load session artifacts for ``requested_filenames``.

    Returns ``(resolved_parts, None)`` when at least one name resolves (names
    that don't resolve are skipped, preserving existing tool behaviour).

    Returns ``([], error_response)`` when *none* resolve. The error lists the
    filenames actually uploaded in this chat session so the model can retry
    with a correct name instead of guessing blindly.
    """
    loaded = await asyncio.gather(
        *[
            tool_context.load_artifact(filename=filename)
            for filename in requested_filenames
        ]
    )
    resolved = [part for part in loaded if _is_complete_upload(part)]
    if resolved:
        skipped = sorted(set(requested_filenames) - {p.inline_data.display_name for p in resolved})
        if skipped:
            logger.warning(
                "resolve_upload_filenames: skipped unresolvable %s: %s",
                label,
                skipped,
            )
        return resolved, None

    try:
        available = await tool_context.list_artifacts()
    except Exception:
        logger.exception("resolve_upload_filenames: list_artifacts failed")
        available = []

    return [], {
        "status": "error",
        "error_message": (
            f"None of the {label} {list(requested_filenames)} match files "
            f"uploaded in this chat session, so nothing was attached. "
            f"Available uploaded filenames: {available if available else 'none'}. "
            "Call the tool again with the correct filename(s) from that list."
        ),
    }
