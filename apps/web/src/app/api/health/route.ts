import { NextResponse } from "next/server";
import { serverEnvironment } from "@/config/env";
import { requestId } from "@/config/request";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const env = serverEnvironment();
  const correlationId = requestId(request);
  return NextResponse.json(
    {
      status: "ok",
      service: "makernet-web",
      version: env.appVersion,
      commit: env.buildCommit,
      environment: env.appEnv,
    },
    { headers: { "Cache-Control": "no-store", "x-request-id": correlationId } },
  );
}
