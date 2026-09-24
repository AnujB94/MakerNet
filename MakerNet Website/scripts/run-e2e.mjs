import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = path.join(root, "apps/web/.next/BUILD_ID");
await access(buildId).catch(() => {
  throw new Error("Run npm run build before npm run test:e2e");
});
try {
  process.loadEnvFile(path.join(root, "apps/web/.env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const required = ["APP_ENV", "DATABASE_URL", "SMTP_URL", "EMAIL_FROM"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(
    `Missing configuration for browser tests: ${missing.join(", ")}`,
  );
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function waitForExit(child) {
  return new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
}

async function stopServer(child) {
  if (!child.pid || child.exitCode !== null) return;
  child.kill("SIGTERM");
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [path.join(root, "apps/web/.next/standalone/apps/web/server.js")],
  {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
    stdio: "inherit",
    windowsHide: true,
  },
);
const serverExit = waitForExit(server);

try {
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (!ready && Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error("Production server exited before browser tests");
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      const body = await response.json();
      ready = response.ok && body.service === "makernet-web";
    } catch {
      // The server may still be starting.
    }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready)
    throw new Error("Production server did not become healthy in 120 seconds");

  const runner = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      env: { ...process.env, E2E_BASE_URL: baseUrl },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  const result = await waitForExit(runner);
  process.exitCode = result.code ?? 1;
} finally {
  await stopServer(server);
  await Promise.race([
    serverExit,
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
}
