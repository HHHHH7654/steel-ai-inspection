# SteelVision：热轧钢带划痕检测与质量追溯平台

本项目按前后端分离方式组织，参考 [织慧通 SaaS 项目](https://github.com/supermlk500-del/saas) 的 `frontend`、`backend`、`docs` 分层。

```text
steel-scratch-web/
├── frontend/       # Next.js 前端：上传、结果展示、人工复核
├── backend/        # FastAPI 后端：统一 Mock 推理接口
├── docs/           # 架构、接口、启动与参考资料
└── data/           # 数据预留目录（当前不放置数据集）
```

## 本地启动

先分别安装前后端依赖：

```powershell
cd backend
py -m pip install -r requirements.txt

cd ..\frontend
npm.cmd install
```

打开两个 PowerShell 窗口运行：

```powershell
# 窗口 1：后端（http://127.0.0.1:8000）
cd backend
py -m uvicorn app.main:app --reload --port 8000
```

```powershell
# 窗口 2：前端（终端会显示实际访问地址）
cd frontend
npm.cmd run dev
```

演示账号：`admin` / `admin123`。完整说明见 [docs/02-快速启动.md](docs/02-快速启动.md)。

## 当前边界

后端当前会接收 JPG/JPEG/PNG 文件，进行格式、扩展名和 10 MB 大小校验后返回可复现的 Mock 检测结果。图片不会写入磁盘或数据库；不下载数据集、不训练模型，也不保存业务数据。后续可用真实模型实现替换 `backend/app/services/inference.py`，保持接口契约不变。
