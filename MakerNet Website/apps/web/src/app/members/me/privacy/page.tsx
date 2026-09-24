import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileDisplay } from "@/components/profile-view";
import { currentPrincipal } from "@/modules/identity/web";
import { ownOrganizations } from "@/modules/identity/service";
import { ownProfileSettings, previewProfile } from "@/modules/profiles/service";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{
    audience?: string;
    organizationId?: string;
    result?: string;
  }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [settings, organizations, query] = await Promise.all([
    ownProfileSettings(actor),
    ownOrganizations(actor),
    searchParams,
  ]);
  const audience =
    query.audience === "anonymous" ||
    (query.audience === "organization" && organizations.length > 0)
      ? query.audience
      : "college";
  const orgId = query.organizationId || organizations[0]?.id || null;
  const view = await previewProfile(actor, audience, orgId);
  return (
    <div className="container form-page">
      <p className="eyebrow">Profile / Privacy</p>
      <h1>Choose who sees each detail</h1>
      <p>
        Profiles stay inside the college during internal alpha. A more
        restricted field or skill claim always limits what a viewer sees.
      </p>
      {query.result === "saved" && (
        <p role="status" className="alert success">
          Visibility saved.
        </p>
      )}
      {query.result === "invalid" && (
        <p role="alert" className="alert error">
          The selected audience could not be applied.
        </p>
      )}
      <div className="privacy-settings">
        {settings.map((setting) => (
          <form
            className="privacy-row"
            action="/members/me/actions"
            method="post"
            key={setting.field}
          >
            <input type="hidden" name="operation" value="visibility" />
            <input type="hidden" name="field" value={setting.field} />
            <label className="field">
              <span className="field-label">
                {setting.field.replaceAll("_", " ")}
              </span>
              <select
                className="field-control"
                name="audience"
                defaultValue={setting.audience}
              >
                <option value="college">College members</option>
                <option value="private">Only me</option>
                {organizations.length > 0 && (
                  <option value="organization">One organization</option>
                )}
              </select>
            </label>
            {organizations.length > 0 && (
              <label className="field">
                <span className="field-label">Organization</span>
                <select
                  className="field-control"
                  name="organizationId"
                  defaultValue={setting.organizationId ?? ""}
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
            <button className="button button-secondary">Save</button>
          </form>
        ))}
      </div>
      <section className="catalog-section">
        <h2>Preview another audience</h2>
        <form className="form-stack" method="get" action="/members/me/privacy">
          <label className="field">
            <span className="field-label">Viewer</span>
            <select
              className="field-control"
              name="audience"
              defaultValue={audience}
            >
              <option value="anonymous">Anonymous visitor</option>
              <option value="college">College member</option>
              {organizations.length > 0 && (
                <option value="organization">Organization member</option>
              )}
            </select>
          </label>
          {organizations.length > 0 && (
            <label className="field">
              <span className="field-label">Organization</span>
              <select
                className="field-control"
                name="organizationId"
                defaultValue={orgId ?? ""}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="button button-secondary">Preview</button>
        </form>
        <div className="preview-panel" aria-live="polite">
          {view ? (
            <ProfileDisplay view={view} />
          ) : (
            <div className="empty-state">
              <h3>No profile shown</h3>
              <p>
                Anonymous visitors cannot view member profiles during internal
                alpha.
              </p>
            </div>
          )}
        </div>
      </section>
      <details className="deactivate-panel">
        <summary>Deactivate my profile</summary>
        <p>
          Your profile and its skill projection will disappear from member
          views. You can restore the profile by editing it again.
        </p>
        <form action="/members/me/actions" method="post">
          <input type="hidden" name="operation" value="deactivate" />
          <button className="button button-secondary">
            Deactivate profile
          </button>
        </form>
      </details>
      <p>
        <Link href="/api/me/export">Download profile data</Link>
      </p>
      <Link href="/members/me">Back to profile</Link>
    </div>
  );
}
