from pydantic import BaseModel, EmailStr, Field


class CurrentUser(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    department: str | None = None


class StaffInviteRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class StaffMember(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    department: str | None = None
    is_active: bool
    created_at: str
