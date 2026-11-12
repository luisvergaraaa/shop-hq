import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SHOP } from "@/lib/config";

export default function Thanks() {
  return (
    <div className="auth-wrap">
      <div className="glow" />
      <div className="auth-card stack" style={{ gap: 16, textAlign: "center", alignItems: "center" }}>
        <Logo size={64} />
        <h1>Request received</h1>
        <p className="muted">Thanks! We'll text you shortly to confirm your appointment time.{SHOP.phone ? ` Need us sooner? Call ${SHOP.phone}.` : ""}</p>
        <Link href="/" className="btn ghost">Back to home</Link>
      </div>
    </div>
  );
}
