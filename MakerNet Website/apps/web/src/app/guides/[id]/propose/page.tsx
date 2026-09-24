import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideEditorFields } from "@/components/guide-editor-fields";
import { currentPrincipal } from "@/modules/identity/web";
import { getGuide } from "@/modules/guides/service";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function ProposePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const [{ id }, skills, query] = await Promise.all([
    params,
    listSkills(),
    searchParams,
  ]);
  const guide = await getGuide(actor, id);
  if (!guide) notFound();
  return (
    <div className="container form-page">
      <p className="eyebrow">Guide / Proposed edit</p>
      <h1>Suggest a clearer revision</h1>
      <p>
        Your changes go to a maintainer for review. The current revision stays
        published.
      </p>
      {query.error && (
        <p role="alert" className="alert error">
          Proposal could not be saved.
        </p>
      )}
      {query.saved && (
        <p role="status" className="alert success">
          Proposal sent to maintainers.
        </p>
      )}
      <form className="form-stack" action="/guides/actions" method="post">
        <input type="hidden" name="operation" value="propose" />
        <input type="hidden" name="guideId" value={id} />
        <GuideEditorFields content={guide.revision.content} skills={skills} />
        <button className="button button-primary">Submit proposal</button>
      </form>
      <Link href={`/guides/${id}`}>Back to guide</Link>
    </div>
  );
}
