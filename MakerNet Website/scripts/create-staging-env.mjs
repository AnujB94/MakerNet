import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repository = path.resolve(website, "..");
const output = path.join(website, "infra/staging/.env.staging.local");
const existing = await readFile(output, "utf8").catch((error) => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const values = Object.fromEntries(
  existing
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
values.STAGING_DB_PASSWORD ||= randomBytes(24).toString("hex");
values.STAGING_STORAGE_USER ||= `local${randomBytes(8).toString("hex")}`;
values.STAGING_STORAGE_PASSWORD ||= randomBytes(24).toString("hex");
values.APP_VERSION = process.env.APP_VERSION || "0.1.0-rc.1";
values.BUILD_COMMIT = execFileSync(
  "git",
  ["-c", `safe.directory=${repository}`, "rev-parse", "HEAD"],
  {
    cwd: repository,
    encoding: "utf8",
  },
).trim();
await writeFile(
  output,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
process.stdout.write(
  `Staging environment prepared for ${values.BUILD_COMMIT}\n`,
);
