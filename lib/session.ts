import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifySession } from "./auth";

export async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifySession(jar.get(COOKIE)?.value))) redirect("/login");
}
