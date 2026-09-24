import type { GuideContent } from "@/modules/guides/content";
import type { Skill } from "@/modules/skills/service";

export function GuideEditorFields({
  content,
  skills,
}: {
  content: GuideContent;
  skills: Skill[];
}) {
  return (
    <>
      <label className="field">
        <span className="field-label">Title</span>
        <input
          className="field-control"
          name="title"
          required
          maxLength={140}
          defaultValue={content.title}
        />
      </label>
      <label className="field">
        <span className="field-label">Goal</span>
        <textarea
          className="field-control"
          name="goal"
          required
          maxLength={2000}
          defaultValue={content.goal}
        />
      </label>
      <label className="field">
        <span className="field-label">Prerequisites</span>
        <span className="field-hint">One item per line</span>
        <textarea
          className="field-control"
          name="prerequisites"
          defaultValue={content.prerequisites.join("\n")}
        />
      </label>
      <label className="field">
        <span className="field-label">Bill of materials</span>
        <span className="field-hint">One item per line</span>
        <textarea
          className="field-control"
          name="materials"
          defaultValue={content.materials.join("\n")}
        />
      </label>
      <label className="field">
        <span className="field-label">Steps</span>
        <span className="field-hint">One step per line</span>
        <textarea
          className="field-control"
          name="steps"
          required
          defaultValue={content.steps.join("\n")}
        />
      </label>
      <label className="field">
        <span className="field-label">Lessons learned</span>
        <textarea
          className="field-control"
          name="lessons"
          maxLength={4000}
          defaultValue={content.lessons}
        />
      </label>
      <label className="field">
        <span className="field-label">Skills used or taught</span>
        <span className="field-hint">
          Hold Ctrl or Command to select several.
        </span>
        <select
          className="field-control multi-select"
          name="skillIds"
          multiple
          size={8}
          defaultValue={content.skills.map((skill) => skill.id)}
        >
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
              {skill.parentName ? ` — within ${skill.parentName}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">
          How this guide relates to selected skills
        </span>
        <select
          className="field-control"
          name="skillRelationship"
          defaultValue={content.skills[0]?.relationship ?? "taught"}
        >
          <option value="taught">Teaches</option>
          <option value="required">Requires</option>
          <option value="used">Uses</option>
        </select>
      </label>
      <label className="field">
        <span className="field-label">Risk declaration</span>
        <select
          className="field-control"
          name="riskDeclaration"
          defaultValue={content.riskDeclaration}
          required
        >
          <option value="not_reviewed">I have not reviewed hazards yet</option>
          <option value="no_hazards">
            I reviewed the steps; no hazardous work is involved
          </option>
          <option value="hazards_present">
            This guide involves hazardous work
          </option>
        </select>
      </label>
      <p className="field-hint">
        Hazardous guides cannot publish during the internal alpha. This release
        accepts text only.
      </p>
    </>
  );
}
