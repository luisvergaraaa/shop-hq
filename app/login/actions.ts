"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, makeSession } from "@/lib/auth";

export async function login(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const okEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const okPass = process.env.ADMIN_PASSWORD || "";
  if (!okEmail || okPass.length < 8) redirect("/login?e=setup");
  if (email !== okEmail || password !== okPass) redirect("/login?e=1");
  const jar = await cookies();
  jar.set(COOKIE, await makeSession(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/hq");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/login");
}
