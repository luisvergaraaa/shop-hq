"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { ensureSchema, sql } from "@/lib/db";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) || "").trim().slice(0, max);

export async function saveRepairNote(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const year = str(f, "year", 8), make = str(f, "make", 40), model = str(f, "model", 60);
  const code = str(f, "code", 80), symptom = str(f, "symptom", 400), fix = str(f, "fix", 1500), notes = str(f, "notes", 2000);
  const back = `/hq/vehicle?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
  if (!make || !model || !(fix || symptom || notes)) redirect(back + "&saved=0");
  await sql`insert into repair_notes (vehicle, year, make, model, code, symptom, fix, notes) values (${`${year} ${make} ${model}`.trim()}, ${year}, ${make}, ${model}, ${code}, ${symptom}, ${fix}, ${notes})`;
  revalidatePath("/hq/vehicle");
  redirect(back + "&saved=1");
}

export async function deleteRepairNote(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id"));
  if (id) await sql`delete from repair_notes where id = ${id}`;
  const back = String(f.get("back") || "/hq/vehicle");
  revalidatePath("/hq/vehicle");
  redirect(back.startsWith("/hq/vehicle") ? back : "/hq/vehicle");
}
