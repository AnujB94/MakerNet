import { redirect } from "next/navigation";
import { auditHistory } from "@/modules/identity/service";
import { currentPrincipal } from "@/modules/identity/web";
import { canAdminister } from "@/modules/identity/policy";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const principal = await currentPrincipal();
  if (!principal) redirect("/session-expired");
  if (!canAdminister(principal)) redirect("/access-denied");
  const events = await auditHistory(principal);
  return (
    <div className="container form-page">
      <p className="eyebrow">Administration / Audit</p>
      <h1>Recent account events</h1>
      {events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <ol className="record-list">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.action.replaceAll("_", " ")}</strong>
              <span>
                {event.target_type} · {event.target_id}
              </span>
              <small>
                {event.reason} · {event.occurred_at.toISOString()}
              </small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
