import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideEditorFields } from "@/components/guide-editor-fields";
import { currentPrincipal } from "@/modules/identity/web";
import { getDraft } from "@/modules/guides/service";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [{ id }, query, skills] = await Promise.all([
    params,
    searchParams,
    listSkills(),
  ]);
  const draft = await getDraft(actor, id).catch(() => null);
  if (!draft || !["draft", "ready"].includes(draft.status)) notFound();
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / Draft</p>
      <h1>{draft.content.title || "Untitled guide"}</h1>
      <p>
        Revision base:{" "}
        {draft.base_revision_id ? "Published revision" : "New guide"}. Save
        before publishing.
      </p>
      {query.saved && (
        <p role="status" className="alert success">
          Draft saved.
        </p>
      )}
      {query.error && (
        <p role="alert" className="alert error">
          The action could not be completed. The draft may have changed; reload
          and check contributor responses.
        </p>
      )}
      <form className="form-stack" action="/guides/actions" method="post">
        <input type="hidden" name="operation" value="save" />
        <input type="hidden" name="draftId" value={id} />
        <input type="hidden" name="lockVersion" value={draft.lock_version} />
        <GuideEditorFields content={draft.content} skills={skills} />
        <button className="button button-primary">Save draft</button>
      </form>
      <section className="catalog-section">
        <h2>Contributors and credit</h2>
        <ol className="record-list">
          {draft.contributions.map((contribution) => (
            <li key={contribution.id}>
              <strong>{contribution.display_name}</strong>
              <span>
                {contribution.role.replaceAll("_", " ")} ·{" "}
                {contribution.invitation_status} · credit{" "}
                {contribution.credit_order}
              </span>
              <small>{contribution.contribution_note}</small>
              {contribution.invitation_status === "accepted" &&
                draft.content.skills.length > 0 && (
                  <form
                    className="action-row"
                    action="/guides/actions"
                    method="post"
                  >
                    <input type="hidden" name="operation" value="candidate" />
                    <input type="hidden" name="draftId" value={id} />
                    <input
                      type="hidden"
                      name="contributionId"
                      value={contribution.id}
                    />
                    <label className="field">
                      <span className="field-label">
                        Propose skill evidence
                      </span>
                      <select className="field-control" name="skillId">
                        {draft.content.skills.map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skills.find((item) => item.id === skill.id)
                              ?.name ?? skill.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button button-secondary">
                      Propose evidence
                    </button>
                  </form>
                )}
            </li>
          ))}
        </ol>
        <form className="form-stack" action="/guides/actions" method="post">
          <h3>Invite a collaborator</h3>
          <input type="hidden" name="operation" value="invite" />
          <input type="hidden" name="draftId" value={id} />
          <label className="field">
            <span className="field-label">College email</span>
            <input
              className="field-control"
              type="email"
              name="email"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select className="field-control" name="role">
              <option value="author">Author</option>
              <option value="contributor">Contributor</option>
              <option value="lead_author">Lead author</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Contribution note</span>
            <textarea className="field-control" name="note" maxLength={1000} />
          </label>
          <label className="field">
            <span className="field-label">Credit order</span>
            <input
              className="field-control"
              type="number"
              name="order"
              min={2}
              defaultValue={draft.contributions.length + 1}
            />
          </label>
          <button className="button button-secondary">
            Invite contributor
          </button>
        </form>
      </section>
      <section className="catalog-section">
        <h2>Publish this revision</h2>
        <p>
          All invitations must be resolved. Only accepted credits and evidence
          are copied into the immutable revision.
        </p>
        <form className="form-stack" action="/guides/actions" method="post">
          <input type="hidden" name="operation" value="publish" />
          <input type="hidden" name="draftId" value={id} />
          <input type="hidden" name="lockVersion" value={draft.lock_version} />
          <label className="field">
            <span className="field-label">What changed?</span>
            <textarea
              className="field-control"
              name="changelog"
              maxLength={1000}
            />
          </label>
          <button className="button button-primary">Publish revision</button>
        </form>
      </section>
      <Link href="/guides">Back to guides</Link>
    </div>
  );
}
