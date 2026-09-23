import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "apps/web");
const standaloneWeb = path.join(web, ".next/standalone/apps/web");

await mkdir(standaloneWeb, { recursive: true });
await cp(
  path.join(web, ".next/static"),
  path.join(standaloneWeb, ".next/static"),
  {
    recursive: true,
    force: true,
  },
);
await cp(path.join(web, "public"), path.join(standaloneWeb, "public"), {
  recursive: true,
  force: true,
});
