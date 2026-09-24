import { redirect } from "next/navigation";
import { canModerate } from "@/modules/identity/policy";
import { currentPrincipal } from "@/modules/identity/web";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function ManageSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  if (!canModerate(actor)) redirect("/access-denied");
  const skills = await listSkills(true);
  const query = await searchParams;
  return (
    <div className="container form-page">
      <p className="eyebrow">Moderation / Taxonomy</p>
      <h1>Manage skills</h1>
      {query.result === "saved" && (
        <p role="status" className="alert success">
          Skill change saved.
        </p>
      )}
      {query.result === "invalid" && (
        <p role="alert" className="alert error">
          The change was rejected. Check terms, ownership, and parent cycles.
        </p>
      )}
      <form className="form-stack" action="/admin/skills/actions" method="post">
        <h2>Create a skill</h2>
        <input type="hidden" name="operation" value="create" />
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="field-control"
            name="name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <input
            className="field-control"
            name="category"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Parent</span>
          <select className="field-control" name="parentId">
            <option value="">Root skill</option>
            {skills
              .filter((s) => s.status === "active")
              .map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
          </select>
        </label>
        <button className="button button-primary">Create skill</button>
      </form>
      <section className="catalog-section">
        <h2>Existing skills</h2>
        <ul className="skill-list">
          {skills.map((skill) => (
            <li key={skill.id}>
              <span>
                {skill.name} · {skill.status}
              </span>
              <span>{skill.parentName ?? skill.category}</span>
            </li>
          ))}
        </ul>
      </section>
      <form className="form-stack" action="/admin/skills/actions" method="post">
        <h2>Change a skill</h2>
        <label className="field">
          <span className="field-label">Skill</span>
          <select className="field-control" name="id" required>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Operation</span>
          <select className="field-control" name="operation">
            <option value="rename">Rename</option>
            <option value="alias">Add alias</option>
            <option value="move">Move</option>
            <option value="deactivate">Deactivate</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">New name or alias</span>
          <input className="field-control" name="name" maxLength={100} />
        </label>
        <label className="field">
          <span className="field-label">New parent</span>
          <select className="field-control" name="parentId">
            <option value="">Root skill</option>
            {skills
              .filter((s) => s.status === "active")
              .map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
          </select>
        </label>
        <button className="button button-secondary">Apply change</button>
      </form>
    </div>
  );
}
