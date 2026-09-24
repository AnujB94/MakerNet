import Link from "next/link";
import { notFound } from "next/navigation";
import { skillDetail } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function SkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await skillDetail(id);
  if (!skill || skill.status !== "active") notFound();
  return (
    <div className="container form-page">
      <p className="eyebrow">Skill / {skill.category}</p>
      <h1>{skill.name}</h1>
      <dl className="detail-list">
        <dt>Category</dt>
        <dd>{skill.category}</dd>
        <dt>Parent</dt>
        <dd>{skill.parentName ?? "Root skill"}</dd>
      </dl>
      <p>This term can be used in member profiles and guide revisions.</p>
      <Link href="/skills">All skills</Link>
    </div>
  );
}
