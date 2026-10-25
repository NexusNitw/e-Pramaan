import os
from pydantic_settings import BaseSettings
from pydantic import Field


class VerificationSettings(BaseSettings):
    """
    Configuration settings for Member 5 Verification Rails & PKI Microservice.
    """
    PORT: int = Field(default=8003, env="PORT")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    DIGILOCKER_API_MOCK: bool = Field(default=True, env="DIGILOCKER_API_MOCK")
    UNIVERSITY_REGISTRY_MOCK: bool = Field(default=True, env="UNIVERSITY_REGISTRY_MOCK")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = VerificationSettings()
