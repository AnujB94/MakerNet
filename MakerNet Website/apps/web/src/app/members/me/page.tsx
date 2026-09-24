import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileDisplay } from "@/components/profile-view";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";

export const dynamic = "force-dynamic";

export default async function OwnProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const view = await getProfileView(actor, actor.id);
  const query = await searchParams;
  return (
    <div className="container form-page">
      {query.saved && (
        <p role="status" className="alert success">
          Your profile was updated.
        </p>
      )}
      {view && <ProfileDisplay view={view} />}
      <nav className="action-row" aria-label="Profile settings">
        <Link className="button-link button-primary" href="/members/me/edit">
          Edit profile
        </Link>
        <Link
          className="button-link button-secondary"
          href="/members/me/skills"
        >
          Manage skills
        </Link>
        <Link
          className="button-link button-secondary"
          href="/members/me/privacy"
        >
          Privacy and preview
        </Link>
        <Link className="button-link button-quiet" href="/members/me/help">
          Willingness to help
        </Link>
      </nav>
    </div>
  );
}
