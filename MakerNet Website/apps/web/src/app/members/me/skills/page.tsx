import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function ProfileSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [skills, view, query] = await Promise.all([
    listSkills(),
    getProfileView(actor, actor.id),
    searchParams,
  ]);
  return (
    <div className="container form-page">
      <p className="eyebrow">Profile / Skills</p>
      <h1>Your skills</h1>
      <p>
        Self-declared skills describe what you are learning or can do. Guide
        contributions add separate accepted evidence.
      </p>
      {query.error && (
        <p role="alert" className="alert error">
          The claim could not be saved. Check whether the skill is already
          listed.
        </p>
      )}
      <form className="form-stack" action="/members/me/actions" method="post">
        <input type="hidden" name="operation" value="addSkill" />
        <label className="field">
          <span className="field-label">Canonical skill</span>
          <select
            className="field-control"
            name="skillId"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choose a skill
            </option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
                {skill.parentName ? ` — within ${skill.parentName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Your experience</span>
          <textarea
            className="field-control"
            name="statement"
            maxLength={1000}
          />
        </label>
        <label className="field">
          <span className="field-label">Audience</span>
          <select
            className="field-control"
            name="audience"
            defaultValue="college"
          >
            <option value="college">College members</option>
            <option value="private">Only me</option>
            {actor.organizations.size > 0 && (
              <option value="organization">One organization</option>
            )}
          </select>
        </label>
        {actor.organizations.size > 0 && (
          <label className="field">
            <span className="field-label">Organization, if selected</span>
            <select className="field-control" name="organizationId">
              <option value="">None</option>
              {[...actor.organizations].map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button button-primary">Add skill</button>
      </form>
      {view?.claims && (
        <section className="catalog-section">
          <h2>Listed skills</h2>
          {view.claims.length ? (
            <ul className="record-list">
              {view.claims.map((claim) => (
                <li key={claim.id}>
                  <strong>{claim.skillName}</strong>
                  <span>{claim.statement}</span>
                  <form action="/members/me/actions" method="post">
                    <input type="hidden" name="operation" value="removeSkill" />
                    <input type="hidden" name="claimId" value={claim.id} />
                    <button className="button button-quiet">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p>No skills listed yet.</p>
          )}
        </section>
      )}
      <Link href="/members/me">Back to profile</Link>
    </div>
  );
}
