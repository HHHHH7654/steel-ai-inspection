import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getChatGPTUser();
  if (user) redirect("/");

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
        <div className="login-card">
          <div className="login-logo"><span className="brand-mark"><i /><i /><i /></span><strong>SteelVision</strong></div>
          <p className="eyebrow">SECURE ACCESS · 平台统一身份认证</p>
          <h2>登录系统</h2>
          <p className="login-description">使用平台账户完成身份验证后，即可进入热轧钢带划痕识别管理平台。</p>
          <a className="login-button" href={chatGPTSignInPath("/")}>使用 ChatGPT 登录 <span>→</span></a>
          <div className="login-notice"><span>✓</span><p>系统采用平台统一身份认证；用户身份与访问权限在服务端校验，不在浏览器中保存密码。</p></div>
          <footer>SteelVision · 智能质检平台</footer>
        </div>
      </section>
    </main>
  );
}
