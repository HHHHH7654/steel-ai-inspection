from typing import Literal

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float = Field(ge=0, le=100)
    y1: float = Field(ge=0, le=100)
    x2: float = Field(ge=0, le=100)
    y2: float = Field(ge=0, le=100)


class Prediction(BaseModel):
    class_name: Literal["Scratch"]
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox


class ModelInfo(BaseModel):
    name: str
    version: str


class InferenceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    threshold: float = Field(ge=0.1, le=0.95)
    source: Literal["单图", "批量", "摄像头"]
    mime_type: str
    size_bytes: int = Field(ge=1)


class InferenceResponse(BaseModel):
    record_id: str
    name: str
    created_at: str
    model: ModelInfo
    predictions: list[Prediction]
    inference_ms: int
    threshold: float
    source: Literal["单图", "批量", "摄像头"]
    mode: Literal["mock"]


class ServiceInfo(BaseModel):
    service: str
    version: str
    mode: Literal["mock"]
    max_upload_bytes: int
    accepted_content_types: list[str]
