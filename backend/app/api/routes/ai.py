"""Grounded, proposal-only AI inventory assistant endpoints."""

import re
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.dependencies import require_user
from app.core.config import get_settings
from app.schemas.auth import CurrentUser
from app.services import catalog

router = APIRouter(prefix="/ai")


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


def _normalise(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "", value.lower())
    # Treat both the correct plural (tomatoes) and a common singular typo
    # (tomatos) as tomato before attempting a grounded catalogue lookup.
    if value.endswith("oes"):
        return value[:-2]
    return value[:-1] if value.endswith("s") else value


def _matching_record(records: list[dict[str, Any]], query: str, fields: tuple[str, ...]) -> dict[str, Any] | None:
    wanted = _normalise(query)
    for record in records:
        for field in fields:
            value = record.get(field)
            if value:
                candidate = _normalise(str(value))
                if wanted == candidate or wanted in candidate or candidate in wanted:
                    return record
                # Product labels may include a unit, e.g. "Tomatoes — 1 kg".
                # Match a meaningful normalized name word within a question too.
                if field == "name" and any(
                    len(word) >= 3 and word in wanted
                    for word in (_normalise(part) for part in re.findall(r"[a-z0-9]+", str(value).lower()))
                ):
                    return record
    return None


async def _products_for(user: CurrentUser) -> list[dict[str, Any]]:
    # The staff view intentionally omits financial columns, including for AI prompts.
    if user.role == "manager":
        return await catalog.list_records("products", {"select": "*", "order": "name", "limit": "100"})
    return await catalog.list_records(
        "active_products_staff",
        {"select": "id,name,sku,barcode,unit,current_stock,low_stock_threshold", "order": "name", "limit": "100"},
    )


async def _suppliers() -> list[dict[str, Any]]:
    return await catalog.list_records("suppliers", {"select": "id,name,is_active", "is_active": "eq.true", "order": "name"})


def _operation_from(message: str) -> tuple[str, float, str, str | None] | None:
    match = re.search(
        r"\b(add|stock\s+in|receive|sell|sale|damage)\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+from\s+(.+?))?[.!?]*$",
        message.strip(),
        re.IGNORECASE,
    )
    if not match:
        return None
    verb, quantity, product_text, supplier_text = match.groups()
    movement = "STOCK_IN" if verb.lower() in {"add", "stock in", "receive"} else "DAMAGE" if verb.lower() == "damage" else "SALE"
    return movement, float(quantity), product_text.strip(), supplier_text.strip() if supplier_text else None


def _has_financial_request(message: str) -> bool:
    return bool(re.search(r"\b(cost|price|profit|margin|revenue|value|financial)\b", message, re.IGNORECASE))


def _is_inventory_lookup(message: str) -> bool:
    return bool(re.search(r"\b(how\s+many|how\s+much|quantity|stock|available|do\s+we\s+have)\b", message, re.IGNORECASE))


def _is_low_stock_request(message: str) -> bool:
    text = message.lower().replace("-", " ")
    return any(phrase in text for phrase in ("low stock", "low on stock", "running low"))


@router.post("/chat")
async def chat(body: ChatInput, user: Annotated[CurrentUser, Depends(require_user)]):
    # Block financial requests before any restricted data can reach Gemini.
    if user.role != "manager" and _has_financial_request(body.message):
        return {"answer": "Financial information is available only to managers."}

    products = await _products_for(user)
    operation = _operation_from(body.message)
    if operation:
        movement_type, quantity, product_text, supplier_text = operation
        product = _matching_record(products, product_text, ("name", "sku", "barcode"))
        if not product:
            return {"answer": "We could not find that product in inventory."}
        if movement_type != "STOCK_IN" and quantity > float(product["current_stock"]):
            return {"answer": f"Cannot remove {quantity:g} units. Only {product['current_stock']} are available."}
        supplier = None
        if supplier_text:
            supplier = _matching_record(await _suppliers(), supplier_text, ("name",))
            if not supplier:
                return {"answer": "We could not find that supplier."}
        proposal = await catalog.create(
            "ai_stock_proposals",
            {
                "requested_by": user.id,
                "product_id": product["id"],
                "movement_type": movement_type,
                "quantity": quantity,
                "supplier_id": supplier["id"] if supplier and movement_type == "STOCK_IN" else None,
                "note": body.message.strip(),
            },
        )
        record = proposal[0]
        return {
            "answer": "Stock change proposal created. Confirm it to apply the operation.",
            "proposal": {"id": record["id"], "status": record["status"], "product": product["name"], "movement_type": record["movement_type"], "quantity": record["quantity"], "supplier": supplier["name"] if supplier else None},
        }

    text = body.message.lower()
    product = _matching_record(products, body.message, ("name", "sku", "barcode"))
    if product and _has_financial_request(body.message) and user.role == "manager":
        return {"answer": f"{product['name']}: cost PKR {product['cost_price']}, selling PKR {product['selling_price']}."}
    if _is_low_stock_request(body.message):
        names = [f"{p['name']} ({p['current_stock']})" for p in products if 0 < float(p["current_stock"]) <= float(p["low_stock_threshold"])]
        return {"answer": "Low-stock products: " + (", ".join(names) if names else "none.")}
    if "out of stock" in text:
        names = [p["name"] for p in products if float(p["current_stock"]) == 0]
        return {"answer": "Out-of-stock products: " + (", ".join(names) if names else "none.")}
    if product:
        return {"answer": f"{product['name']} has {product['current_stock']} {product['unit']} available.", "product_id": product["id"]}
    if _is_inventory_lookup(body.message):
        return {"answer": "We could not find that product in inventory."}

    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(503, "AI Assistant is temporarily unavailable.")
    columns = ["name", "sku", "current_stock", "low_stock_threshold", "unit"]
    if user.role == "manager":
        columns.extend(["cost_price", "selling_price"])
    context = "\n".join(", ".join(f"{key}={product.get(key)}" for key in columns) for product in products[:100])
    prompt = (
        "Answer only from these database rows. If a fact is absent, say it is not available. "
        "Never invent products, quantities, prices, or actions. Never execute stock changes.\n\n"
        f"Inventory rows:\n{context}\n\nUser question: {body.message}"
    )
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                params={"key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
        if response.status_code >= 400:
            raise RuntimeError("Gemini rejected the request")
        return {"answer": response.json()["candidates"][0]["content"]["parts"][0]["text"]}
    except (httpx.HTTPError, KeyError, IndexError, RuntimeError, ValueError):
        raise HTTPException(503, "AI Assistant is temporarily unavailable.") from None


async def _proposal_rpc(function: str, proposal_id: str, request: Request) -> Any:
    settings = get_settings()
    token = request.headers.get("authorization", "")
    if not settings.supabase_url or not settings.supabase_anon_key or not token:
        raise HTTPException(503, "Stock service is not configured")
    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
        response = await client.post(
            f"{settings.supabase_url}/rest/v1/rpc/{function}",
            headers={"apikey": settings.supabase_anon_key, "Authorization": token},
            json={"p_proposal_id": proposal_id},
        )
    if response.status_code >= 400:
        try:
            message = response.json().get("message", "Proposal could not be processed")
        except ValueError:
            message = "Proposal could not be processed"
        raise HTTPException(400, message)
    return response.json()


@router.post("/proposals/{proposal_id}/confirm")
async def confirm(proposal_id: str, request: Request, user: Annotated[CurrentUser, Depends(require_user)]):
    # PostgreSQL locks the proposal and revalidates permissions/current stock.
    return await _proposal_rpc("confirm_ai_proposal", proposal_id, request)


@router.post("/proposals/{proposal_id}/cancel")
async def cancel(proposal_id: str, request: Request, user: Annotated[CurrentUser, Depends(require_user)]):
    # Cancellation only makes a locked PENDING -> CANCELLED status transition.
    return await _proposal_rpc("cancel_ai_proposal", proposal_id, request)
