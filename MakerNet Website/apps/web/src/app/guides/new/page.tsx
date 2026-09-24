import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { ownOrganizations } from "@/modules/identity/service";

export const dynamic = "force-dynamic";

export default async function NewGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [organizations, query] = await Promise.all([
    ownOrganizations(actor),
    searchParams,
  ]);
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / New</p>
      <h1>Start a useful guide</h1>
      <p>
        Begin privately or within your college. You can invite collaborators
        after creating the draft.
      </p>
      {query.error && (
        <p role="alert" className="alert error">
          The guide could not be created. Check the audience.
        </p>
      )}
      <form className="form-stack" action="/guides/actions" method="post">
        <input type="hidden" name="operation" value="create" />
        <label className="field">
          <span className="field-label">Guide type</span>
          <select className="field-control" name="type">
            <option value="how_to">How-to guide</option>
            <option value="build_log">Build log</option>
            <option value="reference">Reference</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Audience</span>
          <select className="field-control" name="visibility">
            <option value="college">College members</option>
            <option value="private">Invited collaborators only</option>
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
        <button className="button button-primary">Create draft</button>
      </form>
      <Link href="/guides">Back to guides</Link>
    </div>
  );
}
