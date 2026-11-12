import { SHOP } from "./config";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AiResult = { text: string | null; error?: string };

/** Calls Claude. Never throws: returns { text: null } when AI is off or fails. */
export async function aiCall(system: string, user: string, maxTokens = 600): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: null, error: "no_key" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[ai] anthropic error", res.status, body.slice(0, 300));
      return { text: null, error: `AI error ${res.status}: ${body.slice(0, 160)}` };
    }
    const data: any = await res.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    return { text: text || null, error: text ? undefined : "empty" };
  } catch (e: any) {
    console.error("[ai] call failed", String(e?.message || e).slice(0, 300));
    return { text: null, error: String(e?.message || e).slice(0, 160) };
  }
}

export const SHOP_VOICE = `You write for ${SHOP.name}, a one-person mobile vehicle diagnostic business. Tone: friendly, direct, plain-spoken. No hype, no emojis, no corporate language. Text messages stay under 320 characters. Never invent prices, availability, or diagnoses; use only facts you are given. Output only the message text, nothing else.`;

export const ASSISTANT_VOICE = `You are Torque, the assistant for ${SHOP.name}, a one-person mobile vehicle diagnostic business. You are given a snapshot of the business data. Answer using only that data. Be concise and practical. Plain text only, short lines or dashes are fine, no markdown headings. If the data does not answer the question, say what is missing.`;
