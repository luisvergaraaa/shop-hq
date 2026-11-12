import { neon } from "@neondatabase/serverless";
import { SCHEMA } from "./schema";

let client: any = null;
function get() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!client) client = neon(process.env.DATABASE_URL);
  return client;
}

/** Tagged-template query: await sql`select * from jobs where id = ${id}` */
export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  return get()(strings, ...values);
}

/** Plain-string query, used for running the schema. */
export function rawQuery(text: string, params: any[] = []): Promise<any[]> {
  return get().query(text, params);
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

let schemaReady: Promise<void> | null = null;
/** Creates any missing tables once per server start. Safe to call often. */
export function ensureSchema(): Promise<void> {
  if (!hasDb()) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await rawQuery(stmt);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}
