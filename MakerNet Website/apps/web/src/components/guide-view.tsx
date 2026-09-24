import Link from "next/link";
import type { GuideView as GuideData } from "@/modules/guides/service";

export function GuideDisplay({ guide }: { guide: GuideData }) {
  const content = guide.revision.content;
  return (
    <article className="guide-article">
      <p className="eyebrow">
        {guide.type.replaceAll("_", " ")} / Revision {guide.revision.version}
      </p>
      <h1>{content.title}</h1>
      <p className="guide-goal">{content.goal}</p>
      {guide.status === "archived" && (
        <p className="alert warning">
          This guide is archived and no longer appears in normal discovery.
        </p>
      )}
      {guide.revision.safetyStatus === "under_review" && (
        <p className="alert warning">This revision is under safety review.</p>
      )}
      <section className="guide-section">
        <h2>Contributors</h2>
        <ol className="credit-list">
          {guide.credits.map((credit, index) => (
            <li key={index}>
              {credit.personId ? (
                <Link href={`/members/${credit.personId}`}>
                  {credit.byline}
                </Link>
              ) : (
                <span>{credit.byline}</span>
              )}
              <small>{credit.role.replaceAll("_", " ")}</small>
              {credit.note && <p>{credit.note}</p>}
            </li>
          ))}
        </ol>
      </section>
      {content.prerequisites.length > 0 && (
        <section className="guide-section">
          <h2>Before you start</h2>
          <ul>
            {content.prerequisites.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {content.materials.length > 0 && (
        <section className="guide-section">
          <h2>Bill of materials</h2>
          <ul>
            {content.materials.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="guide-section">
        <h2>Steps</h2>
        <ol>
          {content.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>
      {content.lessons && (
        <section className="guide-section">
          <h2>Lessons learned</h2>
          <p>{content.lessons}</p>
        </section>
      )}
      <p className="field-hint">
        Published{" "}
        {new Date(guide.revision.publishedAt).toLocaleDateString("en-GB", {
          dateStyle: "long",
        })}
      </p>
    </article>
  );
}
