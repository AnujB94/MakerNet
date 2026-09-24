import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { getGuide, listGuideRevisions } from "@/modules/guides/service";

export const dynamic = "force-dynamic";

export default async function GuideHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const { id } = await params;
  if (!(await getGuide(actor, id))) notFound();
  const revisions = await listGuideRevisions(actor, id);
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / History</p>
      <h1>Published revisions</h1>
      <ol className="record-list">
        {revisions.map((revision) => (
          <li key={revision.id}>
            <Link href={`/guides/${id}/revisions/${revision.id}`}>
              <strong>
                Revision {revision.version}: {revision.title}
              </strong>
            </Link>
            <span>
              {revision.status} ·{" "}
              {revision.publishedAt.toLocaleDateString("en-GB")}
            </span>
          </li>
        ))}
      </ol>
      <Link href={`/guides/${id}`}>Back to guide</Link>
    </div>
  );
}
