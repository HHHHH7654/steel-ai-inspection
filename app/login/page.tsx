"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === "admin" && password === "admin123") {
      sessionStorage.setItem("steelvision_demo_account", "admin");
      window.location.assign("/");
      return;
    }
    setError("账号或密码错误，请重新输入。");
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="login-grid" />
        <div className="login-visual-copy">
          <span className="brand-mark"><i /><i /><i /></span>
          <p>STEELVISION</p>
          <h1>让每一处划痕<br />都可追溯。</h1>
          <small>热轧钢带表面划痕识别与可视化管理平台</small>
        </div>
        <div className="login-steel-band"><span /></div>
      </section>
      <section className="login-card-wrap">
        <form className="login-card" onSubmit={signIn}>
          <div className="login-logo"><span className="brand-mark"><i /><i /><i /></span><strong>SteelVision</strong></div>
          <p className="eyebrow">SECURE ACCESS · 系统登录</p>
          <h2>登录系统</h2>
          <p className="login-description">请输入系统管理员账号和密码，登录后可使用图片检测、摄像头接入与系统管理功能。</p>
          <label className="login-field"><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" autoComplete="username" required /></label>
          <label className="login-field"><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" autoComplete="current-password" required /></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-button" type="submit">登录系统 <span>→</span></button>
          <div className="login-notice"><span>i</span><p>当前原型账号：<strong>admin</strong>；密码：<strong>admin123</strong>。正式部署时应由 FastAPI + JWT 在服务端完成认证。</p></div>
          <footer>SteelVision · 智能质检平台</footer>
        </form>
      </section>
    </main>
  );
}
