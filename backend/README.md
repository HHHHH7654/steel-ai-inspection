# SteelVision 后端

FastAPI 服务，当前接收 JPG/JPEG/PNG 图片，执行文件类型和大小校验后返回 Mock 推理结果。图片不会写入磁盘或数据库。

```powershell
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
```

健康检查：`GET /health`。服务信息：`GET /api/v1/system/info`。接口文档：`http://127.0.0.1:8000/docs`。
