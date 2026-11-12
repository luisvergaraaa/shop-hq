import { Logo } from "@/components/Logo";
import { SHOP } from "@/lib/config";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="glow" />
      <form action={login} className="auth-card stack" style={{ gap: 18 }}>
        <div className="row" style={{ gap: 16 }}>
          <Logo size={56} />
          <span className="wordmark">{SHOP.name}</span>
        </div>
        <h1 style={{ fontSize: 30 }}>Sign in</h1>
        {e === "1" && <div className="notice">That email or password didn't match.</div>}
        {e === "setup" && <div className="notice">Login isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in your Vercel project settings, then redeploy.</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn block" type="submit" style={{ padding: 16, fontSize: 17 }}>Sign in</button>
      </form>
    </div>
  );
}
