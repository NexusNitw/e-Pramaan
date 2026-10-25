import datetime
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.classify import router as classify_router
from .routers.extraction import router as extraction_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ocr_service")

app = FastAPI(
    title="AICTE E-Pranam - OCR & Document Classification Service",
    description="Member 2 Core Service: PyMuPDF ingestion, PaddleOCR layout analysis, and multi-class classification.",
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
app.include_router(classify_router)
app.include_router(extraction_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Diagnostic health check endpoint for Node.js orchestrator gateway polling.
    """
    return {
        "status": "ONLINE",
        "service": "AICTE E-Pranam OCR & Document Classifier",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "port": settings.PORT,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    uvicorn.run(
        "services.ocr.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
