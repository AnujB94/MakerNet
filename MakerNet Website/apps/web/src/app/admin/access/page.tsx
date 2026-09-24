import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPrincipal } from "@/modules/identity/web";
import { canAdminister } from "@/modules/identity/policy";
import { listAccounts, listOrganizations } from "@/modules/identity/service";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function AccessAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const actor = await currentPrincipal();
  if (!actor) redirect("/session-expired");
  if (!canAdminister(actor)) redirect("/access-denied");
  const [accounts, organizations, skills, query] = await Promise.all([
    listAccounts(actor),
    listOrganizations(actor),
    listSkills(),
    searchParams,
  ]);
  return (
    <div className="container form-page">
      <p className="eyebrow">Administration / Access</p>
      <h1>Accounts and scoped roles</h1>
      {query.result === "saved" && (
        <p role="status" className="alert success">
          Access change saved and audited.
        </p>
      )}
      {query.result === "invalid" && (
        <p role="alert" className="alert error">
          Change rejected. Check the account, scope, and reason.
        </p>
      )}
      <section className="catalog-section">
        <h2>Recent accounts</h2>
        <ul className="record-list">
          {accounts.map((account) => (
            <li key={account.id}>
              <strong>{account.display_name}</strong>
              <span>
                {account.institution_email} · {account.state}
              </span>
              <small>{account.id}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="catalog-section">
        <h2>Account state</h2>
        <form
          className="form-stack"
          action="/admin/access/actions"
          method="post"
        >
          <input type="hidden" name="operation" value="state" />
          <label className="field">
            <span className="field-label">Person ID</span>
            <input className="field-control" name="personId" required />
          </label>
          <label className="field">
            <span className="field-label">State</span>
            <select className="field-control" name="state">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="departed">Departed</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Reason</span>
            <input className="field-control" name="reason" required />
          </label>
          <button className="button button-secondary">
            Apply account state
          </button>
        </form>
      </section>
      <section className="catalog-section">
        <h2>Site or skill role</h2>
        <form
          className="form-stack"
          action="/admin/access/actions"
          method="post"
        >
          <label className="field">
            <span className="field-label">Person ID</span>
            <input className="field-control" name="personId" required />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select className="field-control" name="role">
              <option value="moderator">Moderator</option>
              <option value="administrator">Administrator</option>
              <option value="staff_reviewer">
                Staff reviewer for one skill
              </option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              Skill scope, for staff reviewers
            </span>
            <select className="field-control" name="skillId">
              <option value="">Site role</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Reason</span>
            <input className="field-control" name="reason" required />
          </label>
          <div className="action-row">
            <button
              className="button button-secondary"
              name="operation"
              value="grantRole"
            >
              Grant
            </button>
            <button
              className="button button-quiet"
              name="operation"
              value="revokeRole"
            >
              Revoke
            </button>
          </div>
        </form>
      </section>
      <section className="catalog-section">
        <h2>Organizations</h2>
        <ul className="record-list">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <strong>{organization.name}</strong>
              <span>{organization.type}</span>
              <small>{organization.id}</small>
            </li>
          ))}
        </ul>
        <form
          className="form-stack"
          action="/admin/access/actions"
          method="post"
        >
          <h3>Create organization</h3>
          <input type="hidden" name="operation" value="createOrganization" />
          <label className="field">
            <span className="field-label">Name</span>
            <input className="field-control" name="name" required />
          </label>
          <label className="field">
            <span className="field-label">Type</span>
            <select className="field-control" name="type">
              <option value="club">Club</option>
              <option value="lab">Lab</option>
              <option value="department">Department</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Reason</span>
            <input className="field-control" name="reason" required />
          </label>
          <button className="button button-secondary">
            Create organization
          </button>
        </form>
        <form
          className="form-stack"
          action="/admin/access/actions"
          method="post"
        >
          <h3>Change membership</h3>
          <label className="field">
            <span className="field-label">Person ID</span>
            <input className="field-control" name="personId" required />
          </label>
          <label className="field">
            <span className="field-label">Organization</span>
            <select className="field-control" name="organizationId" required>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Membership role</span>
            <select className="field-control" name="membershipRole">
              <option value="member">Member</option>
              <option value="officer">Officer</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Reason</span>
            <input className="field-control" name="reason" required />
          </label>
          <div className="action-row">
            <button
              className="button button-secondary"
              name="operation"
              value="grantMembership"
            >
              Grant
            </button>
            <button
              className="button button-quiet"
              name="operation"
              value="endMembership"
            >
              End membership
            </button>
          </div>
        </form>
      </section>
      <Link href="/admin/audit">View audit history</Link>
    </div>
  );
}
