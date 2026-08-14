# SteelVision：热轧钢带划痕检测与质量追溯平台

面向中国大学生计算机设计大赛的 Web 作品原型。作品聚焦“热轧钢带 + 表面划痕（Scratch）+ 目标检测定位”，展示智能质检从 AI 检测到人工复核、困难样本沉淀与结果追溯的完整闭环。

## 当前实现

- 演示登录：`admin` / `admin123`
- 单图上传：本地 JPG、JPEG、PNG 文件校验与原图预览
- Mock 推理：基于统一输出协议生成模拟 `class_name`、`confidence` 与 `bbox`，并以 SVG 定位框叠加显示
- 人工复核：确认检测、标记误检、标记漏检
- 质量追溯：保存模型版本、阈值、推理耗时、结果及复核状态
- 困难样本候选：误检和漏检自动纳入统计
- 批量任务、摄像头单帧演示、模型版本与后端演进说明

检测记录保存在浏览器本机存储中，仅用于现场演示。图片在推理时会提交给 FastAPI 后端完成校验，但后端不会保存图片内容。

## 重要边界

本版本**不下载数据集、不训练模型、不宣称模型精度或实时帧率**。所有检测结论都标记为 `Mock`，用于验证 Web 端交互、结果协议和质量追溯流程。后续接入真实模型时，保持以下返回结构即可，无需重写前端：

```json
{
  "model": { "name": "scratch-detector", "version": "v1" },
  "predictions": [
    {
      "class_name": "scratch",
      "confidence": 0.0,
      "bbox": { "x1": 0, "y1": 0, "x2": 0, "y2": 0 }
    }
  ]
}
```

推荐后端演进路径：`MockInferenceBackend → PyTorchInferenceBackend → ONNXInferenceBackend → TensorRTInferenceBackend`。

## 本地运行

需要 Node.js 22 或更高版本。先在项目根目录启动 `backend`，前端默认连接 `http://127.0.0.1:8000`；后端地址可通过 `.env.local` 中的 `NEXT_PUBLIC_API_BASE_URL` 修改。

```bash
npm.cmd install
npm.cmd run dev
```

构建和测试：

```bash
npm.cmd run build
npm.cmd test
```

## 后续接入清单

1. 使用 FastAPI 实现 `/api/v1/inferences`，在服务端完成文件类型、大小、像素数、权限和频率校验。
2. 将本机存储替换为 PostgreSQL / 对象存储，记录 `image_id`、`model_version`、`dataset_version` 与 `review_status`。
3. 将批量任务接入 Redis + Celery，队列只传递图像引用而非图像二进制。
4. 在真实训练前建立数据来源、许可证、标注规范和训练/验证/测试集划分说明。
