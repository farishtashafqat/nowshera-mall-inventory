from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.auth import CurrentUser
from app.services.supabase_auth import get_trusted_user

security = HTTPBearer(auto_error=False)


async def require_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return await get_trusted_user(credentials.credentials)


async def require_manager(user: Annotated[CurrentUser, Depends(require_user)]) -> CurrentUser:
    if user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    return user
