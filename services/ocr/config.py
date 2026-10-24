import os
from pydantic_settings import BaseSettings
from pydantic import Field

class OCRSettings(BaseSettings):
    """
    Configuration settings for Member 2 OCR & Classification Microservice.
    """
    PORT: int = Field(default=8002, env="PORT")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    UPLOAD_DIR: str = Field(default="temp_uploads", env="UPLOAD_DIR")
    MAX_PAGE_COUNT: int = Field(default=100, env="MAX_PAGE_COUNT")
    USE_PADDLEOCR: bool = Field(default=True, env="USE_PADDLEOCR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = OCRSettings()
