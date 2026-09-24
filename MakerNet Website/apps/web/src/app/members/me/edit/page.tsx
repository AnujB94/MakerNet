import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const view = await getProfileView(actor, actor.id);
  const fields = view?.fields ?? {};
  const query = await searchParams;
  return (
    <div className="container form-page">
      <p className="eyebrow">Profile / Edit</p>
      <h1>Tell the workshop about yourself</h1>
      {query.error && (
        <p role="alert" className="alert error">
          Check the profile fields and try again.
        </p>
      )}
      <form className="form-stack" action="/members/me/actions" method="post">
        <input type="hidden" name="operation" value="edit" />
        <label className="field">
          <span className="field-label">Display name</span>
          <input
            className="field-control"
            name="displayName"
            defaultValue={String(fields.name ?? "")}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          <span className="field-label">Biography</span>
          <textarea
            className="field-control"
            name="biography"
            defaultValue={String(fields.biography ?? "")}
            maxLength={4000}
          />
        </label>
        <label className="field">
          <span className="field-label">Year</span>
          <select
            className="field-control"
            name="year"
            defaultValue={fields.year?.toString() ?? ""}
          >
            <option value="">Prefer not to say</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Department</span>
          <input
            className="field-control"
            name="department"
            defaultValue={String(fields.department ?? "")}
            maxLength={120}
          />
        </label>
        <button className="button button-primary">Save profile</button>
      </form>
      <Link href="/members/me">Back to profile</Link>
    </div>
  );
}
