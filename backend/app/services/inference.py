from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.inference import (
    BoundingBox,
    InferenceRequest,
    InferenceResponse,
    ModelInfo,
    Prediction,
)


def run_mock_inference(request: InferenceRequest) -> InferenceResponse:
    """Return deterministic placeholder output until a real model is connected."""
    normalized_name = request.name.lower()
    no_defect = any(token in normalized_name for token in ("normal", "good", "ok", "无划痕", "正常"))
    seed = sum(ord(character) for character in request.name)
    confidence = max(request.threshold + 0.04, min(0.97, 0.72 + (seed % 22) / 100))
    predictions = [] if no_defect else [
        Prediction(
            class_name="Scratch",
            confidence=confidence,
            bbox=BoundingBox(x1=20 + seed % 15, y1=33, x2=78, y2=55 + seed % 9),
        )
    ]
    return InferenceResponse(
        record_id=str(uuid4()),
        name=request.name,
        created_at=datetime.now(timezone.utc).isoformat(),
        model=ModelInfo(name="scratch-detector", version="mock-v0.1"),
        predictions=predictions,
        inference_ms=120 + seed % 170,
        threshold=request.threshold,
        source=request.source,
        mode="mock",
    )
