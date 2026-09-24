import "server-only";
import { pool, transaction, one, type DatabaseClient } from "@/modules/db";
import { canModerate, type Principal } from "@/modules/identity/policy";

export interface Skill {
  id: string;
  name: string;
  category: string;
  parentId: string | null;
  parentName: string | null;
  status: "active" | "inactive";
}

function assertModerator(actor: Principal | null) {
  if (!canModerate(actor)) throw new Error("Forbidden");
}

function validLabel(value: string) {
  const label = value.trim().replace(/\s+/gu, " ");
  if (label.length < 2 || label.length > 100)
    throw new Error("Skill term must be 2 to 100 characters");
  return label;
}

export async function listSkills(includeInactive = false): Promise<Skill[]> {
  const result = await pool().query<{
    id: string;
    name: string;
    category: string;
    parent_id: string | null;
    parent_name: string | null;
    status: Skill["status"];
  }>(
    `SELECT s.id, s.name, s.category, s.parent_id, p.name AS parent_name, s.status
     FROM makernet.skill s LEFT JOIN makernet.skill p ON p.id = s.parent_id
     WHERE ($1::boolean OR s.status = 'active') ORDER BY s.category, s.name`,
    [includeInactive],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    parentId: row.parent_id,
    parentName: row.parent_name,
    status: row.status,
  }));
}

export async function skillDetail(id: string): Promise<Skill | null> {
  return (await listSkills(true)).find((skill) => skill.id === id) ?? null;
}

export async function resolveSkillTerm(
  value: string,
  locale = "en",
): Promise<Skill | null> {
  const term = await one<{ skill_id: string }>(
    pool(),
    `
    SELECT t.skill_id FROM makernet.skill_term t
    JOIN makernet.skill s ON s.id = t.skill_id
    LEFT JOIN makernet.skill_alias a ON a.term_id = t.id
    WHERE t.normalized_label = makernet.normalize_skill_term($1)
      AND t.locale = $2 AND s.status = 'active'
      AND (t.kind = 'canonical' OR a.status = 'active')`,
    [value, locale],
  );
  return term ? skillDetail(term.skill_id) : null;
}

async function audit(
  db: DatabaseClient,
  actorId: string,
  action: string,
  targetId: string,
  reason: string,
) {
  await db.query(
    `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
    VALUES ($1, $2, 'skill', $3, 'site', $4)`,
    [actorId, action, targetId, reason],
  );
}

export async function createSkill(
  actor: Principal | null,
  name: string,
  category: string,
  parentId: string | null,
): Promise<string> {
  assertModerator(actor);
  const label = validLabel(name);
  const group = validLabel(category);
  return transaction(async (db) => {
    if (parentId) {
      const parent = await one<{ id: string }>(
        db,
        `SELECT id FROM makernet.skill WHERE id = $1 AND status = 'active'`,
        [parentId],
      );
      if (!parent) throw new Error("Parent skill is not active");
    }
    const skill = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.skill(name, category, parent_id)
      VALUES ($1, $2, $3) RETURNING id`,
      [label, group, parentId],
    );
    await db.query(
      `INSERT INTO makernet.skill_term(skill_id, label, kind)
      VALUES ($1, $2, 'canonical')`,
      [skill!.id, label],
    );
    await audit(
      db,
      actor!.id,
      "skill_create",
      skill!.id,
      "Moderator created canonical term",
    );
    return skill!.id;
  });
}

export async function renameSkill(
  actor: Principal | null,
  id: string,
  name: string,
): Promise<void> {
  assertModerator(actor);
  const label = validLabel(name);
  await transaction(async (db) => {
    const skill = await one<{ name: string }>(
      db,
      `SELECT name FROM makernet.skill WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!skill) throw new Error("Skill not found");
    await db.query(
      `UPDATE makernet.skill_term SET label = $2
      WHERE skill_id = $1 AND kind = 'canonical'`,
      [id, label],
    );
    await db.query(
      `UPDATE makernet.skill SET name = $2, updated_at = now() WHERE id = $1`,
      [id, label],
    );
    if (skill.name.toLocaleLowerCase() !== label.toLocaleLowerCase()) {
      const alias = await one<{ id: string }>(
        db,
        `INSERT INTO makernet.skill_term(skill_id, label, kind)
        VALUES ($1, $2, 'alias') RETURNING id`,
        [id, skill.name],
      );
      await db.query(
        `INSERT INTO makernet.skill_alias(term_id, created_by) VALUES ($1, $2)`,
        [alias!.id, actor!.id],
      );
    }
    await audit(
      db,
      actor!.id,
      "skill_rename",
      id,
      `Renamed from ${skill.name}`,
    );
  });
}

export async function moveSkill(
  actor: Principal | null,
  id: string,
  parentId: string | null,
): Promise<void> {
  assertModerator(actor);
  await transaction(async (db) => {
    const row = await one<{ id: string }>(
      db,
      `UPDATE makernet.skill
      SET parent_id = $2, updated_at = now() WHERE id = $1 RETURNING id`,
      [id, parentId],
    );
    if (!row) throw new Error("Skill not found");
    await audit(
      db,
      actor!.id,
      "skill_move",
      id,
      `Parent ${parentId ?? "root"}`,
    );
  });
}

export async function addAlias(
  actor: Principal | null,
  id: string,
  label: string,
): Promise<void> {
  assertModerator(actor);
  const alias = validLabel(label);
  await transaction(async (db) => {
    const skill = await one<{ id: string }>(
      db,
      `SELECT id FROM makernet.skill WHERE id = $1 AND status = 'active'`,
      [id],
    );
    if (!skill) throw new Error("Skill not active");
    const term = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.skill_term(skill_id, label, kind)
      VALUES ($1, $2, 'alias') RETURNING id`,
      [id, alias],
    );
    await db.query(
      `INSERT INTO makernet.skill_alias(term_id, created_by) VALUES ($1, $2)`,
      [term!.id, actor!.id],
    );
    await audit(db, actor!.id, "skill_alias", id, `Alias ${alias}`);
  });
}

export async function deactivateSkill(
  actor: Principal | null,
  id: string,
): Promise<void> {
  assertModerator(actor);
  await transaction(async (db) => {
    const row = await one<{ id: string }>(
      db,
      `UPDATE makernet.skill SET status = 'inactive', updated_at = now()
      WHERE id = $1 RETURNING id`,
      [id],
    );
    if (!row) throw new Error("Skill not found");
    await audit(
      db,
      actor!.id,
      "skill_deactivate",
      id,
      "No longer available for new claims",
    );
  });
}

export async function previewSkillMerge(
  actor: Principal | null,
  sourceId: string,
  targetId: string,
) {
  assertModerator(actor);
  if (sourceId === targetId) throw new Error("Choose two different skills");
  const rows = await pool().query<{
    id: string;
    name: string;
    alias_count: string;
  }>(
    `
    SELECT s.id, s.name, count(t.id) FILTER (WHERE t.kind = 'alias')::text AS alias_count
    FROM makernet.skill s LEFT JOIN makernet.skill_term t ON t.skill_id = s.id
    WHERE s.id IN ($1, $2) GROUP BY s.id`,
    [sourceId, targetId],
  );
  if (rows.rowCount !== 2) throw new Error("Skill not found");
  return {
    source: rows.rows.find((row) => row.id === sourceId)!,
    target: rows.rows.find((row) => row.id === targetId)!,
    note: "Preview only. Existing claims and guide references are not changed.",
  };
}
