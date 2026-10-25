import datetime
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.verify import router as verify_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("verification_service")

app = FastAPI(
    title="AICTE E-Pranam - Verification Rails & PKI Microservice",
    description="Member 5 Core Service: X.509 Digital Signatures, QR validation, and mock DigiLocker / University rails.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(verify_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Diagnostic health check endpoint for Node.js orchestrator gateway polling.
    """
    return {
        "status": "ONLINE",
        "service": "AICTE E-Pranam Verification Rails & PKI Microservice",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "port": settings.PORT,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    uvicorn.run(
        "services.verification.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
