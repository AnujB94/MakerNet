import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideDisplay } from "@/components/guide-view";
import { currentPrincipal } from "@/modules/identity/web";
import { getGuide } from "@/modules/guides/service";

export const dynamic = "force-dynamic";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ id: string; revisionId: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const { id, revisionId } = await params;
  const guide = await getGuide(actor, id, revisionId);
  if (!guide) notFound();
  return (
    <div className="container form-page">
      <GuideDisplay guide={guide} />
      <Link href={`/guides/${id}/history`}>Back to history</Link>
    </div>
  );
}
