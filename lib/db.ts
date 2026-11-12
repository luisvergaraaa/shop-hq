import { neon } from "@neondatabase/serverless";

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
