"""Human approval gate for agent tool calls.

The demo goal is an agent that does the work but cannot commit it alone.
Read-only tools run normally. A small set of high-risk tools are intercepted in
``before_tool_callback`` and returned as an approval card for the human to
confirm in the UI. The agent never receives a success response for a gated tool.

Set ``AGENT_APPROVAL_MODE=off`` only for local compatibility testing.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

APPROVAL_MODE_ENV = "AGENT_APPROVAL_MODE"
DEFAULT_APPROVAL_MODE = "on"

ACTION_LABELS: dict[str, tuple[str, str]] = {
    "create_expert_request": ("work_request", "Create work request"),
    "create_material_request": ("material_request", "Create material request"),
    "draft_contract": ("contract", "Draft contract"),
    "accept_quote": ("quote_accept", "Accept quote"),
    "send_chat_message": ("chat_message", "Draft chat message"),
}

APPROVAL_INSTRUCTION = (
    "Approval mode is ON. Do not ask for a separate text confirmation before "
    "calling a create, accept, or draft tool. Call the tool once the required "
    "fields are known; the approval card is the confirmation step. When a tool "
    "returns status='needs_approval': do not retry and do not claim the action "
    "was created, accepted, or sent. Reply with one short sentence only: 'Draft "
    "prepared — the card shows the current status.' Do not say the action is "
    "pending, not submitted, or ask the user to press Confirm in prose; the "
    "card owns that state. A chat message is a draft until the human sends it. "
    "Never say a request, quote, contract, or message was created, accepted, or "
    "sent unless the tool returned status='success'."
)


def approval_mode() -> str:
    return os.getenv(APPROVAL_MODE_ENV, DEFAULT_APPROVAL_MODE).strip().lower()


def approval_enabled() -> bool:
    return approval_mode() not in {"off", "0", "false", "no"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def payload_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _work_request_payload(args: dict[str, Any]) -> dict[str, Any] | None:
    title = args.get("title")
    description = args.get("description")
    location = args.get("location_or_address")
    category = args.get("category")
    if not all(isinstance(value, str) and value.strip() for value in (title, description, location, category)):
        return None

    payload: dict[str, Any] = {
        "title": title.strip(),
        "description": description.strip(),
        "location": location.strip(),
        "category": category.strip(),
        "images": [],
    }
    optional_fields = {
        "opt_expected_cost": "expectedCost",
        "opt_timeline": "timeline",
        "opt_materials_suggested": "materialsSuggested",
        "opt_expiration_date": "expirationDate",
    }
    for source, target in optional_fields.items():
        if args.get(source) is not None:
            payload[target] = args[source]
    return payload


def _material_request_payload(args: dict[str, Any]) -> dict[str, Any] | None:
    title = args.get("title")
    description = args.get("description")
    delivery_location = args.get("delivery_location")
    material_items = args.get("material_items")
    if not all(isinstance(value, str) and value.strip() for value in (title, description, delivery_location)):
        return None
    if not isinstance(material_items, list) or not material_items:
        return None

    items: list[dict[str, str]] = []
    for item in material_items:
        if not isinstance(item, dict):
            return None
        item_name = item.get("item_name")
        quantity = item.get("quantity_of_item_with_unit")
        if not isinstance(item_name, str) or not item_name.strip():
            return None
        if not isinstance(quantity, str) or not quantity.strip():
            return None
        normalized = {"itemName": item_name.strip(), "quantity": quantity.strip()}
        if item.get("notes"):
            normalized["notes"] = str(item["notes"]).strip()
        items.append(normalized)

    payload: dict[str, Any] = {
        "title": title.strip(),
        "description": description.strip(),
        "deliveryLocation": delivery_location.strip(),
        "items": items,
    }
    optional_fields = {
        "delivery_date": "deliveryDate",
        "expert_request_id_to_link": "linkedWorkRequestId",
        "opt_expiration_date": "expirationDate",
    }
    for source, target in optional_fields.items():
        if args.get(source) is not None:
            payload[target] = args[source]
    return payload


def _contract_payload(args: dict[str, Any], user_id: str | None) -> dict[str, Any] | None:
    request_id = args.get("request_id")
    request_type = args.get("request_type")
    expert_supplier_id = args.get("expert_supplier_id")
    work_details = args.get("work_details")
    agreement_summary = args.get("agreement_summary")
    if not user_id:
        return None
    if not all(isinstance(value, str) and value.strip() for value in (request_id, request_type, expert_supplier_id, work_details, agreement_summary)):
        return None
    if request_type not in {"work", "material"}:
        return None

    payload: dict[str, Any] = {
        "customerId": user_id,
        "expertSupplierId": expert_supplier_id,
        "workDetails": work_details,
        "agreementSummary": agreement_summary,
    }
    if request_type == "work":
        payload["workRequestId"] = request_id
    else:
        payload["materialRequestId"] = request_id

    optional_fields = {
        "opt_total_amount": "totalAmount",
        "opt_payment_terms": "paymentTerms",
        "opt_advance_amount": "advanceAmount",
        "opt_start_date": "startDate",
        "opt_expected_completion_date": "expectedCompletionDate",
        "opt_terms_and_conditions": "termsAndConditions",
        "opt_warranty_period": "warrantyPeriod",
        "opt_cancellation_policy": "cancellationPolicy",
    }
    for source, target in optional_fields.items():
        if args.get(source) is not None:
            payload[target] = args[source]
    return payload


def _quote_accept_payload(args: dict[str, Any]) -> dict[str, Any] | None:
    quote_id = args.get("quote_id")
    if not isinstance(quote_id, str) or not quote_id.strip():
        return None

    payload: dict[str, Any] = {"quoteId": quote_id.strip()}
    optional_fields = {
        "opt_quote_title": "quoteTitle",
        "opt_amount": "amount",
        "opt_provider_name": "providerName",
        "opt_request_id": "requestId",
        "opt_request_type": "requestType",
    }
    for source, target in optional_fields.items():
        if args.get(source) is not None:
            payload[target] = args[source]
    return payload


def _summary(action: str, payload: dict[str, Any], attachments: list[str]) -> list[str]:
    if action == "work_request":
        summary = [payload.get("title", ""), payload.get("location", ""), payload.get("category", "")]
        if payload.get("expectedCost") is not None:
            summary.append(f"₹{payload['expectedCost']}")
    elif action == "material_request":
        summary = [payload.get("title", ""), payload.get("deliveryLocation", ""), f"{len(payload.get('items', []))} item(s)"]
    elif action == "contract":
        summary = [payload.get("workDetails", ""), f"₹{payload.get('totalAmount', 'not set')}"]
    elif action == "quote_accept":
        summary = [payload.get("quoteTitle", "Selected quote"), payload.get("providerName", "")]
        if payload.get("amount") is not None:
            summary.append(f"₹{payload['amount']}")
    else:
        summary = [str(payload.get("content", ""))[:160]]
    if attachments:
        summary.append(f"{len(attachments)} attachment(s)")
    return [str(item) for item in summary if item not in {"", None}]


def build_approval(
    tool_name: str,
    args: dict[str, Any],
    tool_context: Any,
) -> dict[str, Any] | None:
    """Return an approval payload for a gated tool, or None to execute normally."""
    if not approval_enabled() or tool_name not in ACTION_LABELS:
        return None

    action, title = ACTION_LABELS[tool_name]
    state = getattr(tool_context, "state", {}) or {}
    auth_data = state.get("auth_data") or {}
    user_id = auth_data.get("user_id") if isinstance(auth_data, dict) else None

    attachments: list[str] = []
    if tool_name == "create_expert_request":
        payload = _work_request_payload(args)
        attachments = [name for name in (args.get("image_filenames") or []) if isinstance(name, str)]
    elif tool_name == "create_material_request":
        payload = _material_request_payload(args)
        attachments = [name for name in (args.get("attachment_list") or []) if isinstance(name, str)]
    elif tool_name == "draft_contract":
        payload = _contract_payload(args, user_id)
    elif tool_name == "accept_quote":
        payload = _quote_accept_payload(args)
    else:
        chat_id = args.get("chat_id")
        content = args.get("content")
        payload = {"chat_id": chat_id, "content": content} if isinstance(chat_id, str) and isinstance(content, str) and content.strip() else None

    if payload is None:
        logger.warning("Approval payload could not be built for tool %s; refusing to execute", tool_name)
        return {
            "status": "error",
            "error_message": "This action needs a complete draft before it can be confirmed. Ask the user for the missing details.",
        }

    approval = {
        "id": str(uuid.uuid4()),
        "created_at": _now_iso(),
        "action": action,
        "title": title,
        "summary": _summary(action, payload, attachments),
        "payload": payload,
        "attachments": attachments,
        "payload_hash": payload_hash(payload),
    }

    pending = state.setdefault("pending_approvals", [])
    if isinstance(pending, list):
        pending.append(approval)
        # Keep the session state small; the card carries the payload.
        del pending[:-20]

    logger.info("Approval requested for %s (%s)", tool_name, approval["id"])
    message = (
        "Draft ready. Ask the user to review the approval card and press Confirm."
        if action != "chat_message"
        else "Draft message ready. The human must press Send; the agent cannot send it."
    )
    return {
        "status": "needs_approval",
        "approval": approval,
        "message": message,
    }
