"use client";

import { ChangeEvent, useMemo, useState } from "react";

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

const recentTasks = [
  { id: "DET-20260808-024", name: "strip_024.png", time: "09:18", status: "已完成", result: "检出 1 处划痕" },
  { id: "DET-20260808-023", name: "strip_023.png", time: "09:12", status: "已完成", result: "未检出划痕" },
  { id: "DET-20260808-022", name: "strip_022.png", time: "09:06", status: "已完成", result: "检出 2 处划痕" },
  { id: "DET-20260808-021", name: "batch_0810.zip", time: "08:54", status: "处理中", result: "68 / 120 张" },
];

function TrendChart() {
  const values = [35, 48, 42, 64, 56, 78, 68];
  const points = values
    .map((value, index) => `${18 + index * 45},${105 - value}`)
    .join(" ");
  return (
    <div className="chart-wrap">
      <div className="chart-scale"><span>80</span><span>40</span><span>0</span></div>
      <svg className="trend-chart" viewBox="0 0 300 120" role="img" aria-label="最近七天检测任务趋势">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1e789b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1e789b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M18 105 H288 M18 65 H288 M18 25 H288" className="grid-line" />
        <path d={`M18 105 L${points} L288 105 Z`} fill="url(#chartFill)" />
        <polyline points={points} className="trend-line" />
        {values.map((value, index) => <circle key={index} cx={18 + index * 45} cy={105 - value} r="3.5" className="trend-dot" />)}
      </svg>
      <div className="chart-days"><span>周六</span><span>周日</span><span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>今天</span></div>
    </div>
  );
}

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
      ) : <div className="canvas-placeholder">上传钢带图像后将在这里显示检测结果</div>}
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

  const activeLabel = useMemo(() => navItems.find((item) => item.key === active)?.label ?? "工作台", [active]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
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
        <div><p className="eyebrow">OVERVIEW · 实验性质量检测平台</p><h1>早上好，李工</h1><p>今日的热轧钢带划痕检测任务正在稳定运行。</p></div>
        <button className="primary-button" onClick={() => setActive("detect")}>＋ 发起单图识别</button>
      </section>
      <section className="stats-grid" aria-label="今日统计">
        <article className="stat-card"><span className="stat-icon blue">▦</span><div><p>今日检测图片</p><strong>286</strong><small>较昨日 <b>+18.6%</b></small></div></article>
        <article className="stat-card"><span className="stat-icon orange">⌁</span><div><p>划痕检出图片</p><strong>39</strong><small>检出率 <b>13.6%</b></small></div></article>
        <article className="stat-card"><span className="stat-icon green">✓</span><div><p>任务成功率</p><strong>99.3%</strong><small>284 个任务已完成</small></div></article>
        <article className="stat-card"><span className="stat-icon purple">◷</span><div><p>平均处理耗时</p><strong>218 <em>ms</em></strong><small>ONNX Runtime · GPU</small></div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel trend-panel"><div className="panel-heading"><div><h2>检测任务趋势</h2><p>最近 7 天成功提交的识别任务</p></div><button className="text-button">最近 7 天⌄</button></div><TrendChart /></article>
        <article className="panel status-panel"><div className="panel-heading"><div><h2>当前模型</h2><p>统一推理服务状态</p></div><span className="online-dot">在线</span></div><div className="model-chip"><span className="model-mark">AI</span><div><strong>scratch-detector</strong><small>scratch-detector-onnx-v0.1</small></div><span className="status-ready">可用</span></div><dl className="model-detail"><div><dt>推理后端</dt><dd>ONNX Runtime</dd></div><div><dt>置信度阈值</dt><dd>{(threshold / 100).toFixed(2)}</dd></div><div><dt>最近加载</dt><dd>今天 08:30</dd></div></dl><button className="quiet-button" onClick={() => setActive("models")}>查看模型详情 →</button></article>
      </section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>最近检测任务</h2><p>所有数据均来自系统任务记录</p></div><button className="text-button" onClick={() => setActive("history")}>查看全部 →</button></div><div className="table-scroll"><table><thead><tr><th>任务编号</th><th>文件名称</th><th>提交时间</th><th>任务状态</th><th>识别结果</th><th /></tr></thead><tbody>{recentTasks.map((task) => <tr key={task.id}><td className="mono">{task.id}</td><td>{task.name}</td><td>{task.time}</td><td><span className={task.status === "处理中" ? "badge pending" : "badge done"}>{task.status}</span></td><td>{task.result}</td><td><button className="row-action" onClick={() => { setActive("detect"); setIsDetected(true); }}>查看</button></td></tr>)}</tbody></table></div></section>
    </>
  );

  const renderDetect = () => (
    <>
      <section className="page-heading compact"><div><p className="eyebrow">INFERENCE · 单图同步识别</p><h1>单图识别</h1><p>上传 JPG、JPEG 或 PNG 图像，调用统一推理接口并展示 Bounding Box 与置信度。</p></div></section>
      <section className="detect-layout">
        <article className="panel upload-panel"><div className="panel-heading"><div><h2>上传钢带图像</h2><p>支持单张图像识别</p></div><span className="badge done">格式校验已启用</span></div><label className="upload-area"><input type="file" accept="image/png,image/jpeg" onChange={onImageSelect} /><span className="upload-icon">⇧</span><strong>{selectedFile || "选择或拖拽图片到此处"}</strong><small>JPG / JPEG / PNG · 最大 10 MB</small><span className="select-file">选择图片</span></label><div className="threshold-row"><div><strong>置信度阈值</strong><small>低于该阈值的预测结果不会显示</small></div><output>{(threshold / 100).toFixed(2)}</output></div><input className="range" type="range" min="10" max="95" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /><button className="primary-button full" disabled={!selectedFile} onClick={() => { setIsDetected(true); notify("Mock 推理完成，结果已写入演示记录"); }}>开始识别</button></article>
        <article className="panel preview-panel"><div className="panel-heading"><div><h2>检测结果</h2><p>{isDetected ? "模型输出已渲染" : "等待识别任务"}</p></div>{isDetected && <span className="badge done">成功</span>}</div><ResultPreview isReady={isDetected} imageName={selectedFile} />{isDetected && <div className="result-summary"><div><span>检测目标</span><strong>1 处 Scratch</strong></div><div><span>模型置信度</span><strong>93.2%</strong></div><div><span>推理耗时</span><strong>218 ms</strong></div></div>}</article>
      </section>
    </>
  );

  const renderBatch = () => (
    <><section className="page-heading compact"><div><p className="eyebrow">ASYNC JOBS · Redis + Celery</p><h1>批量识别</h1><p>批量文件将进入任务队列，完成后可查询进度、导出结果和查看标注图。</p></div></section><section className="detect-layout"><article className="panel upload-panel"><div className="panel-heading"><div><h2>创建批量任务</h2><p>队列中仅传递图像路径与任务标识</p></div></div><label className="upload-area"><input type="file" accept="image/png,image/jpeg" multiple onChange={onBatchSelect} /><span className="upload-icon">▤</span><strong>{batchCount ? `已选择 ${batchCount} 张图片` : "选择多张图片"}</strong><small>可一次性上传多张 JPG / PNG 图像</small><span className="select-file">选择文件</span></label><button className="primary-button full" disabled={!batchCount} onClick={() => notify(`已创建批量任务，${batchCount} 张图片正在排队处理`)}>创建任务</button></article><article className="panel status-panel"><div className="panel-heading"><div><h2>任务队列状态</h2><p>Redis Broker / Celery Worker</p></div><span className="online-dot">正常</span></div><div className="queue-number">03 <span>项待处理</span></div><div className="queue-bar"><i /></div><dl className="model-detail"><div><dt>运行中任务</dt><dd>2 项</dd></div><div><dt>Worker 数量</dt><dd>2 个</dd></div><div><dt>平均等待</dt><dd>约 12 秒</dd></div></dl></article></section><section className="panel recent-panel"><div className="panel-heading"><div><h2>批量任务记录</h2><p>可继续在任务完成后导出 CSV、JSON 与带框图片</p></div></div><div className="batch-row"><span className="file-square">ZIP</span><div><strong>hotroll_batch_0810.zip</strong><small>120 张图片 · 68 张已完成</small></div><div className="progress-block"><span>57%</span><div className="queue-bar"><i /></div></div><span className="badge pending">处理中</span></div></section></>
  );

  const renderCamera = () => <><section className="page-heading compact"><div><p className="eyebrow">DEMO MODE · 浏览器截帧</p><h1>摄像头演示</h1><p>第一阶段采用浏览器截帧后按单图发送，避免引入复杂视频流服务。</p></div></section><section className="camera-shell"><div className="camera-feed"><div className="camera-grid" /><span className="live-badge">● LIVE DEMO</span><div className="camera-hint"><span>◉</span><strong>摄像头尚未启动</strong><small>授权后可截取当前画面并调用 /api/v1/infer</small><button className="primary-button" onClick={() => notify("摄像头演示将在已接入真实设备后启用")}>启用摄像头</button></div></div><aside className="panel camera-info"><h2>演示说明</h2><ol><li>浏览器获取摄像头画面</li><li>点击截帧或按设定间隔采集图片</li><li>图片调用统一推理接口</li><li>前端叠加显示识别框与置信度</li></ol><div className="note-box">此模式用于答辩演示，非连续工业视频流检测。</div></aside></section></>;

  const renderHistory = () => <><section className="page-heading compact"><div><p className="eyebrow">TRACEABILITY · 检测可追溯</p><h1>历史记录</h1><p>按任务、用户、日期与模型版本检索历史识别结果。</p></div><button className="quiet-button" onClick={() => notify("已准备 CSV / JSON / 结果图导出接口")}>导出记录 ↓</button></section><section className="panel recent-panel"><div className="filter-bar"><input aria-label="搜索任务或文件名" placeholder="搜索任务编号、文件名称…" /><select aria-label="选择任务状态"><option>全部状态</option><option>已完成</option><option>处理中</option></select><select aria-label="选择模型版本"><option>全部模型版本</option><option>scratch-detector-onnx-v0.1</option></select><button className="primary-button" onClick={() => notify("筛选条件已应用")}>查询</button></div><div className="table-scroll"><table><thead><tr><th>任务编号</th><th>文件名称</th><th>模型版本</th><th>检测结果</th><th>耗时</th><th>提交时间</th><th /></tr></thead><tbody>{recentTasks.map((task, index) => <tr key={task.id}><td className="mono">{task.id}</td><td>{task.name}</td><td>onnx-v0.1</td><td>{task.result}</td><td>{index === 3 ? "—" : `${196 + index * 11} ms`}</td><td>今天 {task.time}</td><td><button className="row-action" onClick={() => { setActive("detect"); setIsDetected(true); }}>详情</button></td></tr>)}</tbody></table></div></section></>;

  const renderModels = () => <><section className="page-heading compact"><div><p className="eyebrow">MODEL REGISTRY · 版本可追溯</p><h1>模型管理</h1><p>前端通过统一接口调用模型，不依赖具体训练框架或权重格式。</p></div></section><section className="model-path"><div className="path-node active">Mock<br/><small>开发阶段</small></div><span>→</span><div className="path-node">PyTorch<br/><small>训练后接入</small></div><span>→</span><div className="path-node active">ONNX Runtime<br/><small>当前部署候选</small></div><span>→</span><div className="path-node">TensorRT<br/><small>NVIDIA 优化</small></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h2>已注册模型</h2><p>模型版本与每次推理结果绑定保存</p></div><button className="primary-button" onClick={() => notify("模型注册接口将在真实权重就绪后启用")}>＋ 注册模型</button></div><div className="model-record"><span className="model-mark">AI</span><div><strong>scratch-detector-onnx-v0.1</strong><small>目标检测 · Scratch · ONNX Runtime</small></div><span className="badge done">当前启用</span><button className="row-action">查看详情</button></div></section></>;

  const renderSettings = () => <><section className="page-heading compact"><div><p className="eyebrow">SYSTEM SETTINGS · MVP 配置</p><h1>参数设置</h1><p>这些配置应记录审计日志，并仅允许具备权限的用户修改。</p></div></section><section className="settings-grid"><article className="panel"><h2>识别默认参数</h2><div className="setting-line"><div><strong>默认置信度阈值</strong><small>默认值仅为接口示例，最终以验证集实验为准</small></div><output>{(threshold / 100).toFixed(2)}</output></div><input className="range" type="range" min="10" max="95" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /><button className="primary-button" onClick={() => notify("设置已保存到演示配置")}>保存设置</button></article><article className="panel"><h2>存储与保留</h2><div className="setting-line"><div><strong>图片保存期限</strong><small>开发环境存储于本地，正式环境可使用 S3 兼容对象存储</small></div><select aria-label="图片保存期限"><option>90 天</option><option>30 天</option><option>永久保留</option></select></div><div className="setting-line"><div><strong>上传文件限制</strong><small>文件类型、MIME、像素尺寸和数量均需校验</small></div><strong>10 MB</strong></div></article></section></>;

  const content = active === "dashboard" ? renderDashboard() : active === "detect" ? renderDetect() : active === "batch" ? renderBatch() : active === "camera" ? renderCamera() : active === "history" ? renderHistory() : active === "models" ? renderModels() : renderSettings();

  return (
    <main className="app-shell">
      <aside className="sidebar"><div className="brand"><span className="brand-mark"><i /><i /><i /></span><div><strong>SteelVision</strong><small>智能质检平台</small></div></div><nav aria-label="主导航">{navItems.map((item, index) => <div key={item.key}>{item.group && <p className="nav-group">{item.group}</p>}<button className={active === item.key ? "nav-item active" : "nav-item"} onClick={() => setActive(item.key)}><span>{item.icon}</span>{item.label}</button>{index === 4 && <p className="nav-group">系统管理</p>}</div>)}</nav><div className="sidebar-bottom"><div className="data-source"><span>◎</span><div><strong>NEU-DET</strong><small>热轧钢带缺陷数据基础</small></div></div><div className="user-card"><span className="avatar">李</span><div><strong>李同学</strong><small>系统管理员</small></div><button aria-label="账户菜单">···</button></div></div></aside>
      <section className="main-area"><header className="topbar"><div className="crumb">热轧钢带表面划痕识别 <span>/</span> {activeLabel}</div><div className="top-actions"><span className="api-pill">API 服务正常</span><button aria-label="通知" className="icon-button">♧<b /></button><button aria-label="帮助" className="icon-button">?</button></div></header><div className="content">{content}</div></section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
