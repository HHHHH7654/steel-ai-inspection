"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "dashboard" | "detect" | "batch" | "history" | "models" | "camera" | "architecture";
type ReviewStatus = "待复核" | "已确认" | "误检" | "漏检";
type Source = "单图" | "批量" | "摄像头";
type BatchState = "待处理" | "处理中" | "成功" | "失败";

type Detection = { className: "Scratch"; confidence: number; x1: number; y1: number; x2: number; y2: number };
type RecordItem = {
  id: string;
  name: string;
  createdAt: string;
  createdAtIso: string;
  detections: Detection[];
  inferenceMs: number;
  threshold: number;
  reviewStatus: ReviewStatus;
  reviewRemark: string;
  reviewedAt: string | null;
  source: Source;
  modelName: string;
  modelVersion: string;
  mode: "mock";
};

type BatchItem = { id: string; name: string; state: BatchState; message: string };
type InferenceResponse = {
  record_id: string;
  name: string;
  created_at: string;
  model: { name: string; version: string };
  predictions: Array<{ class_name: "Scratch"; confidence: number; bbox: { x1: number; y1: number; x2: number; y2: number } }>;
  inference_ms: number;
  threshold: number;
  source: Source;
  mode: "mock";
};
type ServiceInfo = { service: string; version: string; mode: "mock"; max_upload_bytes: number; accepted_content_types: string[] };

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const STORAGE_KEY = "steelvision.records.v1";
const LEGACY_STORAGE_KEY = "steelvision-mock-records";
const MAX_LOCAL_RECORDS = 200;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: "dashboard", label: "工作台", icon: "▦" },
  { id: "detect", label: "单图检测", icon: "◇" },
  { id: "batch", label: "批量任务", icon: "▤" },
  { id: "history", label: "检测历史", icon: "◷" },
  { id: "models", label: "模型与版本", icon: "◈" },
  { id: "camera", label: "摄像头演示", icon: "◉" },
  { id: "architecture", label: "系统设计", icon: "⌘" },
];

const reviewStatuses: ReviewStatus[] = ["待复核", "已确认", "误检", "漏检"];

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function isValidBox(box: Detection) {
  return [box.x1, box.y1, box.x2, box.y2].every((value) => Number.isFinite(value) && value >= 0 && value <= 100) && box.x1 < box.x2 && box.y1 < box.y2;
}

function toRecord(payload: InferenceResponse): RecordItem {
  const detections = payload.predictions.map((prediction) => ({
    className: prediction.class_name,
    confidence: prediction.confidence,
    ...prediction.bbox,
  })).filter((item) => isValidBox(item) && item.confidence >= payload.threshold);

  return {
    id: payload.record_id,
    name: payload.name,
    createdAt: formatTime(payload.created_at),
    createdAtIso: payload.created_at,
    detections,
    inferenceMs: payload.inference_ms,
    threshold: payload.threshold,
    reviewStatus: "待复核",
    reviewRemark: "",
    reviewedAt: null,
    source: payload.source,
    modelName: payload.model.name,
    modelVersion: payload.model.version,
    mode: payload.mode,
  };
}

function hydrateRecord(value: unknown): RecordItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<RecordItem>;
  if (!raw.id || !raw.name || !raw.createdAt || !raw.source) return null;
  const detections = Array.isArray(raw.detections) ? raw.detections.filter((item): item is Detection => {
    if (!item || typeof item !== "object") return false;
    const box = item as Detection;
    return box.className === "Scratch" && typeof box.confidence === "number" && isValidBox(box);
  }) : [];
  return {
    id: String(raw.id),
    name: String(raw.name),
    createdAt: String(raw.createdAt),
    createdAtIso: typeof raw.createdAtIso === "string" ? raw.createdAtIso : String(raw.createdAt),
    detections,
    inferenceMs: typeof raw.inferenceMs === "number" ? raw.inferenceMs : 0,
    threshold: typeof raw.threshold === "number" ? raw.threshold : 0.5,
    reviewStatus: reviewStatuses.includes(raw.reviewStatus as ReviewStatus) ? raw.reviewStatus as ReviewStatus : "待复核",
    reviewRemark: typeof raw.reviewRemark === "string" ? raw.reviewRemark.slice(0, 200) : "",
    reviewedAt: typeof raw.reviewedAt === "string" ? raw.reviewedAt : null,
    source: ["单图", "批量", "摄像头"].includes(raw.source as Source) ? raw.source as Source : "单图",
    modelName: typeof raw.modelName === "string" ? raw.modelName : "scratch-detector",
    modelVersion: typeof raw.modelVersion === "string" ? raw.modelVersion : "mock-v0.1",
    mode: "mock",
  };
}

async function requestInference(file: File, threshold: number, source: Source): Promise<RecordItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("threshold", threshold.toFixed(2));
  formData.append("source", source);
  const response = await fetch(`${API_BASE_URL}/api/v1/inferences`, { method: "POST", body: formData });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string | Array<{ msg?: string }> } | null;
    const detail = Array.isArray(body?.detail) ? body?.detail[0]?.msg : body?.detail;
    throw new Error(typeof detail === "string" ? detail : "推理服务暂不可用，请稍后重试。");
  }
  const payload = await response.json() as InferenceResponse;
  if (!payload.record_id || !payload.model || !Array.isArray(payload.predictions) || payload.mode !== "mock") {
    throw new Error("后端返回的结果格式不完整，请检查服务版本。");
  }
  return toRecord(payload);
}

function SteelSurface({ imageUrl, record }: { imageUrl: string; record: RecordItem | null }) {
  return <div className="surface-stage">
    {imageUrl ? <img src={imageUrl} alt="上传的钢带原图" className="surface-image" /> : <div className="steel-placeholder" aria-label="钢带图像预览"><span /></div>}
    {record?.detections.map((detection, index) => <svg key={index} className="detection-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`划痕定位，置信度 ${(detection.confidence * 100).toFixed(1)}%`}>
      <rect x={detection.x1} y={detection.y1} width={detection.x2 - detection.x1} height={detection.y2 - detection.y1} />
      <text x={detection.x1} y={Math.max(4, detection.y1 - 3)}>Scratch {(detection.confidence * 100).toFixed(1)}%</text>
    </svg>)}
    {!imageUrl && <div className="surface-empty">{record ? "原图未保存在浏览器历史中；以下为该次检测结果。" : "上传图像后，Mock 推理结果将在此处叠加显示。"}</div>}
  </div>;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const style = status === "已确认" ? "confirmed" : status === "待复核" ? "pending" : "flagged";
  return <span className={`status ${style}`}>{status}</span>;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<View>("dashboard");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [result, setResult] = useState<RecordItem | null>(null);
  const [reviewRemark, setReviewRemark] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [notice, setNotice] = useState("");
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"全部" | ReviewStatus>("全部");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [backendOnline, setBackendOnline] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toastTimer = useRef<number | null>(null);

  const tell = useCallback((message: string) => {
    setNotice(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setNotice(""), 3600);
  }, []);

  const saveRecords = useCallback((next: RecordItem[]) => {
    const capped = next.slice(0, MAX_LOCAL_RECORDS);
    setRecords(capped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    } catch {
      tell("当前检测结果已显示，但浏览器本地空间不足，未能保存历史记录。");
    }
  }, [tell]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("steelvision_demo_account") !== "admin") {
      window.location.replace("/login");
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]";
      const parsed = JSON.parse(saved) as unknown[];
      const restored = Array.isArray(parsed) ? parsed.map(hydrateRecord).filter((item): item is RecordItem => item !== null).slice(0, MAX_LOCAL_RECORDS) : [];
      setRecords(restored);
      if (!localStorage.getItem(STORAGE_KEY) && restored.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    } catch {
      setRecords([]);
      tell("浏览器中的旧演示记录无法读取，已从空记录开始。");
    }
    setReady(true);
    return () => {
      stopCamera();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [stopCamera, tell]);

  useEffect(() => {
    if (active !== "camera") stopCamera();
  }, [active, stopCamera]);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const refreshBackendStatus = useCallback(async () => {
    try {
      const [healthResponse, infoResponse] = await Promise.all([fetch(`${API_BASE_URL}/health`), fetch(`${API_BASE_URL}/api/v1/system/info`)]);
      setBackendOnline(healthResponse.ok);
      setServiceInfo(infoResponse.ok ? await infoResponse.json() as ServiceInfo : null);
    } catch {
      setBackendOnline(false);
      setServiceInfo(null);
    }
  }, []);

  useEffect(() => { void refreshBackendStatus(); }, [refreshBackendStatus]);

  const useSelectedImage = (file: File) => {
    if (!/^image\/(jpeg|png)$/.test(file.type)) { tell("请选择 JPG、JPEG 或 PNG 图像。"); return; }
    if (file.size === 0) { tell("图片文件为空，请重新选择。"); return; }
    if (file.size > MAX_UPLOAD_BYTES) { tell("图片超过 10 MB，未提交。"); return; }
    setSelectedFile(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setReviewRemark("");
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) useSelectedImage(file);
    event.target.value = "";
  };

  const selectBatchImages = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    const files = incoming.slice(0, 20);
    const validFiles = files.filter((file) => /^image\/(jpeg|png)$/.test(file.type) && file.size > 0 && file.size <= MAX_UPLOAD_BYTES);
    if (incoming.length > 20) tell("单次最多检测 20 张图片，已保留前 20 张。");
    if (validFiles.length !== files.length) tell("已自动排除非 JPG/PNG、空文件或超过 10 MB 的文件。");
    setBatchFiles(validFiles);
    setBatchItems(validFiles.map((file, index) => ({ id: `${file.name}-${index}`, name: file.name, state: "待处理", message: "等待提交" })));
    event.target.value = "";
  };

  const runMock = async () => {
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const item = await requestInference(selectedFile, threshold, "单图");
      setResult(item);
      setReviewRemark("");
      saveRecords([item, ...records]);
      tell(`Mock 推理完成：${item.detections.length ? `检测到 ${item.detections.length} 处疑似划痕` : "未检出划痕"}。结果已保存，等待人工复核。`);
    } catch (error) {
      tell(error instanceof Error ? error.message : "无法连接后端推理服务，请先启动 backend 服务。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReview = (id: string, reviewStatus: ReviewStatus, remark?: string) => {
    const reviewedAt = new Date().toISOString();
    const next = records.map((item) => item.id === id ? {
      ...item,
      reviewStatus,
      reviewRemark: (remark ?? item.reviewRemark).trim().slice(0, 200),
      reviewedAt,
    } : item);
    saveRecords(next);
    const updated = next.find((item) => item.id === id) || null;
    if (result?.id === id && updated) {
      setResult(updated);
      setReviewRemark(updated.reviewRemark);
    }
    tell(reviewStatus === "已确认" ? "已确认该检测结果并保存复核说明。" : "复核结论已保存；该记录已进入困难样本候选统计。");
  };

  const createBatch = async () => {
    if (!batchFiles.length || isSubmitting) return;
    setIsSubmitting(true);
    const created: RecordItem[] = [];
    let failed = 0;
    for (let index = 0; index < batchFiles.length; index += 1) {
      const file = batchFiles[index];
      setBatchItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, state: "处理中", message: "正在提交与推理" } : item));
      try {
        const item = await requestInference(file, threshold, "批量");
        created.push(item);
        setBatchItems((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, state: "成功", message: `${item.detections.length} 个候选框 · ${item.inferenceMs} ms` } : entry));
      } catch (error) {
        failed += 1;
        setBatchItems((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, state: "失败", message: error instanceof Error ? error.message : "请求失败" } : entry));
      }
    }
    if (created.length) saveRecords([...created, ...records]);
    setIsSubmitting(false);
    if (created.length) {
      tell(failed ? `批量任务完成：成功 ${created.length} 张，失败 ${failed} 张。` : `批量任务完成：${created.length} 张图片已写入本地历史。`);
    } else {
      tell("批量任务未成功处理任何图片，请检查后端状态后重试。");
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("当前浏览器不支持摄像头访问，请改用本地图片上传。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setCameraMessage("");
    } catch {
      setCameraMessage("未获得摄像头权限。请在浏览器中授权后重试，或改用本地图片上传。");
    }
  };

  const captureCamera = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || isSubmitting) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const previewUrl = canvas.toDataURL("image/jpeg", 0.9);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { tell("当前画面无法转换为图片，请重试。"); return; }
    setIsSubmitting(true);
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const capturedFile = new File([blob], `camera-${stamp}.jpg`, { type: "image/jpeg" });
      const item = await requestInference(capturedFile, threshold, "摄像头");
      setSelectedFile(capturedFile);
      setImageUrl(previewUrl);
      setResult(item);
      setReviewRemark("");
      saveRecords([item, ...records]);
      stopCamera();
      setActive("detect");
      tell("已截取单帧并完成 Mock 推理，结果已转入单图检测页。");
    } catch (error) {
      tell(error instanceof Error ? error.message : "无法连接后端推理服务，请先启动 backend 服务。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRecord = (item: RecordItem) => {
    setSelectedFile(null);
    setImageUrl("");
    setResult(item);
    setReviewRemark(item.reviewRemark);
    setThreshold(item.threshold);
    setActive("detect");
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setRecords([]);
    setResult(null);
    setReviewRemark("");
    tell("本浏览器中的演示记录已清空，已不影响后端服务。");
  };

  const dashboardStats = useMemo(() => ({
    total: records.length,
    defects: records.filter((item) => item.detections.length).length,
    pending: records.filter((item) => item.reviewStatus === "待复核").length,
    hard: records.filter((item) => item.reviewStatus === "误检" || item.reviewStatus === "漏检").length,
  }), [records]);
  const history = records.filter((item) => (filter === "全部" || item.reviewStatus === filter) && item.name.toLowerCase().includes(query.toLowerCase()));
  const activeName = nav.find((item) => item.id === active)?.label || "工作台";
  const batchSummary = batchItems.reduce<Record<BatchState, number>>((summary, item) => ({ ...summary, [item.state]: summary[item.state] + 1 }), { 待处理: 0, 处理中: 0, 成功: 0, 失败: 0 });

  const dashboard = <>
    <section className="heading"><div><p className="eyebrow">AI QUALITY INSPECTION · MOCK INFERENCE</p><h1>质量追溯工作台</h1><p>面向现场演示的检测闭环：真实文件校验、稳定 Mock 推理、人工复核与本机可追溯记录。</p></div><button className="primary" onClick={() => setActive("detect")}>开始单图检测</button></section>
    <section className="metric-grid">
      <article><span>▦</span><p>检测图片总数</p><strong>{dashboardStats.total}</strong><small>本机演示记录</small></article>
      <article><span>◇</span><p>疑似划痕图片</p><strong>{dashboardStats.defects}</strong><small>Mock 结果，仅供演示</small></article>
      <article><span>◷</span><p>待人工复核</p><strong>{dashboardStats.pending}</strong><small>需要质检人员确认</small></article>
      <article><span>◎</span><p>困难样本候选</p><strong>{dashboardStats.hard}</strong><small>误检 / 漏检反馈</small></article>
    </section>
    <section className="two-column">
      <article className="panel"><div className="panel-title"><div><h2>检测闭环</h2><p>作品的核心演示路径</p></div></div><div className="flow"><b>上传图像</b><i>→</i><b>Mock 检测</b><i>→</i><b>人工复核</b><i>→</i><b>本机追溯</b></div><p className="muted">结果协议使用百分比坐标与模型版本字段；真实模型接入时可保持页面不重写。</p></article>
      <article className="panel"><div className="panel-title"><div><h2>当前推理后端</h2><p>FastAPI 文件校验与统一结果接口</p></div><span className={`status ${backendOnline ? "confirmed" : "pending"}`}>{backendOnline ? "已连接" : "待连接"}</span></div><dl className="facts"><div><dt>服务版本</dt><dd>{serviceInfo?.version || "等待后端"}</dd></div><div><dt>允许格式</dt><dd>{serviceInfo ? "JPG / JPEG / PNG" : "等待加载"}</dd></div><div><dt>最大文件</dt><dd>{serviceInfo ? `${Math.round(serviceInfo.max_upload_bytes / 1024 / 1024)} MB` : "—"}</dd></div></dl><button className="text-button" onClick={() => { void refreshBackendStatus(); }}>刷新后端状态 →</button></article>
    </section>
    <section className="panel"><div className="panel-title"><div><h2>最近检测记录</h2><p>模型版本、推理结果与人工反馈统一保存在当前浏览器</p></div><button className="text-button" onClick={() => setActive("history")}>查看全部 →</button></div>{records.length ? <RecordTable records={records.slice(0, 5)} onReview={updateReview} onOpen={openRecord} /> : <Empty text="还没有检测记录。上传一张本地图片即可开始演示。" />}</section>
  </>;

  const detect = <>
    <section className="heading"><div><p className="eyebrow">SINGLE IMAGE · MOCK INFERENCE</p><h1>单图划痕检测</h1><p>图片先在浏览器完成体验校验，再由后端验证类型、扩展名、空文件与大小。页面始终明确标识 Mock 模式。</p></div></section>
    <section className="detect-grid"><article className="panel upload-panel"><h2>上传热轧钢带图像</h2><p className="muted">支持 JPG / JPEG / PNG，最大 10 MB。服务端只在内存中读取和校验图片，不会保存原图。</p><label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) useSelectedImage(file); }}><input type="file" accept="image/png,image/jpeg" disabled={isSubmitting} onChange={selectImage} /><span>⇧</span><strong>{selectedFile?.name || "选择或拖入本地钢带图像"}</strong><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · 等待提交` : "点击选择文件；服务端不会保存图片"}</small></label><div className="slider-title"><span>置信度阈值</span><output>{threshold.toFixed(2)}</output></div><input className="slider" aria-label="置信度阈值" type="range" min="0.1" max="0.95" step="0.05" value={threshold} disabled={isSubmitting} onChange={(event) => setThreshold(Number(event.target.value))} /><button className="primary full" disabled={!selectedFile || isSubmitting || !backendOnline} onClick={runMock}>{isSubmitting ? "正在提交并推理…" : "提交图片并运行 Mock 推理"}</button>{!backendOnline && <p className="form-hint">后端未连接，请先启动 backend 服务。</p>}</article>
      <article className="panel result-panel"><div className="panel-title"><div><h2>检测结果</h2><p>{result ? `Mock 推理已完成 · ${result.createdAt}` : "等待上传图片"}</p></div>{result && <span className="status mock">Mock</span>}</div><SteelSurface imageUrl={imageUrl} record={result} />{result ? <><div className="result-facts"><div><span>检测目标</span><b>{result.detections.length ? `${result.detections.length} 处 Scratch` : "未检出划痕"}</b></div><div><span>模型版本</span><b>{result.modelVersion}</b></div><div><span>推理耗时</span><b>{result.inferenceMs} ms</b></div><div><span>复核状态</span><StatusBadge status={result.reviewStatus} /></div></div><div className="review"><strong>人工复核</strong><span>复核仅保存到当前浏览器，可在历史页查询、筛选与修订。</span><textarea aria-label="复核说明" maxLength={200} value={reviewRemark} onChange={(event) => setReviewRemark(event.target.value)} placeholder="可填写复核说明（最多 200 字）" /><small>{reviewRemark.length}/200 {result.reviewedAt ? `· 上次复核：${formatTime(result.reviewedAt)}` : ""}</small><div><button onClick={() => updateReview(result.id, "已确认", reviewRemark)}>确认检测</button><button onClick={() => updateReview(result.id, "误检", reviewRemark)}>标记误检</button><button onClick={() => updateReview(result.id, "漏检", reviewRemark)}>标记漏检</button><button className="quiet" onClick={() => updateReview(result.id, "待复核", reviewRemark)}>恢复待复核</button></div></div></> : null}</article></section>
  </>;

  const batch = <>
    <section className="heading"><div><p className="eyebrow">BATCH JOB · API VALIDATION</p><h1>批量检测任务</h1><p>单次最多 20 张，按文件顺序调用同一个推理接口。单项失败不会阻断后续图片，结果只保留在浏览器本机。</p></div></section>
    <section className="two-column"><article className="panel upload-panel"><h2>创建批量任务</h2><label className="dropzone"><input type="file" accept="image/png,image/jpeg" multiple disabled={isSubmitting} onChange={selectBatchImages} /><span>▤</span><strong>{batchFiles.length ? `已选择 ${batchFiles.length} 张有效图像` : "选择多张本地图像"}</strong><small>单次最多 20 张，单张不超过 10 MB</small></label><button className="primary full" disabled={!batchFiles.length || isSubmitting || !backendOnline} onClick={createBatch}>{isSubmitting ? "正在逐张校验与推理…" : "提交并运行批量 Mock 任务"}</button>{!backendOnline && <p className="form-hint">后端未连接，请先启动 backend 服务。</p>}</article><article className="panel"><div className="panel-title"><div><h2>任务队列状态</h2><p>同步、顺序执行的演示模式</p></div><span className="status mock">无持久化</span></div><div className="queue"><strong>{isSubmitting ? batchSummary.处理中 + batchSummary.待处理 : batchFiles.length}</strong><span>{isSubmitting ? "项尚未完成" : "项待处理"}</span></div><dl className="facts"><div><dt>已成功</dt><dd>{batchSummary.成功} 项</dd></div><div><dt>处理失败</dt><dd>{batchSummary.失败} 项</dd></div><div><dt>当前模型</dt><dd>scratch-detector / mock-v0.1</dd></div></dl></article></section>
    {batchItems.length ? <section className="panel batch-list"><div className="panel-title"><div><h2>逐项进度</h2><p>完成后可在检测历史中查询成功项。</p></div></div>{batchItems.map((item) => <div key={item.id} className="batch-row"><b>{item.name}</b><span className={`batch-state state-${item.state}`}>{item.state}</span><small>{item.message}</small></div>)}</section> : null}
  </>;

  const historyView = <>
    <section className="heading"><div><p className="eyebrow">TRACEABILITY · HUMAN IN THE LOOP</p><h1>检测历史与人工复核</h1><p>记录包含输入来源、模型版本、阈值、检测结果、复核状态与复核说明。原图不会被持久化保存。</p></div></section>
    <section className="panel"><div className="filter-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名" aria-label="搜索文件名" /><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="筛选复核状态"><option>全部</option>{reviewStatuses.map((status) => <option key={status}>{status}</option>)}</select><button className="quiet" onClick={() => tell("演示版不导出或上传记录；可直接在本浏览器中筛选和复核。")}>导出说明</button><button className="quiet danger" disabled={!records.length} onClick={clearHistory}>清空本机记录</button></div>{history.length ? <RecordTable records={history} onReview={updateReview} onOpen={openRecord} /> : <Empty text="没有符合条件的记录。" />}</section>
  </>;

  const models = <><section className="heading"><div><p className="eyebrow">MODEL REGISTRY · VERSION TRACEABILITY</p><h1>模型与版本</h1><p>业务页面面向统一推理协议；得到合法数据与训练成果后，只需替换后端服务层，不需要重写 Web 系统。</p></div></section><section className="model-roadmap"><div className="active"><b>MockInferenceBackend</b><small>当前可运行 · {serviceInfo?.version || "等待服务"}</small></div><i>→</i><div><b>PyTorchInferenceBackend</b><small>后续模型接入</small></div><i>→</i><div><b>ONNXInferenceBackend</b><small>后续推理优化</small></div><i>→</i><div><b>TensorRTInferenceBackend</b><small>实际硬件评估后接入</small></div></section><section className="two-column"><article className="panel"><h2>当前模型契约</h2><dl className="facts"><div><dt>名称</dt><dd>scratch-detector</dd></div><div><dt>版本</dt><dd>mock-v0.1</dd></div><div><dt>检测类别</dt><dd>Scratch</dd></div><div><dt>输出契约</dt><dd>class_name + confidence + bbox</dd></div></dl></article><article className="panel"><h2>当前运行边界</h2><p className="muted">当前服务不加载模型权重，不展示 mAP、Recall、FPS 或 GPU 指标。所有结果标记为 Mock，不能用于生产质量结论。</p><div className="note">真实模型接入必须保持接口字段、坐标语义和错误码兼容。</div></article></section></>;

  const architecture = <><section className="heading"><div><p className="eyebrow">SYSTEM DESIGN · IMPLEMENTATION BOUNDARY</p><h1>系统设计与实施状态</h1><p>已实现能力可现场演示，未实现能力明确标记为后续规划，避免混淆系统边界。</p></div><button className="primary" onClick={() => setActive("detect")}>体验检测链路</button></section><section className="architecture-flow"><div className="phase-card current"><span>01 · 当前已实现</span><b>浏览器交互</b><small>登录、单图、批量、摄像头截帧与人工复核</small></div><i>→</i><div className="phase-card current"><span>02 · 当前已实现</span><b>FastAPI 接口</b><small>文件校验、健康检查、服务信息与 Mock 推理</small></div><i>→</i><div className="phase-card current"><span>03 · 当前已实现</span><b>本地结果追溯</b><small>模型版本、阈值、预测结果、复核状态和说明</small></div><i>→</i><div className="phase-card planned"><span>04 · 后续接入</span><b>真实模型与持久化</b><small>数据授权、模型、数据库、对象存储与审计</small></div></section><section className="architecture-grid"><article className="panel"><h2>接口与数据边界</h2><div className="capability-list"><div><b>输入</b><span>JPG / JPEG / PNG，最大 {serviceInfo ? `${Math.round(serviceInfo.max_upload_bytes / 1024 / 1024)} MB` : "10 MB"}</span></div><div><b>传输</b><span>multipart/form-data：file、threshold、source</span></div><div><b>输出</b><span>模型信息、预测框、置信度、耗时、Mock 标记</span></div><div><b>留存</b><span>图片不保存；演示记录仅保存在当前浏览器</span></div></div></article><article className="panel"><h2>当前不包含的能力</h2><div className="capability-list muted-list"><div><b>数据层</b><span>无数据集、数据库、对象存储和训练权重</span></div><div><b>认证层</b><span>演示登录不等同于服务端账号或权限体系</span></div><div><b>实时链路</b><span>不做连续视频推理、WebSocket 推送或多摄像头调度</span></div><div><b>性能指标</b><span>不展示未验证的 FPS、mAP、Recall 或 GPU 指标</span></div></div></article></section><section className="two-column"><article className="panel"><div className="panel-title"><div><h2>演示顺序</h2><p>建议按下列路径完成现场讲解。</p></div></div><ol className="roadmap-list"><li>登录后确认后端连接状态。</li><li>上传图片并展示 Mock 检测框。</li><li>填写复核说明并标记确认、误检或漏检。</li><li>进入历史页筛选并修改复核结论。</li><li>展示批量处理或摄像头单帧检测。</li></ol></article><article className="panel"><div className="panel-title"><div><h2>后端连通性</h2><p>来自当前 FastAPI 服务的实际状态。</p></div><span className={`status ${backendOnline ? "confirmed" : "pending"}`}>{backendOnline ? "在线" : "待连接"}</span></div><dl className="facts"><div><dt>服务名称</dt><dd>{serviceInfo?.service || "steelvision-backend"}</dd></div><div><dt>运行模式</dt><dd>{serviceInfo?.mode || "mock"}</dd></div><div><dt>接口地址</dt><dd>/api/v1/inferences</dd></div></dl><button className="text-button" onClick={() => { void refreshBackendStatus(); }}>重新检查连接 →</button></article></section></>;

  const camera = <><section className="heading"><div><p className="eyebrow">CAMERA INPUT · FRAME CAPTURE</p><h1>摄像头演示</h1><p>浏览器只进行本地预览；只有点击“截取当前画面并检测”后才会将单帧 JPEG 提交到后端。</p></div></section><section className="camera-layout"><div className="camera-box"><video ref={videoRef} autoPlay muted playsInline className={cameraOn ? "visible" : ""} />{!cameraOn && <div className="camera-empty"><span>◉</span><b>启动摄像头后显示实时预览</b><small>首次使用请允许浏览器访问摄像头</small></div>}</div><article className="panel camera-controls"><h2>演示控制</h2><p className="muted">离开本页面或停止预览时，会立即释放浏览器摄像头。不会上传连续视频流。</p>{cameraMessage && <div className="warning">{cameraMessage}</div>}<button className="primary full" onClick={cameraOn ? stopCamera : startCamera}>{cameraOn ? "停止摄像头" : "启动摄像头"}</button><button className="quiet full" disabled={!cameraOn || isSubmitting || !backendOnline} onClick={captureCamera}>{isSubmitting ? "正在提交单帧…" : "截取当前画面并检测"}</button>{!backendOnline && <p className="form-hint">后端未连接，无法提交截帧。</p>}<ol><li>启动摄像头并预览画面</li><li>截取单帧图像</li><li>后端校验并返回 Mock 结果</li><li>转入单图页进行人工复核</li></ol></article></section></>;

  if (!ready) return <main className="loading">正在进入 SteelVision…</main>;
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span>SV</span><div><b>SteelVision</b><small>智能质检平台</small></div></div><nav>{nav.map((item) => <button key={item.id} className={active === item.id ? "nav-active" : ""} onClick={() => setActive(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav><div className="side-note">DEMO MODE<br /><small>真实文件校验 · Mock 推理</small></div></aside><section className="main"><header><div><span>质量追溯平台</span><b> / {activeName}</b></div><button className={`api-state ${backendOnline ? "" : "offline"}`} onClick={() => { void refreshBackendStatus(); }} title="重新检查后端连接">● {backendOnline ? "Mock Inference 在线" : "后端待连接"}</button><button className="signout" onClick={() => { stopCamera(); sessionStorage.removeItem("steelvision_demo_account"); window.location.assign("/login"); }}>退出</button></header><div className="content">{active === "dashboard" && dashboard}{active === "detect" && detect}{active === "batch" && batch}{active === "history" && historyView}{active === "models" && models}{active === "camera" && camera}{active === "architecture" && architecture}</div></section>{notice && <div className="toast" role="status">{notice}</div>}</main>;
}

function Empty({ text }: { text: string }) { return <div className="empty"><span>□</span><b>暂无数据</b><small>{text}</small></div>; }

function RecordTable({ records, onReview, onOpen }: { records: RecordItem[]; onReview: (id: string, status: ReviewStatus) => void; onOpen: (item: RecordItem) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>图像 / 来源</th><th>检测结论</th><th>模型版本</th><th>推理耗时</th><th>复核状态</th><th>操作</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.source} · {item.createdAt}{item.reviewRemark ? " · 含复核说明" : ""}</small></td><td>{item.detections.length ? <span className="defect">Scratch {(item.detections[0].confidence * 100).toFixed(1)}%</span> : <span className="normal">未检出划痕</span>}</td><td><code>{item.modelVersion}</code></td><td>{item.inferenceMs ? `${item.inferenceMs} ms` : "—"}</td><td><StatusBadge status={item.reviewStatus} /></td><td><div className="table-actions"><select value={item.reviewStatus} onChange={(event) => onReview(item.id, event.target.value as ReviewStatus)} aria-label="更新复核状态">{reviewStatuses.map((status) => <option key={status}>{status}</option>)}</select><button className="text-button" onClick={() => onOpen(item)}>查看</button></div></td></tr>)}</tbody></table></div>;
}
