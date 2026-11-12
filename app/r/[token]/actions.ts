"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export async function respondEstimate(form: FormData) {
  const token = String(form.get("token") || "");
  const answer = form.get("answer") === "approved" ? "approved" : "declined";
  if (!token) return;
  if (answer === "approved")
    await sql`update jobs set estimate_response = 'approved', status = 'in_progress' where token = ${token} and status = 'awaiting_approval'`;
  else
    await sql`update jobs set estimate_response = 'declined' where token = ${token} and status = 'awaiting_approval'`;
  revalidatePath(`/r/${token}`);
  revalidatePath("/hq", "layout");
}
