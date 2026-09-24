import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { listProposals } from "@/modules/guides/collaboration";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const proposals = await listProposals(actor, id).catch(() =>
    redirect("/access-denied"),
  );
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / Proposals</p>
      <h1>Review proposed edits</h1>
      {query.error && (
        <p role="alert" className="alert error">
          Decision could not be saved. The proposal may be stale or another
          draft may be open.
        </p>
      )}
      {proposals.length ? (
        <ul className="record-list">
          {proposals.map((proposal) => {
            const content = proposal.content as {
              title?: string;
              goal?: string;
              steps?: string[];
            };
            return (
              <li key={proposal.id}>
                <strong>{content.title || "Untitled proposal"}</strong>
                <span>
                  {proposal.status} ·{" "}
                  {proposal.created_at.toLocaleDateString("en-GB")}
                </span>
                <p>{content.goal}</p>
                <ol>
                  {content.steps?.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                {proposal.status === "pending" && (
                  <form
                    className="form-stack"
                    action="/guides/actions"
                    method="post"
                  >
                    <input
                      type="hidden"
                      name="operation"
                      value="reviewProposal"
                    />
                    <input
                      type="hidden"
                      name="proposalId"
                      value={proposal.id}
                    />
                    <input type="hidden" name="guideId" value={id} />
                    <label className="field">
                      <span className="field-label">Decision reason</span>
                      <input
                        className="field-control"
                        name="reason"
                        required
                        maxLength={500}
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="button button-primary"
                        name="decision"
                        value="accept"
                      >
                        Accept into a draft
                      </button>
                      <button
                        className="button button-secondary"
                        name="decision"
                        value="reject"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>No proposals</h2>
          <p>Member suggestions appear here.</p>
        </div>
      )}
      <Link href={`/guides/${id}`}>Back to guide</Link>
    </div>
  );
}
