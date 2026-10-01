from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Lightweight service availability check."""
    return {"status": "ok"}
