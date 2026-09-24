import { notFound, redirect } from "next/navigation";
import { ProfileDisplay } from "@/components/profile-view";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const { id } = await params;
  const view = await getProfileView(actor, id);
  if (!view) notFound();
  return (
    <div className="container form-page">
      <ProfileDisplay view={view} />
    </div>
  );
}
