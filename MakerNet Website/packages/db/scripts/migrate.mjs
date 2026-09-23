import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationDirectory = path.resolve(root, "../migrations");
const command = process.argv[2];

export async function migrationFiles(directory = migrationDirectory) {
  const names = (await readdir(directory)).filter((name) =>
    name.endsWith(".sql"),
  );
  names.sort();
  let expected = 1;
  const migrations = [];
  for (const name of names) {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(name);
    if (!match || Number(match[1]) !== expected) {
      throw new Error(
        `Invalid migration sequence at ${name}; expected ${String(expected).padStart(4, "0")}`,
      );
    }
    // Windows checkouts may turn LF into CRLF. Execute and hash the same
    // canonical text so a checkout conversion cannot invalidate the ledger.
    const sql = (await readFile(path.join(directory, name), "utf8")).replace(
      /\r\n/g,
      "\n",
    );
    if (!sql.trim()) throw new Error(`Empty migration: ${name}`);
    migrations.push({
      name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
    expected += 1;
  }
  if (!migrations.length) throw new Error("No SQL migrations found");
  return migrations;
}

async function withDatabase(callback) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Missing required configuration: DATABASE_URL");
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 3000,
  });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(client) {
  const result = await client.query(
    "SELECT name, checksum FROM public.schema_migrations ORDER BY name",
  );
  return new Map(
    result.rows.map(({ name, checksum }) => [name, checksum.trim()]),
  );
}

async function migrate(migrations) {
  await withDatabase(async (client) => {
    await client.query("SELECT pg_advisory_lock(81264001)");
    try {
      await ensureLedger(client);
      const applied = await appliedMigrations(client);
      for (const name of applied.keys()) {
        if (!migrations.some((migration) => migration.name === name)) {
          throw new Error(`Applied migration missing from checkout: ${name}`);
        }
      }
      for (const migration of migrations) {
        const existing = applied.get(migration.name);
        if (existing && existing !== migration.checksum) {
          throw new Error(`Migration checksum changed: ${migration.name}`);
        }
        if (existing) continue;
        await client.query("BEGIN");
        try {
          await client.query(migration.sql);
          await client.query(
            "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
            [migration.name, migration.checksum],
          );
          await client.query("COMMIT");
          process.stdout.write(`Applied ${migration.name}\n`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(81264001)");
    }
  });
}

async function verify(migrations) {
  await withDatabase(async (client) => {
    await ensureLedger(client);
    const applied = await appliedMigrations(client);
    if (applied.size !== migrations.length) {
      throw new Error(
        `Expected ${migrations.length} applied migrations, found ${applied.size}`,
      );
    }
    for (const migration of migrations) {
      if (applied.get(migration.name) !== migration.checksum) {
        throw new Error(`Missing or changed migration: ${migration.name}`);
      }
    }
    const schema = await client.query(
      "SELECT 1 FROM pg_namespace WHERE nspname = 'makernet'",
    );
    if (!schema.rowCount) throw new Error("Foundation schema is absent");
    process.stdout.write(`Verified ${applied.size} migrations\n`);
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const migrations = await migrationFiles();
  if (command === "check")
    process.stdout.write(`Validated ${migrations.length} migration files\n`);
  else if (command === "migrate") await migrate(migrations);
  else if (command === "verify") await verify(migrations);
  else throw new Error("Use check, migrate, or verify");
}
