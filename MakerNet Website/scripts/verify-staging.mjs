import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const contents = await readFile(
  path.join(website, "infra/staging/.env.staging.local"),
  "utf8",
);
const values = Object.fromEntries(
  contents
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const baseUrl = process.env.STAGING_URL || "http://127.0.0.1:3001";

for (let sample = 1; sample <= 6; sample += 1) {
  const health = await fetch(`${baseUrl}/api/health`, {
    signal: AbortSignal.timeout(3_000),
  });
  if (!health.ok) throw new Error(`Health probe ${sample} failed`);
  const body = await health.json();
  if (
    body.status !== "ok" ||
    body.environment !== "staging" ||
    body.version !== values.APP_VERSION ||
    body.commit !== values.BUILD_COMMIT
  ) {
    throw new Error(`Unexpected staging identity on probe ${sample}`);
  }
  const ready = await fetch(`${baseUrl}/api/ready`, {
    signal: AbortSignal.timeout(3_000),
  });
  if (!ready.ok || (await ready.json()).status !== "ready") {
    throw new Error(`Readiness probe ${sample} failed`);
  }
  if (sample < 6) await new Promise((resolve) => setTimeout(resolve, 10_000));
}
process.stdout.write(
  `Six staging health and readiness probes passed for ${values.APP_VERSION} (${values.BUILD_COMMIT})\n`,
);
