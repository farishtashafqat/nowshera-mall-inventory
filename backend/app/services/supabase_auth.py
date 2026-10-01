"""Server-side Supabase authentication and trusted profile lookup."""
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.auth import CurrentUser


def _configured() -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key or not settings.supabase_service_role_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication service is not configured")


async def get_trusted_user(access_token: str) -> CurrentUser:
    """Validate a token with Supabase, then get role only from server-side profile data."""
    _configured()
    settings = get_settings()
    headers = {"apikey": settings.supabase_anon_key or "", "Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10) as client:
        auth_response = await client.get(f"{settings.supabase_url}/auth/v1/user", headers=headers)
        if auth_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
        auth_user: dict[str, Any] = auth_response.json()
        profile_response = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            headers={"apikey": settings.supabase_service_role_key or "", "Authorization": f"Bearer {settings.supabase_service_role_key}"},
            params={"id": f"eq.{auth_user['id']}", "select": "id,full_name,email,role,department,is_active"},
        )
    profiles = profile_response.json() if profile_response.status_code == 200 else []
    if not profiles or not profiles[0].get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account is not active")
    return CurrentUser.model_validate(profiles[0])


async def list_staff() -> list[dict[str, Any]]:
    _configured()
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            headers={"apikey": settings.supabase_service_role_key or "", "Authorization": f"Bearer {settings.supabase_service_role_key}"},
            params={"role": "eq.staff", "select": "id,full_name,email,role,department,is_active,created_at", "order": "created_at.desc"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to retrieve staff accounts")
    return response.json()


async def list_managers() -> list[dict[str, Any]]:
    _configured()
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            headers={"apikey": settings.supabase_service_role_key or "", "Authorization": f"Bearer {settings.supabase_service_role_key}"},
            params={"role": "eq.manager", "select": "id,full_name,email,role,department,is_active,created_at", "order": "created_at.desc"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to retrieve manager accounts")
    return response.json()


async def invite_staff(email: str, full_name: str, invited_by: str) -> None:
    """Stage activation before an authorized manager creates the Auth invite."""
    _configured()
    settings = get_settings()
    headers = {"apikey": settings.supabase_service_role_key or "", "Authorization": f"Bearer {settings.supabase_service_role_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        staged = await client.post(
            f"{settings.supabase_url}/rest/v1/pending_staff_invites",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json={"email": email.lower(), "full_name": full_name, "invited_by": invited_by},
        )
        if staged.status_code >= 400:
            raise HTTPException(status_code=502, detail="Unable to prepare staff invitation")
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/invite",
            headers=headers,
            params={"redirect_to": settings.invite_redirect_url},
            json={"email": email, "data": {"full_name": full_name}},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Could not send this staff invitation")


async def invite_manager(email: str, full_name: str, invited_by: str) -> None:
    """Stage a private role assignment before the admin invite creates the Auth user."""
    _configured()
    settings = get_settings()
    headers = {"apikey": settings.supabase_service_role_key or "", "Authorization": f"Bearer {settings.supabase_service_role_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        staged = await client.post(
            f"{settings.supabase_url}/rest/v1/pending_manager_invites",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json={"email": email.lower(), "full_name": full_name, "invited_by": invited_by},
        )
        if staged.status_code >= 400:
            raise HTTPException(status_code=502, detail="Unable to prepare manager invitation")
        invited = await client.post(
            f"{settings.supabase_url}/auth/v1/invite",
            headers=headers,
            params={"redirect_to": settings.invite_redirect_url},
            json={"email": email, "data": {"full_name": full_name}},
        )
    if invited.status_code >= 400:
        raise HTTPException(status_code=400, detail="Could not send this manager invitation")
