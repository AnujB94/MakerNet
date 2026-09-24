import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { myGuideRequests } from "@/modules/guides/collaboration";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const requests = await myGuideRequests(actor);
  return (
    <div className="container form-page">
      <p className="eyebrow">Guides / Requests</p>
      <h1>Stewardship and audience requests</h1>
      <section className="catalog-section">
        <h2>Ownership transfers</h2>
        {requests.transfers.length ? (
          <ul className="record-list">
            {requests.transfers.map((transfer) => (
              <li key={transfer.id}>
                <span>Guide {transfer.guide_id}</span>
                <form action="/guides/actions" method="post">
                  <input
                    type="hidden"
                    name="operation"
                    value="acceptTransfer"
                  />
                  <input type="hidden" name="transferId" value={transfer.id} />
                  <button className="button button-primary">
                    Accept stewardship
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>No transfer requests.</p>
        )}
      </section>
      <section className="catalog-section">
        <h2>Wider-audience consent</h2>
        {requests.consents.length ? (
          <ul className="record-list">
            {requests.consents.map((consent) => (
              <li key={consent.change_id}>
                <span>
                  Guide {consent.guide_id} · proposed {consent.new_visibility}{" "}
                  audience
                </span>
                <form action="/guides/actions" method="post">
                  <input
                    type="hidden"
                    name="operation"
                    value="acceptVisibility"
                  />
                  <input
                    type="hidden"
                    name="changeId"
                    value={consent.change_id}
                  />
                  <button className="button button-secondary">
                    Accept wider audience
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>No consent requests.</p>
        )}
      </section>
      <Link href="/guides">Back to guides</Link>
    </div>
  );
}
