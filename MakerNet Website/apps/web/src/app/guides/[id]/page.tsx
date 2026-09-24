import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideDisplay } from "@/components/guide-view";
import { currentPrincipal } from "@/modules/identity/web";
import { getGuide } from "@/modules/guides/service";
import { canManageGuide } from "@/modules/guides/collaboration";

export const dynamic = "force-dynamic";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const { id } = await params;
  const guide = await getGuide(actor, id);
  if (!guide) notFound();
  const maintainer = await canManageGuide(actor, id, "publish_revisions");
  return (
    <div className="container form-page">
      <GuideDisplay guide={guide} />
      <nav className="action-row" aria-label="Guide actions">
        <Link href={`/guides/${id}/history`}>Revision history</Link>
        <Link href={`/guides/${id}/propose`}>Propose an edit</Link>
        {maintainer && (
          <>
            <Link href={`/guides/${id}/proposals`}>Review proposals</Link>
            <Link href={`/guides/${id}/manage`}>Manage guide</Link>
          </>
        )}
      </nav>
    </div>
  );
}
