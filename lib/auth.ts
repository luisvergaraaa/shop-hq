export const COOKIE = "hq_session";
const enc = new TextEncoder();

function b64url(buf: ArrayBuffer) {
  let s = "";
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string) {
  // AUTH_SECRET is optional; without it, sessions are signed with the admin password.
  const secret = process.env.AUTH_SECRET || (process.env.ADMIN_PASSWORD ? `hq-session:${process.env.ADMIN_PASSWORD}` : "");
  if (secret.length < 8) throw new Error("Set ADMIN_PASSWORD (or AUTH_SECRET)");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function makeSession() {
  const payload = `admin.${Date.now() + 1000 * 60 * 60 * 24 * 30}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySession(token?: string | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, exp, sig] = parts;
  if (who !== "admin" || Number(exp) < Date.now()) return false;
  try {
    return safeEqual(sig, await sign(`${who}.${exp}`));
  } catch {
    return false;
  }
}

