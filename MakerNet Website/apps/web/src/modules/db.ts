import "server-only";
import pg, { type PoolClient, type QueryResultRow } from "pg";
import { serverEnvironment } from "@/config/env";

const globalPool = globalThis as typeof globalThis & { makernetPool?: pg.Pool };

export function pool(): pg.Pool {
  globalPool.makernetPool ??= new pg.Pool({
    connectionString: serverEnvironment().databaseUrl,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  return globalPool.makernetPool;
}

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type DatabaseClient = Pick<PoolClient, "query">;

export async function one<T extends QueryResultRow>(
  db: DatabaseClient,
  sql: string,
  values: unknown[] = [],
): Promise<T | null> {
  const result = await db.query<T>(sql, values);
  return result.rows[0] ?? null;
}
