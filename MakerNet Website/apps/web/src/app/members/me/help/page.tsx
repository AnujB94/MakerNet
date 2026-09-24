import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";

export const dynamic = "force-dynamic";

export default async function HelpSettingsPage() {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  const view = await getProfileView(actor, actor.id);
  return (
    <div className="container form-page">
      <p className="eyebrow">Profile / Help</p>
      <h1>Willingness to help</h1>
      <p>
        This setting tells eligible members if they can approach you. Contact
        requests arrive in a later subsystem.
      </p>
      <form className="form-stack" action="/members/me/actions" method="post">
        <input type="hidden" name="operation" value="help" />
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="willing"
            defaultChecked={view?.fields.willingness_to_help === true}
          />
          <span>I am willing to help with my listed skills.</span>
        </label>
        <button className="button button-primary">Save preference</button>
      </form>
      <Link href="/members/me">Back to profile</Link>
    </div>
  );
}
