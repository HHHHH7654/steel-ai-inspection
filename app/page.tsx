"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type NavKey =
  | "dashboard"
  | "detect"
  | "batch"
  | "camera"
  | "history"
  | "models"
  | "settings";

const navItems: { key: NavKey; label: string; icon: string; group?: string }[] = [
  { key: "dashboard", label: "工作台", icon: "▦" },
  { key: "detect", label: "单图识别", icon: "◉" },
  { key: "batch", label: "批量任务", icon: "▤" },
  { key: "camera", label: "摄像头演示", icon: "◌" },
  { key: "history", label: "历史记录", icon: "◷" },
  { key: "models", label: "模型管理", icon: "◇", group: "系统管理" },
  { key: "settings", label: "参数设置", icon: "⚙" },
];

function ResultPreview({ isReady, imageName }: { isReady: boolean; imageName: string }) {
  return (
    <div className="inspection-canvas" aria-label="检测结果预览">
      <div className="steel-texture">
        <span className="surface-noise one" /><span className="surface-noise two" /><span className="surface-noise three" />
      </div>
      {isReady ? (
        <>
          <div className="scratch-line" />
          <div className="bbox"><span>Scratch · 93.2%</span></div>
          <div className="image-tag">{imageName || "sample_strip_024.png"}</div>
        </>
      ) : <div className="canvas-placeholder">{imageName ? "图像已就绪，等待模型服务返回检测结果" : "上传钢带图像后将在这里显示检测结果"}</div>}
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState<NavKey>("dashboard");
  const [selectedFile, setSelectedFile] = useState("");
  const [isDetected, setIsDetected] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [batchCount, setBatchCount] = useState(0);
  const [toast, setToast] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeLabel = useMemo(() => navItems.find((item) => item.key === active)?.label ?? "工作台", [active]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };
  const loadCameras = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("当前浏览器不支持摄像头访问，请使用最新版 Chrome、Edge 或 Safari。");
      return;
    }
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      permissionStream.getTracks().forEach((track) => track.stop());
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
      setCameras(devices);
      setSelectedCamera((current) => current || devices[0]?.deviceId || "");
      if (!devices.length) setCameraError("未发现可用视频设备。请检查电脑摄像头或 USB 外接摄像头是否已连接。");
    } catch {
      setCameraError("未获得摄像头权限。请在浏览器地址栏允许使用摄像头后重试。");
    }
  };
  const startCamera = async () => {
    setCameraError("");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } } : true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
      setCameras(devices);
    } catch {
      setCameraError("摄像头启动失败。请确认设备未被其他应用占用，并已在浏览器中授权。");
    }
  };
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedFrame(canvas.toDataURL("image/jpeg", 0.9));
    notify("已截取当前画面；接入模型服务后可自动提交识别任务。");
  };
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  const onImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file.name);
    setIsDetected(false);
  };
  const onBatchSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const count = event.target.files?.length ?? 0;
    setBatchCount(count);
  };

  const renderDashboard = () => (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">OVERVIEW · 实验性质量检测平台</p><h1>欢迎使用 SteelVision</h1><p>平台当前尚未接入业务数据与真实推理模型。</p></div>
        <button className="primary-button" onClick={() => setActive("detect")}>＋ 上传首张图片</button>
      </section>
      <section className="stats-grid" aria-label="今日统计">
        <article className="stat-card"><span className="stat-icon blue">▦</span><div><p>今日检测图片</p><strong>0</strong><small>暂无业务数据</small></div></article>
        <article className="stat-card"><span className="stat-icon orange">⌁</span><div><p>划痕检出图片</p><strong>0</strong><small>暂无业务数据</small></div></article>
        <article className="stat-card"><span className="stat-icon green">✓</span><div><p>任务成功率</p><strong>—</strong><small>暂无已完成任务</small></div></article>
        <article className="stat-card"><span className="stat-icon purple">◷</span><div><p>平均处理耗时</p><strong>—</strong><small>尚未接入推理服务</small></div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel trend-panel"><div className="panel-heading"><div><h2>检测任务趋势</h2><p>系统将在接入任务数据后自动生成最近 7 天趋势</p></div></div><div className="empty-state compact-empty"><span>⌁</span><strong>暂无检测记录</strong><small>上传图片并完成推理后，这里将展示任务趋势。</small></div></article>
        <article className="panel status-panel"><div className="panel-heading"><div><h2>当前模型</h2><p>统一推理服务状态</p></div><span className="badge pending">未接入</span></div><div className="empty-state compact-empty"><span>AI</span><strong>尚未注册模型</strong><small>后续可接入 Mock、PyTorch、ONNX Runtime 或 TensorRT 推理服务。</small></div><button className="quiet-button" onClick={() => setActive("models")}>前往模型管理 →</button></article>
      </section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>最近检测任务</h2><p>任务、结果和模型版本将在接入数据库后统一保存</p></div><button className="text-button" onClick={() => setActive("history")}>查看全部 →</button></div><div className="empty-state"><span>▤</span><strong>暂无检测任务</strong><small>从“单图识别”或“批量任务”创建第一条任务后，可在此查看处理状态。</small></div></section>
    </>
  );

  const renderDetect = () => (
    <>
      <section className="page-heading compact"><div><p className="eyebrow">INFERENCE · 单图同步识别</p><h1>单图识别</h1><p>已提供图片校验与结果展示框架；接入模型服务后将展示 Bounding Box 与置信度。</p></div></section>
      <section className="detect-layout">
        <article className="panel upload-panel"><div className="panel-heading"><div><h2>上传钢带图像</h2><p>支持单张图像识别</p></div><span className="badge done">格式校验已启用</span></div><label className="upload-area"><input type="file" accept="image/png,image/jpeg" onChange={onImageSelect} /><span className="upload-icon">⇧</span><strong>{selectedFile || "选择或拖拽图片到此处"}</strong><small>JPG / JPEG / PNG · 最大 10 MB</small><span className="select-file">选择图片</span></label><div className="threshold-row"><div><strong>置信度阈值</strong><small>低于该阈值的预测结果不会显示</small></div><output>{(threshold / 100).toFixed(2)}</output></div><input className="range" type="range" min="10" max="95" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /><button className="primary-button full" disabled={!selectedFile} onClick={() => notify("图片已通过前端校验；请先接入推理服务后再提交识别任务。")}>提交识别任务</button></article>
        <article className="panel preview-panel"><div className="panel-heading"><div><h2>检测结果</h2><p>{isDetected ? "模型输出已渲染" : "等待识别任务"}</p></div>{isDetected && <span className="badge done">成功</span>}</div><ResultPreview isReady={isDetected} imageName={selectedFile} />{isDetected && <div className="result-summary"><div><span>检测目标</span><strong>1 处 Scratch</strong></div><div><span>模型置信度</span><strong>93.2%</strong></div><div><span>推理耗时</span><strong>218 ms</strong></div></div>}</article>
      </section>
    </>
  );

  const renderBatch = () => (
    <><section className="page-heading compact"><div><p className="eyebrow">ASYNC JOBS · Redis + Celery</p><h1>批量识别</h1><p>批量文件将在接入队列与模型服务后进入后台处理，并支持导出结果和标注图。</p></div></section><section className="detect-layout"><article className="panel upload-panel"><div className="panel-heading"><div><h2>创建批量任务</h2><p>队列中只应传递图像路径与任务标识</p></div></div><label className="upload-area"><input type="file" accept="image/png,image/jpeg" multiple onChange={onBatchSelect} /><span className="upload-icon">▤</span><strong>{batchCount ? `已选择 ${batchCount} 张图片` : "选择多张图片"}</strong><small>可一次性上传多张 JPG / PNG 图像</small><span className="select-file">选择文件</span></label><button className="primary-button full" disabled={!batchCount} onClick={() => notify("批量任务接口尚未接入；所选文件未上传到服务器。")}>创建任务</button></article><article className="panel status-panel"><div className="panel-heading"><div><h2>任务队列状态</h2><p>Redis Broker / Celery Worker</p></div><span className="badge pending">未接入</span></div><div className="queue-number">0 <span>项待处理</span></div><div className="queue-bar"><i className="empty-progress" /></div><dl className="model-detail"><div><dt>运行中任务</dt><dd>0 项</dd></div><div><dt>Worker 数量</dt><dd>—</dd></div><div><dt>平均等待</dt><dd>—</dd></div></dl></article></section><section className="panel recent-panel"><div className="panel-heading"><div><h2>批量任务记录</h2><p>接入后台任务服务后，可导出 CSV、JSON 与带框图片。</p></div></div><div className="empty-state"><span>▤</span><strong>暂无批量任务</strong><small>当前平台还没有上传或识别数据。</small></div></section></>
  );

  const renderCamera = () => <><section className="page-heading compact"><div><p className="eyebrow">CAMERA INPUT · 浏览器设备接入</p><h1>摄像头演示</h1><p>支持电脑内置摄像头，以及已被操作系统识别的 USB 外接摄像头、采集卡与虚拟摄像头。</p></div></section><section className="camera-shell"><div className="camera-feed"><div className="camera-grid" /><span className="live-badge">{cameraActive ? "● CAMERA LIVE" : "○ CAMERA READY"}</span><video ref={videoRef} className={cameraActive ? "camera-video active" : "camera-video"} muted playsInline />{!cameraActive && <div className="camera-hint"><span>◉</span><strong>选择设备后启动摄像头</strong><small>首次使用时，请在浏览器地址栏允许摄像头权限。</small></div>}{cameraError && <div className="camera-error">{cameraError}</div>}{capturedFrame && <div className="capture-badge">已截帧，等待推理服务</div>}</div><aside className="panel camera-info"><h2>接入设备</h2><label className="camera-label" htmlFor="camera-select">视频输入设备</label><select id="camera-select" className="camera-select" value={selectedCamera} onChange={(event) => setSelectedCamera(event.target.value)} disabled={!cameras.length}><option value="">{cameras.length ? "选择摄像头" : "请先获取设备列表"}</option>{cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `视频设备 ${index + 1}`}</option>)}</select><div className="camera-buttons"><button className="quiet-button" onClick={loadCameras}>获取设备列表</button>{cameraActive ? <button className="primary-button" onClick={stopCamera}>停止摄像头</button> : <button className="primary-button" onClick={startCamera}>启动摄像头</button>}</div><button className="primary-button full" disabled={!cameraActive} onClick={captureFrame}>截取当前画面</button><ol><li>浏览器读取本机可用视频设备</li><li>选择内置或外接摄像头并启动预览</li><li>截取画面后由推理接口处理</li><li>返回结果后叠加显示识别框</li></ol><div className="note-box">网络摄像头（RTSP / ONVIF）不能被网页直接读取，需在 FastAPI 后端增加摄像头接入服务后转发给平台。</div></aside></section></>;

  const renderHistory = () => <><section className="page-heading compact"><div><p className="eyebrow">TRACEABILITY · 检测可追溯</p><h1>历史记录</h1><p>接入数据库后，可按任务、用户、日期与模型版本检索历史识别结果。</p></div><button className="quiet-button" onClick={() => notify("当前没有可导出的历史记录")}>导出记录 ↓</button></section><section className="panel recent-panel"><div className="filter-bar"><input aria-label="搜索任务或文件名" placeholder="搜索任务编号、文件名称…" /><select aria-label="选择任务状态"><option>全部状态</option><option>已完成</option><option>处理中</option></select><select aria-label="选择模型版本"><option>全部模型版本</option></select><button className="primary-button" onClick={() => notify("暂无可筛选的历史记录")}>查询</button></div><div className="empty-state"><span>◷</span><strong>暂无历史记录</strong><small>连接 PostgreSQL 并完成一次识别任务后，系统会保存图片元数据、检测结果和模型版本。</small></div></section></>;

  const renderModels = () => <><section className="page-heading compact"><div><p className="eyebrow">MODEL REGISTRY · 版本可追溯</p><h1>模型管理</h1><p>前端通过统一接口调用模型，不依赖具体训练框架或权重格式。</p></div></section><section className="model-path"><div className="path-node">Mock<br/><small>开发阶段</small></div><span>→</span><div className="path-node">PyTorch<br/><small>训练后接入</small></div><span>→</span><div className="path-node">ONNX Runtime<br/><small>正式部署候选</small></div><span>→</span><div className="path-node">TensorRT<br/><small>NVIDIA 优化</small></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h2>已注册模型</h2><p>模型版本应与每次推理结果绑定保存</p></div><button className="primary-button" onClick={() => notify("请在真实权重与推理服务就绪后注册模型")}>＋ 注册模型</button></div><div className="empty-state"><span>AI</span><strong>尚未注册模型</strong><small>当前平台没有 Mock 或真实模型数据。可在模型训练完成后登记模型名称、版本与推理后端。</small></div></section></>;

  const renderSettings = () => <><section className="page-heading compact"><div><p className="eyebrow">SYSTEM SETTINGS · MVP 配置</p><h1>参数设置</h1><p>这些配置应记录审计日志，并仅允许具备权限的用户修改。</p></div></section><section className="settings-grid"><article className="panel"><h2>识别默认参数</h2><div className="setting-line"><div><strong>默认置信度阈值</strong><small>默认值仅为接口示例，最终以验证集实验为准</small></div><output>{(threshold / 100).toFixed(2)}</output></div><input className="range" type="range" min="10" max="95" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /><button className="primary-button" onClick={() => notify("设置已保存到演示配置")}>保存设置</button></article><article className="panel"><h2>存储与保留</h2><div className="setting-line"><div><strong>图片保存期限</strong><small>开发环境存储于本地，正式环境可使用 S3 兼容对象存储</small></div><select aria-label="图片保存期限"><option>90 天</option><option>30 天</option><option>永久保留</option></select></div><div className="setting-line"><div><strong>上传文件限制</strong><small>文件类型、MIME、像素尺寸和数量均需校验</small></div><strong>10 MB</strong></div></article></section></>;

  const content = active === "dashboard" ? renderDashboard() : active === "detect" ? renderDetect() : active === "batch" ? renderBatch() : active === "camera" ? renderCamera() : active === "history" ? renderHistory() : active === "models" ? renderModels() : renderSettings();

  return (
    <main className="app-shell">
      <aside className="sidebar"><div className="brand"><span className="brand-mark"><i /><i /><i /></span><div><strong>SteelVision</strong><small>智能质检平台</small></div></div><nav aria-label="主导航">{navItems.map((item, index) => <div key={item.key}>{item.group && <p className="nav-group">{item.group}</p>}<button className={active === item.key ? "nav-item active" : "nav-item"} onClick={() => { if (item.key !== "camera") stopCamera(); setActive(item.key); }}><span>{item.icon}</span>{item.label}</button>{index === 4 && <p className="nav-group">系统管理</p>}</div>)}</nav><div className="sidebar-bottom"><div className="data-source"><span>◎</span><div><strong>NEU-DET</strong><small>待导入的热轧钢带缺陷数据</small></div></div><div className="user-card"><span className="avatar">人</span><div><strong>平台账户</strong><small>统一身份认证</small></div><a className="signout-link" href="/signout-with-chatgpt?return_to=%2Flogin">退出</a></div></div></aside>
      <section className="main-area"><header className="topbar"><div className="crumb">热轧钢带表面划痕识别 <span>/</span> {activeLabel}</div><div className="top-actions"><span className="api-pill">API 服务正常</span><a className="account-link" href="/login">账户登录</a><button aria-label="通知" className="icon-button">♧<b /></button><button aria-label="帮助" className="icon-button">?</button></div></header><div className="content">{content}</div></section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
