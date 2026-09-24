import { redirect } from "next/navigation";
import { pool, one } from "@/modules/db";
import { currentPrincipal } from "@/modules/identity/web";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ renewed?: string }>;
}) {
  const principal = await currentPrincipal();
  if (!principal) redirect("/session-expired");
  const person = await one<{ display_name: string; institution_email: string }>(
    pool(),
    `SELECT display_name, institution_email FROM makernet.person WHERE id = $1`,
    [principal.id],
  );
  const query = await searchParams;
  return (
    <div className="container form-page">
      <p className="eyebrow">Account / Settings</p>
      <h1>Your account</h1>
      {query.renewed && (
        <p role="status" className="alert success">
          Your session was renewed.
        </p>
      )}
      <dl className="detail-list">
        <dt>Name</dt>
        <dd>{person?.display_name}</dd>
        <dt>College email</dt>
        <dd>{person?.institution_email}</dd>
      </dl>
      <div className="action-row">
        <form action="/auth/refresh" method="post">
          <button className="button button-secondary">Renew session</button>
        </form>
        <form action="/auth/logout" method="post">
          <button className="button button-quiet">Sign out</button>
        </form>
      </div>
    </div>
  );
}
