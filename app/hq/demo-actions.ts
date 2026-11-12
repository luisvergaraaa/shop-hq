"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { ensureSchema } from "@/lib/db";
import { loadDemo, clearDemo } from "@/lib/demo";

export async function loadSampleData() {
  await requireAdmin();
  await ensureSchema();
  const r = await loadDemo();
  revalidatePath("/hq", "layout");
  redirect(r.ok ? "/hq?sample=1" : `/hq/setup?sample=${r.reason}`);
}

export async function clearSampleData() {
  await requireAdmin();
  await clearDemo();
  revalidatePath("/hq", "layout");
  redirect("/hq/setup?sample=cleared");
}
