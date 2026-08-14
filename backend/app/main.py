from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.inferences import router as inference_router

app = FastAPI(
    title="SteelVision API",
    version="0.2.0",
    description="热轧钢带划痕检测演示接口。当前只做文件校验与 Mock 推理，不保存图片或业务数据。",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "steelvision-backend", "mode": "mock"}


app.include_router(inference_router, prefix="/api/v1")
