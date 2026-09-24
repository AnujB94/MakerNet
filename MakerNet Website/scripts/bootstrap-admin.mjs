import pg from "pg";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const issuer = args.get("--issuer");
const subject = args.get("--subject");
const reason = args.get("--reason");
if (!issuer || !subject || !reason?.trim())
  throw new Error(
    "Use --issuer, --subject, and --reason to bootstrap an existing eligible account",
  );
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const person = await client.query(
    `SELECT id FROM makernet.person
    WHERE issuer = $1 AND provider_subject = $2 AND state = 'active'
      AND (eligibility_ends_at IS NULL OR eligibility_ends_at > now()) FOR UPDATE`,
    [issuer, subject],
  );
  if (person.rowCount !== 1)
    throw new Error("Eligible account not found; sign in first");
  const id = person.rows[0].id;
  const grant = await client.query(
    `INSERT INTO makernet.role_grant(person_id, role, scope_type)
    VALUES ($1, 'administrator', 'site') ON CONFLICT DO NOTHING RETURNING id`,
    [id],
  );
  if (!grant.rowCount)
    throw new Error("Account already has administrator role");
  await client.query(
    `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
    VALUES (NULL, 'bootstrap_administrator', 'person', $1, 'site', $2)`,
    [id, reason.trim()],
  );
  await client.query("COMMIT");
  process.stdout.write(`Bootstrapped administrator ${id}\n`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
