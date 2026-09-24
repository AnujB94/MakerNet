import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { guideManagement } from "@/modules/guides/collaboration";
import { ownOrganizations } from "@/modules/identity/service";

export const dynamic = "force-dynamic";

export default async function ManageGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [{ id }, organizations, query] = await Promise.all([
    params,
    ownOrganizations(actor),
    searchParams,
  ]);
  const guide = await guideManagement(actor, id).catch(() =>
    redirect("/access-denied"),
  );
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / Management</p>
      <h1>Manage guide</h1>
      {query.error && (
        <p role="alert" className="alert error">
          The change could not be saved. Check permissions and current state.
        </p>
      )}
      {query.saved && (
        <p role="status" className="alert success">
          Guide updated.
        </p>
      )}
      <dl className="detail-list">
        <dt>Status</dt>
        <dd>{guide.status}</dd>
        <dt>Visibility</dt>
        <dd>{guide.visibility}</dd>
        <dt>Owner</dt>
        <dd>
          {guide.owner_type === "person"
            ? guide.owner_person_id
            : guide.owner_organization_id}
        </dd>
      </dl>
      {guide.actorScopes.includes("publish_revisions") && (
        <section className="catalog-section">
          <h2>Revisions</h2>
          <form action="/guides/actions" method="post">
            <input type="hidden" name="operation" value="startRevision" />
            <input type="hidden" name="guideId" value={id} />
            <button className="button button-primary">
              Start a new revision
            </button>
          </form>
        </section>
      )}
      <section className="catalog-section">
        <h2>Maintainers</h2>
        <ul className="record-list">
          {guide.maintainers.map((maintainer) => (
            <li key={maintainer.person_id}>
              <strong>
                {maintainer.display_name}
                {maintainer.is_owner ? " · owner" : ""}
              </strong>
              <span>
                {maintainer.status} · {maintainer.scopes.join(", ")}
              </span>
              {guide.actorScopes.includes("manage_maintainers") &&
                !maintainer.is_owner &&
                maintainer.status === "active" && (
                  <form action="/guides/actions" method="post">
                    <input
                      type="hidden"
                      name="operation"
                      value="revokeMaintainer"
                    />
                    <input type="hidden" name="guideId" value={id} />
                    <input
                      type="hidden"
                      name="personId"
                      value={maintainer.person_id}
                    />
                    <button className="button button-quiet">
                      Revoke maintainer
                    </button>
                  </form>
                )}
            </li>
          ))}
        </ul>
        {guide.actorScopes.includes("manage_maintainers") && (
          <form className="form-stack" action="/guides/actions" method="post">
            <h3>Grant guide rights</h3>
            <input type="hidden" name="operation" value="addMaintainer" />
            <input type="hidden" name="guideId" value={id} />
            <label className="field">
              <span className="field-label">Member ID</span>
              <input className="field-control" name="personId" required />
            </label>
            <fieldset>
              <legend>Scopes</legend>
              {[
                ["manage_contributors", "Manage contributors"],
                ["publish_revisions", "Publish revisions"],
                ["change_visibility", "Change visibility"],
                ["archive", "Archive"],
                ["manage_maintainers", "Manage maintainers"],
              ].map(([value, label]) => (
                <label className="checkbox-field" key={value}>
                  <input type="checkbox" name="scopes" value={value} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <button className="button button-secondary">Grant rights</button>
          </form>
        )}
      </section>
      {guide.actorScopes.includes("change_visibility") && (
        <section className="catalog-section">
          <h2>Audience and consent</h2>
          <p>
            Widening visibility requests consent from credited contributors. An
            older revision keeps its original audience; publish a new revision
            to use the wider audience.
          </p>
          <form className="form-stack" action="/guides/actions" method="post">
            <input type="hidden" name="operation" value="changeVisibility" />
            <input type="hidden" name="guideId" value={id} />
            <label className="field">
              <span className="field-label">New audience</span>
              <select
                className="field-control"
                name="visibility"
                defaultValue={guide.visibility}
              >
                <option value="college">College</option>
                <option value="private">Invited collaborators</option>
                {organizations.length > 0 && (
                  <option value="organization">One organization</option>
                )}
              </select>
            </label>
            {organizations.length > 0 && (
              <label className="field">
                <span className="field-label">Organization, if selected</span>
                <select
                  className="field-control"
                  name="organizationId"
                  defaultValue={guide.audience_organization_id ?? ""}
                >
                  <option value="">None</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="button button-secondary">
              Request visibility change
            </button>
          </form>
        </section>
      )}
      {guide.actorScopes.includes("manage_maintainers") && (
        <section className="catalog-section">
          <h2>Transfer stewardship</h2>
          <p>
            Transfer requires acceptance from the person or an officer of the
            selected organization.
          </p>
          <form className="form-stack" action="/guides/actions" method="post">
            <input type="hidden" name="operation" value="transfer" />
            <input type="hidden" name="guideId" value={id} />
            <label className="field">
              <span className="field-label">Recipient member ID</span>
              <input className="field-control" name="targetPersonId" />
            </label>
            <label className="field">
              <span className="field-label">Or organization</span>
              <select className="field-control" name="targetOrganizationId">
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button-secondary">
              Request transfer
            </button>
          </form>
        </section>
      )}
      {guide.actorScopes.includes("archive") && (
        <section className="catalog-section">
          <h2>Archive or withdraw</h2>
          <p>
            Archived guides remain readable. Withdrawal removes the effective
            revision and its evidence from ordinary views.
          </p>
          <div className="action-row">
            <form action="/guides/actions" method="post">
              <input type="hidden" name="operation" value="archive" />
              <input type="hidden" name="guideId" value={id} />
              <button className="button button-secondary">Archive guide</button>
            </form>
            <form action="/guides/actions" method="post">
              <input type="hidden" name="operation" value="withdraw" />
              <input type="hidden" name="guideId" value={id} />
              <label className="field">
                <span className="field-label">Withdrawal reason</span>
                <input className="field-control" name="reason" required />
              </label>
              <button className="button button-quiet">
                Withdraw current revision
              </button>
            </form>
          </div>
        </section>
      )}
      <Link href="/guides">Back to guides</Link>
    </div>
  );
}
