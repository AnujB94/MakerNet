import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { ownOrganizations } from "@/modules/identity/service";
import { invitationDetail } from "@/modules/guides/service";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
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
  const invitation = await invitationDetail(actor, id);
  if (!invitation) notFound();
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / Contribution</p>
      <h1>Respond to your credit</h1>
      <p>
        Role: {invitation.role.replaceAll("_", " ")}.{" "}
        {invitation.contribution_note}
      </p>
      {query.error && (
        <p role="alert" className="alert error">
          Response could not be saved.
        </p>
      )}
      {query.saved && (
        <p role="status" className="alert success">
          Your response was saved.
        </p>
      )}
      {invitation.invitation_status === "pending" && (
        <form className="form-stack" action="/guides/actions" method="post">
          <input type="hidden" name="operation" value="respondInvite" />
          <input type="hidden" name="contributionId" value={id} />
          <label className="field">
            <span className="field-label">
              Maximum audience for your named credit
            </span>
            <select
              className="field-control"
              name="audience"
              defaultValue="college"
            >
              <option value="college">College members</option>
              <option value="private">Only me; use pseudonym for others</option>
              {organizations.length > 0 && (
                <option value="organization">One organization</option>
              )}
            </select>
          </label>
          {organizations.length > 0 && (
            <label className="field">
              <span className="field-label">Organization, if selected</span>
              <select className="field-control" name="organizationId">
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="field-label">
              Byline for viewers outside your named-credit audience
            </span>
            <input
              className="field-control"
              name="byline"
              defaultValue="Contributor"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <div className="action-row">
            <button
              className="button button-primary"
              name="decision"
              value="accept"
            >
              Accept credit
            </button>
            <button
              className="button button-secondary"
              name="decision"
              value="decline"
            >
              Decline
            </button>
          </div>
        </form>
      )}
      {invitation.invitation_status !== "pending" && (
        <p className="alert info">
          Credit response: {invitation.invitation_status}.
        </p>
      )}
      <section className="catalog-section">
        <h2>Skill evidence candidates</h2>
        <p>
          Accept only skills your contribution demonstrates. Rejected or pending
          candidates do not become evidence.
        </p>
        {invitation.candidates.length ? (
          <ul className="record-list">
            {invitation.candidates.map((candidate) => (
              <li key={candidate.id}>
                <strong>{candidate.skill_name}</strong>
                <span>{candidate.status}</span>
                {candidate.status === "pending" &&
                  invitation.invitation_status === "accepted" && (
                    <form
                      className="action-row"
                      action="/guides/actions"
                      method="post"
                    >
                      <input
                        type="hidden"
                        name="operation"
                        value="respondEvidence"
                      />
                      <input
                        type="hidden"
                        name="candidateId"
                        value={candidate.id}
                      />
                      <input type="hidden" name="contributionId" value={id} />
                      <button
                        className="button button-secondary"
                        name="decision"
                        value="accept"
                      >
                        Accept evidence
                      </button>
                      <button
                        className="button button-quiet"
                        name="decision"
                        value="decline"
                      >
                        Reject evidence
                      </button>
                    </form>
                  )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No skill evidence proposed.</p>
        )}
      </section>
      <Link href="/guides">Back to guides</Link>
    </div>
  );
}
