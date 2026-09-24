import { NextResponse } from "next/server";
import {
  currentPrincipal,
  sameOriginPost,
  siteUrl,
} from "@/modules/identity/web";
import {
  createGuide,
  saveDraft,
  inviteContributor,
  addEvidenceCandidate,
  respondInvitation,
  respondEvidence,
  publishGuide,
  startRevisionDraft,
  archiveGuide,
  withdrawCurrentRevision,
  type GuideVisibility,
  type GuideScope,
} from "@/modules/guides/service";
import {
  addMaintainer,
  revokeMaintainer,
  requestOwnershipTransfer,
  acceptOwnershipTransfer,
  requestVisibilityChange,
  acceptVisibilityChange,
  proposeEdit,
  reviewProposal,
} from "@/modules/guides/collaboration";
import type {
  GuideContent,
  GuideType,
  SkillRelationship,
} from "@/modules/guides/content";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}
function lines(form: FormData, key: string) {
  return value(form, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
function content(form: FormData): GuideContent {
  const relationship = value(form, "skillRelationship") as SkillRelationship;
  return {
    title: value(form, "title"),
    goal: value(form, "goal"),
    prerequisites: lines(form, "prerequisites"),
    materials: lines(form, "materials"),
    steps: lines(form, "steps"),
    lessons: value(form, "lessons"),
    skills: form
      .getAll("skillIds")
      .map((item) => ({ id: String(item), relationship })),
    riskDeclaration: value(
      form,
      "riskDeclaration",
    ) as GuideContent["riskDeclaration"],
  };
}

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const actor = await currentPrincipal();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const operation = value(form, "operation");
  const guideId = value(form, "guideId");
  const draftId = value(form, "draftId");
  const contributionId = value(form, "contributionId");
  let destination = "/guides";
  try {
    if (operation === "create") {
      destination = "/guides/new";
      const created = await createGuide(
        actor,
        value(form, "type") as GuideType,
        value(form, "visibility") as GuideVisibility,
        value(form, "visibility") === "organization"
          ? value(form, "organizationId")
          : null,
      );
      destination = `/guides/drafts/${created.draftId}`;
    } else if (operation === "save") {
      destination = `/guides/drafts/${encodeURIComponent(draftId)}`;
      await saveDraft(
        actor,
        draftId,
        content(form),
        Number(value(form, "lockVersion")),
      );
    } else if (operation === "publish") {
      destination = `/guides/drafts/${encodeURIComponent(draftId)}`;
      const published = await publishGuide(
        actor,
        draftId,
        Number(value(form, "lockVersion")),
        value(form, "changelog"),
      );
      destination = `/guides/${published.guideId}`;
    } else if (operation === "invite") {
      destination = `/guides/drafts/${encodeURIComponent(draftId)}`;
      await inviteContributor(
        actor,
        draftId,
        value(form, "email"),
        value(form, "role"),
        value(form, "note"),
        Number(value(form, "order")),
      );
    } else if (operation === "candidate") {
      destination = `/guides/drafts/${encodeURIComponent(draftId)}`;
      await addEvidenceCandidate(actor, contributionId, value(form, "skillId"));
    } else if (operation === "respondInvite") {
      destination = `/guides/invitations/${encodeURIComponent(contributionId)}`;
      await respondInvitation(
        actor,
        contributionId,
        value(form, "decision") === "accept",
        value(form, "audience") as GuideVisibility,
        value(form, "audience") === "organization"
          ? value(form, "organizationId")
          : null,
        value(form, "byline"),
      );
    } else if (operation === "respondEvidence") {
      destination = `/guides/invitations/${encodeURIComponent(contributionId)}`;
      await respondEvidence(
        actor,
        value(form, "candidateId"),
        value(form, "decision") === "accept",
      );
    } else if (operation === "propose") {
      destination = `/guides/${encodeURIComponent(guideId)}/propose`;
      await proposeEdit(actor, guideId, content(form));
    } else if (operation === "reviewProposal") {
      destination = `/guides/${encodeURIComponent(guideId)}/proposals`;
      const newDraft = await reviewProposal(
        actor,
        value(form, "proposalId"),
        value(form, "decision") === "accept",
        value(form, "reason"),
      );
      if (newDraft) destination = `/guides/drafts/${newDraft}`;
    } else if (operation === "startRevision") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      const newDraft = await startRevisionDraft(actor, guideId);
      destination = `/guides/drafts/${newDraft}`;
    } else if (operation === "archive") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await archiveGuide(actor, guideId);
    } else if (operation === "withdraw") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await withdrawCurrentRevision(actor, guideId, value(form, "reason"));
    } else if (operation === "addMaintainer") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await addMaintainer(
        actor,
        guideId,
        value(form, "personId"),
        form.getAll("scopes").map(String) as GuideScope[],
      );
    } else if (operation === "revokeMaintainer") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await revokeMaintainer(actor, guideId, value(form, "personId"));
    } else if (operation === "transfer") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await requestOwnershipTransfer(
        actor,
        guideId,
        value(form, "targetPersonId") || null,
        value(form, "targetOrganizationId") || null,
      );
    } else if (operation === "acceptTransfer") {
      destination = "/guides/requests";
      await acceptOwnershipTransfer(actor, value(form, "transferId"));
    } else if (operation === "changeVisibility") {
      destination = `/guides/${encodeURIComponent(guideId)}/manage`;
      await requestVisibilityChange(
        actor,
        guideId,
        value(form, "visibility") as GuideVisibility,
        value(form, "visibility") === "organization"
          ? value(form, "organizationId")
          : null,
      );
    } else if (operation === "acceptVisibility") {
      destination = "/guides/requests";
      await acceptVisibilityChange(actor, value(form, "changeId"));
    } else throw new Error("Unknown guide operation");
    return NextResponse.redirect(
      siteUrl(
        request,
        `${destination}${destination.includes("?") ? "&" : "?"}saved=1`,
      ),
      303,
    );
  } catch {
    return NextResponse.redirect(
      siteUrl(
        request,
        `${destination}${destination.includes("?") ? "&" : "?"}error=invalid`,
      ),
      303,
    );
  }
}
