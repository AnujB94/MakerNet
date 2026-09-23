import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrationFiles } from "./migrate.mjs";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function fixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), "makernet-migrations-"));
  directories.push(directory);
  await Promise.all(
    Object.entries(files).map(([name, sql]) =>
      writeFile(path.join(directory, name), sql),
    ),
  );
  return directory;
}

describe("migration integrity", () => {
  it("rejects gaps that would strand a deployment", async () => {
    const directory = await fixture({
      "0001_first.sql": "SELECT 1;",
      "0003_third.sql": "SELECT 3;",
    });
    await expect(migrationFiles(directory)).rejects.toThrow(
      "Invalid migration sequence",
    );
  });

  it("produces a stable content checksum", async () => {
    const directory = await fixture({ "0001_first.sql": "SELECT 1;" });
    const [migration] = await migrationFiles(directory);
    expect(migration.name).toBe("0001_first.sql");
    expect(migration.checksum).toHaveLength(64);
  });

  it("keeps the checksum stable across Windows line endings", async () => {
    const lf = await fixture({ "0001_first.sql": "SELECT 1;\n" });
    const crlf = await fixture({ "0001_first.sql": "SELECT 1;\r\n" });
    const [unixMigration] = await migrationFiles(lf);
    const [windowsMigration] = await migrationFiles(crlf);
    expect(windowsMigration.checksum).toBe(unixMigration.checksum);
    expect(windowsMigration.sql).toBe(unixMigration.sql);
  });
});
