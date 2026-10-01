from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import require_manager
from app.schemas.auth import CurrentUser, StaffInviteRequest, StaffMember
from app.services.supabase_auth import invite_staff, list_staff

router = APIRouter(prefix="/staff")


@router.get("", response_model=list[StaffMember])
async def read_staff(_: Annotated[CurrentUser, Depends(require_manager)]) -> list[dict[str, object]]:
    return await list_staff()


@router.post("/invitations", status_code=status.HTTP_202_ACCEPTED)
async def create_staff_invitation(
    request: StaffInviteRequest, user: Annotated[CurrentUser, Depends(require_manager)]
) -> dict[str, str]:
    await invite_staff(str(request.email), request.full_name, user.id)
    return {"message": "Staff invitation sent"}
