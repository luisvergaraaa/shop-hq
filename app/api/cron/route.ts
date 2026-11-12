import { ensureSchema } from "@/lib/db";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await ensureSchema();
    const made = await runAutomations();
    return Response.json({ ok: true, drafts: made });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
