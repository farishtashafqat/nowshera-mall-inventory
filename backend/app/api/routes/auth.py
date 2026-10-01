from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import require_user
from app.schemas.auth import CurrentUser
from app.core.config import get_settings

router = APIRouter(prefix="/auth")


@router.get("/me", response_model=CurrentUser)
async def read_current_user(user: Annotated[CurrentUser, Depends(require_user)]) -> CurrentUser:
    return user


@router.post("/accept-invitation")
async def accept_invitation(request: Request) -> dict[str, str]:
    """Activate only the authenticated holder of a private Staff invite."""
    settings = get_settings()
    token = request.headers.get("authorization", "")
    if not settings.supabase_url or not settings.supabase_anon_key or not token:
        raise HTTPException(status_code=503, detail="Authentication service is not configured")
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            f"{settings.supabase_url}/rest/v1/rpc/activate_staff_invitation",
            headers={"apikey": settings.supabase_anon_key, "Authorization": token},
        )
    if response.status_code >= 400:
        try:
            detail = response.json().get("message", "A valid invitation is required")
        except ValueError:
            detail = "A valid invitation is required"
        raise HTTPException(status_code=403, detail=detail)
    return {"message": "Your account is active. You can now sign in."}
