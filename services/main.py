import datetime
import logging
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Member 1 Routers: Document Forensics, Facility Geotag, & Typography
from services.forensics.routers.forensics import router as forensics_router
from services.forensics.routers.facility_forensics import router as facility_router
from services.forensics.routers.typography import router as typography_router

# Member 2 Routers: OCR, Classification, & Pre-Scrutiny Ingestion QA
from services.ocr.routers.classify import router as classify_router
from services.ocr.routers.extraction import router as extraction_router
from services.ocr.routers.pre_scrutiny import router as pre_scrutiny_router

# Member 5 Router: PKI Digital Signatures, QR Payload, & External Trust Rails
from services.verification.routers.verify import router as verify_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aicte_unified_services")

app = FastAPI(
    title="AICTE E-Pranam - Unified AI & Regulatory Verification Engine",
    description=(
        "Unified Microservice Gateway combining Computer Vision & Forensics, "
        "OCR & Document Classification, and PKI & Trust Rails"
        "into a single, cost-effective deployment for Render/Railway/Koyeb."
    ),
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

# 1. Mount Forensics Routers (/api/forensics/*)
app.include_router(forensics_router)
app.include_router(facility_router)
app.include_router(typography_router)

# 2. Mount OCR & Ingestion Routers (/api/ocr/*)
app.include_router(classify_router)
app.include_router(extraction_router)
app.include_router(pre_scrutiny_router)

# 3. Mount PKI & Verification Routers (/api/trust/*)
app.include_router(verify_router)


@app.get("/", tags=["Root"])
async def root_index():
    return {
        "service": "AICTE E-Pranam Unified Microservice",
        "status": "ONLINE",
        "documentation": "/docs",
        "endpoints": {
            "forensics_analysis": "/api/forensics/analyze",
            "facility_audit": "/api/forensics/facility-audit",
            "typography_check": "/api/forensics/typography/analyze",
            "ocr_classify": "/api/ocr/classify",
            "ocr_extract": "/api/ocr/extract",
            "ocr_pre_scrutiny": "/api/ocr/pre-scrutiny/inspect",
            "trust_verify": "/api/trust/verify-rails",
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


@app.get("/health", tags=["Health"])
async def unified_health_check():
    """
    Unified health check probe for Render, Railway, or Kubernetes orchestrators.
    """
    return {
        "status": "ONLINE",
        "service": "AICTE E-Pranam Unified AI Microservice",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "subsystems": {
            "forensics": "OPERATIONAL",
            "ocr_pipeline": "OPERATIONAL",
            "verification_rails": "OPERATIONAL",
        },
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(
        "services.main:app",
        host=host,
        port=port,
        reload=False,
    )
