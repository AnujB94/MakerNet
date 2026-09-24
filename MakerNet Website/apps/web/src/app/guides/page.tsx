import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { listMyGuides, myInvitations } from "@/modules/guides/service";

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [guides, invitations] = await Promise.all([
    listMyGuides(actor),
    myInvitations(actor),
  ]);
  return (
    <div className="container catalog-page">
      <div className="page-heading">
        <p className="eyebrow">MakerNet / Guides</p>
        <h1>Your workshop notes</h1>
        <p>
          Write a guide, invite collaborators, and publish a clear revision with
          accepted credit.
        </p>
        <Link className="button-link button-primary" href="/guides/new">
          Start a guide
        </Link>
      </div>
      <p>
        <Link href="/guides/requests">Stewardship and audience requests</Link>
      </p>
      <section className="catalog-section">
        <h2>Guides you maintain</h2>
        {guides.length ? (
          <ul className="record-list">
            {guides.map((guide) => (
              <li key={guide.guide_id}>
                <strong>{guide.title || "Untitled guide"}</strong>
                <span>
                  {guide.status} ·{" "}
                  {guide.version ? `Revision ${guide.version}` : "Draft"}
                </span>
                <div className="action-row">
                  {guide.draft_id && (
                    <Link href={`/guides/drafts/${guide.draft_id}`}>
                      Continue draft
                    </Link>
                  )}
                  {guide.version && (
                    <Link href={`/guides/${guide.guide_id}`}>Read guide</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>No guides yet</h3>
            <p>Start with a practical task you can explain step by step.</p>
          </div>
        )}
      </section>
      <section className="catalog-section">
        <h2>Contributor invitations</h2>
        {invitations.length ? (
          <ul className="record-list">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <strong>{invitation.title}</strong>
                <span>{invitation.role.replaceAll("_", " ")}</span>
                <Link href={`/guides/invitations/${invitation.id}`}>
                  Respond to invitation
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No pending invitations.</p>
        )}
      </section>
    </div>
  );
}
