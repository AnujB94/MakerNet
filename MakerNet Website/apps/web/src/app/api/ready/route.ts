import { NextResponse } from "next/server";
import pg from "pg";
import { serverEnvironment } from "@/config/env";
import { logEvent } from "@/config/log";
import { requestId } from "@/config/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = serverEnvironment();
  const correlationId = requestId(request);
  const client = new pg.Client({
    connectionString: env.databaseUrl,
    connectionTimeoutMillis: 2_000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return NextResponse.json(
      { status: "ready", service: "makernet-web", version: env.appVersion },
      {
        headers: { "Cache-Control": "no-store", "x-request-id": correlationId },
      },
    );
  } catch {
    logEvent("warn", "readiness_failed", {
      dependency: "postgres",
      correlationId,
    });
    return NextResponse.json(
      { status: "unavailable", service: "makernet-web" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "x-request-id": correlationId },
      },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
