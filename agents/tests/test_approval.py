from types import SimpleNamespace
import os

os.environ.setdefault("API_BASE_URL", "http://localhost:3000")

import pytest

from build_assist_agent.approval import build_approval, payload_hash


def fake_context(user_id: str = "user-1") -> SimpleNamespace:
    return SimpleNamespace(state={"auth_data": {"user_id": user_id}})


@pytest.fixture(autouse=True)
def approval_on(monkeypatch):
    monkeypatch.setenv("AGENT_APPROVAL_MODE", "on")


def test_work_request_payload_is_a_draft_not_an_execution():
    result = build_approval(
        "create_expert_request",
        {
            "title": "Bathroom leak",
            "description": "Leak under the washbasin",
            "location_or_address": "HSR Layout",
            "category": "Plumbing",
            "opt_expected_cost": 4500,
            "image_filenames": ["leak.jpg"],
        },
        fake_context(),
    )

    assert result is not None
    assert result["status"] == "needs_approval"
    approval = result["approval"]
    assert approval["action"] == "work_request"
    assert approval["payload"]["title"] == "Bathroom leak"
    assert approval["payload"]["location"] == "HSR Layout"
    assert approval["payload"]["expectedCost"] == 4500
    assert approval["attachments"] == ["leak.jpg"]
    assert approval["payload_hash"] == payload_hash(approval["payload"])


def test_material_items_are_normalized_for_the_backend():
    result = build_approval(
        "create_material_request",
        {
            "title": "Cement for slab",
            "description": "Need cement delivered",
            "delivery_location": "Bellandur",
            "material_items": [
                {
                    "item_name": "OPC 53",
                    "quantity_of_item_with_unit": "50 bags",
                    "notes": "Grade 53",
                }
            ],
        },
        fake_context(),
    )

    assert result is not None
    payload = result["approval"]["payload"]
    assert payload["items"] == [
        {"itemName": "OPC 53", "quantity": "50 bags", "notes": "Grade 53"}
    ]
    assert payload["deliveryLocation"] == "Bellandur"


def test_contract_payload_binds_the_customer_and_request():
    result = build_approval(
        "draft_contract",
        {
            "request_id": "req-1",
            "request_type": "work",
            "expert_supplier_id": "expert-1",
            "work_details": "Replace the bathroom fittings",
            "agreement_summary": "Fixed price, two milestones",
            "opt_total_amount": 12000,
        },
        fake_context("customer-1"),
    )

    assert result is not None
    payload = result["approval"]["payload"]
    assert payload["customerId"] == "customer-1"
    assert payload["workRequestId"] == "req-1"
    assert payload["totalAmount"] == 12000


def test_chat_message_is_only_a_draft():
    result = build_approval(
        "send_chat_message",
        {"chat_id": "chat-1", "content": "Can you visit tomorrow?"},
        fake_context(),
    )

    assert result is not None
    assert result["status"] == "needs_approval"
    assert result["approval"]["action"] == "chat_message"
    assert result["approval"]["payload"] == {
        "chat_id": "chat-1",
        "content": "Can you visit tomorrow?",
    }
    assert "human must press Send" in result["message"]


def test_incomplete_work_request_is_refused():
    result = build_approval(
        "create_expert_request",
        {
            "title": "Bathroom leak",
            "description": "",
            "location_or_address": "HSR Layout",
            "category": "Plumbing",
        },
        fake_context(),
    )

    assert result is not None
    assert result["status"] == "error"
    assert "complete draft" in result["error_message"]


def test_approval_can_be_disabled_for_compatibility(monkeypatch):
    monkeypatch.setenv("AGENT_APPROVAL_MODE", "off")
    result = build_approval(
        "create_expert_request",
        {
            "title": "Bathroom leak",
            "description": "Leak",
            "location_or_address": "HSR Layout",
            "category": "Plumbing",
        },
        fake_context(),
    )
    assert result is None


def test_accept_quote_card_keeps_the_human_decision():
    result = build_approval(
        "accept_quote",
        {
            "quote_id": "quote-1",
            "opt_quote_title": "Bathroom fittings",
            "opt_amount": 12000,
            "opt_provider_name": "Ganesh",
            "opt_request_id": "req-1",
            "opt_request_type": "work",
        },
        fake_context(),
    )

    assert result is not None
    assert result["status"] == "needs_approval"
    approval = result["approval"]
    assert approval["action"] == "quote_accept"
    assert approval["payload"] == {
        "quoteId": "quote-1",
        "quoteTitle": "Bathroom fittings",
        "amount": 12000,
        "providerName": "Ganesh",
        "requestId": "req-1",
        "requestType": "work",
    }
    assert approval["summary"] == ["Bathroom fittings", "Ganesh", "₹12000"]


def test_accept_quote_without_a_quote_id_is_refused():
    result = build_approval("accept_quote", {}, fake_context())

    assert result is not None
    assert result["status"] == "error"
    assert "complete draft" in result["error_message"]
