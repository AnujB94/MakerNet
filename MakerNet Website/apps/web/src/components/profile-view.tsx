import Link from "next/link";
import type { ProfileView } from "@/modules/profiles/service";

export function ProfileDisplay({ view }: { view: ProfileView }) {
  if (view.status === "unavailable")
    return (
      <div className="empty-state">
        <h2>Profile unavailable</h2>
        <p>This member has departed or deactivated their profile.</p>
      </div>
    );
  const fields = view.fields;
  const name =
    typeof fields.name === "string" ? fields.name : "MakerNet contributor";
  return (
    <div className="profile-display">
      <p className="eyebrow">Member profile</p>
      <h1>{name}</h1>
      {typeof view.completion === "number" && (
        <p className="field-hint">Profile completion: {view.completion}%</p>
      )}
      {typeof fields.biography === "string" && fields.biography && (
        <p className="profile-biography">{fields.biography}</p>
      )}
      <dl className="detail-list">
        {typeof fields.year === "number" && (
          <>
            <dt>Year</dt>
            <dd>{fields.year}</dd>
          </>
        )}
        {typeof fields.department === "string" && fields.department && (
          <>
            <dt>Department</dt>
            <dd>{fields.department}</dd>
          </>
        )}
        {typeof fields.willingness_to_help === "boolean" && (
          <>
            <dt>Willing to help</dt>
            <dd>{fields.willingness_to_help ? "Yes" : "No"}</dd>
          </>
        )}
        {Array.isArray(fields.organizations) &&
          fields.organizations.length > 0 && (
            <>
              <dt>Organizations</dt>
              <dd>{fields.organizations.map((org) => org.name).join(", ")}</dd>
            </>
          )}
      </dl>
      {view.claims && (
        <section className="catalog-section">
          <h2>Self-declared skills</h2>
          {view.claims.length ? (
            <ul className="record-list">
              {view.claims.map((claim) => (
                <li key={claim.id}>
                  <Link href={`/skills/${claim.skillId}`}>
                    {claim.skillName}
                  </Link>
                  {claim.statement && <span>{claim.statement}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <h3>No skills yet</h3>
              <p>Skills appear here after the member adds them.</p>
            </div>
          )}
        </section>
      )}
      {view.evidence && (
        <section className="catalog-section">
          <h2>Accepted guide evidence</h2>
          {view.evidence.length ? (
            <ul className="record-list">
              {view.evidence.map((item) => (
                <li key={item.id}>
                  <strong>{item.skillName}</strong>
                  <Link href={`/guides/${item.guideId}`}>
                    {item.guideTitle}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No accepted guide evidence visible to this audience.</p>
          )}
        </section>
      )}
    </div>
  );
}
