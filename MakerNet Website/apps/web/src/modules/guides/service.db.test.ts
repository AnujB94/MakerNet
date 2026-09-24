import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pool } from "@/modules/db";
import {
  createSession,
  principalForToken,
  setAccountState,
} from "@/modules/identity/service";
import { getProfileView } from "@/modules/profiles/service";
import { emptyGuideContent } from "./content";
import {
  createGuide,
  saveDraft,
  inviteContributor,
  addEvidenceCandidate,
  respondInvitation,
  respondEvidence,
  publishGuide,
  getGuide,
  listGuideRevisions,
  withdrawCurrentRevision,
  startRevisionDraft,
} from "./service";
import {
  proposeEdit,
  reviewProposal,
  addMaintainer,
  revokeMaintainer,
  requestOwnershipTransfer,
  acceptOwnershipTransfer,
  requestVisibilityChange,
  acceptVisibilityChange,
} from "./collaboration";

describe("guide to profile evidence transaction", () => {
  it("snapshots consent, blocks stale publication, and withdraws evidence", async () => {
    const suffix = randomUUID();
    const createPerson = async (name: string) => {
      const email = `${name}-${suffix}@example.test`;
      const login = await createSession({
        issuer: "urn:makernet:test",
        subject: `${name}-${suffix}`,
        email,
        displayName: name,
      });
      return {
        ...login,
        email,
        actor: (await principalForToken(login.token))!,
      };
    };
    const owner = await createPerson("owner");
    const contributor = await createPerson("contributor");
    const proposer = await createPerson("proposer");
    const skillId = "00000000-0000-4000-8000-000000000004";
    const { guideId, draftId } = await createGuide(
      owner.actor,
      "how_to",
      "college",
      null,
    );
    const firstContent = {
      ...emptyGuideContent,
      title: "Folded paper model",
      goal: "Make a model with paper",
      steps: ["Fold one sheet", "Join the edges"],
      skills: [{ id: skillId, relationship: "taught" as const }],
      riskDeclaration: "no_hazards" as const,
    };
    const version = await saveDraft(owner.actor, draftId, firstContent, 0);
    const invitationId = await inviteContributor(
      owner.actor,
      draftId,
      contributor.email,
      "author",
      "Helped plan the folds",
      2,
    );
    await addEvidenceCandidate(owner.actor, invitationId, skillId);
    await expect(
      publishGuide(owner.actor, draftId, version, "First guide"),
    ).rejects.toThrow(/invitation/);
    await respondInvitation(
      contributor.actor,
      invitationId,
      true,
      "private",
      null,
      "Paper helper",
    );
    const candidate = await pool().query<{ id: string }>(
      `SELECT id FROM makernet.draft_evidence_candidate
      WHERE contribution_id = $1`,
      [invitationId],
    );
    await respondEvidence(contributor.actor, candidate.rows[0].id, true);
    const race = await Promise.allSettled([
      publishGuide(owner.actor, draftId, version, "First guide"),
      publishGuide(owner.actor, draftId, version, "Duplicate publish"),
    ]);
    expect(race.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(race.filter((item) => item.status === "rejected")).toHaveLength(1);
    const first = race.find((item) => item.status === "fulfilled")!.value;
    expect(first.version).toBe(1);
    const outsiderView = (await getGuide(proposer.actor, guideId))!;
    expect(outsiderView.credits[1]).toMatchObject({
      byline: "Paper helper",
      role: "author",
      note: "",
    });
    expect(outsiderView.credits[1]).not.toHaveProperty("personId");
    expect(
      (await getProfileView(proposer.actor, contributor.personId))?.evidence,
    ).toEqual([]);
    await expect(
      pool().query(
        `UPDATE makernet.guide_revision_authorship SET role = 'lead_author'
      WHERE revision_id = $1 AND person_id = $2`,
        [first.revisionId, contributor.personId],
      ),
    ).rejects.toThrow(/immutable/);
    const secondContent = {
      ...firstContent,
      steps: ["Fold a square sheet", "Join the edges"],
    };
    const proposalId = await proposeEdit(
      proposer.actor,
      guideId,
      secondContent,
    );
    const secondDraft = await reviewProposal(
      owner.actor,
      proposalId,
      true,
      "Clearer first step",
    );
    expect(secondDraft).toBeTruthy();
    const proposerInvite = await pool().query<{ id: string }>(
      `SELECT id FROM makernet.draft_contribution
      WHERE draft_id = $1 AND person_id = $2`,
      [secondDraft, proposer.personId],
    );
    await addEvidenceCandidate(owner.actor, proposerInvite.rows[0].id, skillId);
    await respondInvitation(
      proposer.actor,
      proposerInvite.rows[0].id,
      true,
      "college",
      null,
      "Contributor",
    );
    const candidate2 = await pool().query<{ id: string }>(
      `SELECT id FROM makernet.draft_evidence_candidate
      WHERE contribution_id = $1`,
      [proposerInvite.rows[0].id],
    );
    await respondEvidence(proposer.actor, candidate2.rows[0].id, true);
    const second = await publishGuide(
      owner.actor,
      secondDraft!,
      0,
      "Improved step",
    );
    expect(second.version).toBe(2);
    expect(
      (await listGuideRevisions(owner.actor, guideId)).map(
        (revision) => revision.version,
      ),
    ).toEqual([2, 1]);
    expect(
      (await getGuide(owner.actor, guideId, first.revisionId))?.revision.content
        .steps[0],
    ).toBe("Fold one sheet");
    const evidence = (await getProfileView(owner.actor, proposer.personId))
      ?.evidence;
    expect(evidence?.map((item) => item.skillId)).toContain(skillId);
    await withdrawCurrentRevision(
      owner.actor,
      guideId,
      "Contributor requested withdrawal",
    );
    expect(await getGuide(owner.actor, guideId)).toBeNull();
    expect(
      (await getProfileView(owner.actor, proposer.personId))?.evidence,
    ).toEqual([]);
    const projected = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection
      WHERE person_id = $1 AND evidence_count > 0`,
      [proposer.personId],
    );
    expect(projected.rowCount).toBe(0);
  });
});

describe("guide stewardship and visibility", () => {
  const createPerson = async (name: string) => {
    const suffix = randomUUID();
    const login = await createSession({
      issuer: "urn:makernet:test",
      subject: `${name}-${suffix}`,
      email: `${name}-${suffix}@example.test`,
      displayName: name,
    });
    return { ...login, actor: (await principalForToken(login.token))! };
  };

  it("requires a replacement owner and archives an unstaffed departed guide", async () => {
    const owner = await createPerson("steward");
    const successor = await createPerson("successor");
    const admin = await createPerson("admin");
    await pool().query(
      `INSERT INTO makernet.role_grant(person_id, role, scope_type, granted_by)
       VALUES ($1, 'administrator', 'site', $1)`,
      [admin.personId],
    );
    const adminActor = (await principalForToken(admin.token))!;
    const { guideId } = await createGuide(
      owner.actor,
      "how_to",
      "college",
      null,
    );
    await expect(
      revokeMaintainer(owner.actor, guideId, owner.personId),
    ).rejects.toThrow();
    await addMaintainer(owner.actor, guideId, successor.personId, [
      "publish_revisions",
    ]);
    const transferId = await requestOwnershipTransfer(
      owner.actor,
      guideId,
      successor.personId,
      null,
    );
    await acceptOwnershipTransfer(successor.actor, transferId);
    const transferred = await pool().query<{ owner_person_id: string }>(
      `SELECT owner_person_id FROM makernet.guide WHERE id = $1`,
      [guideId],
    );
    expect(transferred.rows[0].owner_person_id).toBe(successor.personId);
    const solo = await createGuide(owner.actor, "how_to", "college", null);
    await setAccountState(adminActor, owner.personId, "departed", "Graduated");
    expect(await principalForToken(owner.token)).toBeNull();
    const archived = await pool().query<{ status: string }>(
      `SELECT status FROM makernet.guide WHERE id = $1`,
      [solo.guideId],
    );
    expect(archived.rows[0].status).toBe("archived");
  });

  it("keeps the old revision private after a wider guide visibility is approved", async () => {
    const owner = await createPerson("clubowner");
    const outsider = await createPerson("cluboutsider");
    const organization = await pool().query<{ id: string }>(
      `INSERT INTO makernet.organization(name, type) VALUES ($1, 'club') RETURNING id`,
      [`Guide club ${randomUUID()}`],
    );
    const orgId = organization.rows[0].id;
    await pool().query(
      `INSERT INTO makernet.organization_membership(person_id, organization_id, role, status)
       VALUES ($1, $2, 'member', 'active')`,
      [owner.personId, orgId],
    );
    const member = (await principalForToken(owner.token))!;
    const { guideId, draftId } = await createGuide(
      member,
      "how_to",
      "organization",
      orgId,
    );
    const content = {
      ...emptyGuideContent,
      title: "Club paper craft",
      goal: "Make a paper model",
      steps: ["Fold the sheet"],
      riskDeclaration: "no_hazards" as const,
    };
    const version = await saveDraft(member, draftId, content, 0);
    const first = await publishGuide(member, draftId, version, "Club edition");
    expect(await getGuide(outsider.actor, guideId)).toBeNull();
    const changeId = await requestVisibilityChange(
      member,
      guideId,
      "college",
      null,
    );
    const pending = await pool().query<{ status: string }>(
      `SELECT status FROM makernet.guide_visibility_change WHERE id = $1`,
      [changeId],
    );
    expect(pending.rows[0].status).toBe("pending");
    await acceptVisibilityChange(member, changeId);
    expect(
      await getGuide(outsider.actor, guideId, first.revisionId),
    ).toBeNull();
    const nextDraft = await startRevisionDraft(member, guideId);
    const nextVersion = await saveDraft(
      member,
      nextDraft,
      { ...content, steps: ["Fold two sheets"] },
      0,
    );
    await publishGuide(member, nextDraft, nextVersion, "College edition");
    expect(
      (await getGuide(outsider.actor, guideId))?.revision.content.steps,
    ).toEqual(["Fold two sheets"]);
  });
});
