import os
from pydantic_settings import BaseSettings
from pydantic import Field

class ForensicsSettings(BaseSettings):
    """
    Configuration settings for Member 1 Document Forensics & Tampering Microservice.
    """
    PORT: int = Field(default=8001, env="PORT")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    ELA_RESAVE_QUALITY: int = Field(default=90, env="ELA_RESAVE_QUALITY")
    ELA_SCALE_FACTOR: int = Field(default=15, env="ELA_SCALE_FACTOR")
    ELA_ANOMALY_THRESHOLD: float = Field(default=35.0, env="ELA_ANOMALY_THRESHOLD")
    TEMP_DIR: str = Field(default="temp_forensics", env="TEMP_DIR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = ForensicsSettings()
