import { serverEnvironment } from "@/config/env";
import { ActionLink, TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { appVersion, buildCommit } = serverEnvironment();
  return (
    <div className="container landing">
      <div>
        <p className="eyebrow">MakerNet / Design foundation</p>
        <h1>A shared workshop starts with a clear place to work.</h1>
        <p className="landing-lead">
          MakerNet brings the language of a workshop notebook to the web: direct
          actions, readable detail, and room for people to make together.
        </p>
        <div className="landing-actions">
          <ActionLink href="/design-system">
            Explore the design system
          </ActionLink>
          <TextLink href="/api/health">View service health</TextLink>
        </div>
      </div>
      <aside className="release-panel" aria-label="Application information">
        <h2>Current build</h2>
        <dl>
          <dt>Version</dt>
          <dd>{appVersion}</dd>
          <dt>Commit</dt>
          <dd>{buildCommit.slice(0, 7)}</dd>
          <dt>Health</dt>
          <dd>
            <TextLink href="/api/health">Check status</TextLink>
          </dd>
        </dl>
      </aside>
    </div>
  );
}
