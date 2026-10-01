from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.staff import router as staff_router
from app.api.routes.managers import router as managers_router
from app.api.routes.catalog import router as catalog_router
from app.api.routes.stock import router as stock_router
from app.api.routes.reports import router as reports_router
from app.api.routes.ai import router as ai_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["system"])
api_router.include_router(auth_router, tags=["authentication"])
api_router.include_router(staff_router, tags=["staff"])
api_router.include_router(managers_router, tags=["managers"])
api_router.include_router(catalog_router, tags=["catalogue"])
api_router.include_router(stock_router, tags=["stock"])
api_router.include_router(reports_router, tags=["reports"])
api_router.include_router(ai_router, tags=["ai"])
