from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas.inference import InferenceRequest, InferenceResponse, ServiceInfo
from app.services.inference import run_mock_inference

router = APIRouter(tags=["inferences"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_SUFFIXES = (".jpg", ".jpeg", ".png")


@router.post("/inferences", response_model=InferenceResponse)
async def create_inference(
    file: Annotated[UploadFile, File(description="JPG or PNG image, maximum 10 MB")],
    threshold: Annotated[float, Form(ge=0.1, le=0.95)],
    source: Annotated[str, Form()],
) -> InferenceResponse:
    filename = file.filename or "upload.jpg"
    if file.content_type not in ALLOWED_CONTENT_TYPES or not filename.lower().endswith(ALLOWED_SUFFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="仅支持 JPG、JPEG 或 PNG 格式的图片。",
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="上传文件不能为空。")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="图片不能超过 10 MB。")

    try:
        request = InferenceRequest(
            name=filename,
            threshold=threshold,
            source=source,
            mime_type=file.content_type,
            size_bytes=len(content),
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请求参数不合法。") from error
    finally:
        await file.close()

    return run_mock_inference(request)


@router.get("/system/info", response_model=ServiceInfo)
def get_service_info() -> ServiceInfo:
    return ServiceInfo(
        service="steelvision-backend",
        version="0.2.0",
        mode="mock",
        max_upload_bytes=MAX_UPLOAD_BYTES,
        accepted_content_types=sorted(ALLOWED_CONTENT_TYPES),
    )
