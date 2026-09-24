import Link from "next/link";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function SkillPickerPage() {
  const skills = await listSkills();
  return (
    <div className="container form-page">
      <p className="eyebrow">Development form / Skill taxonomy</p>
      <h1>Choose a canonical skill</h1>
      <p>
        This keyboard-ready picker uses the complete seeded vocabulary and shows
        each parent.
      </p>
      <form className="form-stack" action="/skills/picker" method="get">
        <label className="field">
          <span className="field-label">Skill</span>
          <select
            className="field-control"
            name="skill"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Choose a skill
            </option>
            {skills.map((skill) => (
              <option value={skill.id} key={skill.id}>
                {skill.name}
                {skill.parentName
                  ? ` — within ${skill.parentName}`
                  : ` — ${skill.category}`}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          Show selection
        </button>
      </form>
      <Link href="/skills">Browse taxonomy</Link>
    </div>
  );
}
