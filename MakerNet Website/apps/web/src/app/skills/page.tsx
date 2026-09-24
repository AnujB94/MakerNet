import Link from "next/link";
import { listSkills } from "@/modules/skills/service";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const skills = await listSkills();
  const categories = [...new Set(skills.map((skill) => skill.category))];
  return (
    <div className="container catalog-page">
      <div className="page-heading">
        <p className="eyebrow">MakerNet / Vocabulary</p>
        <h1>Skills in the workshop</h1>
        <p>
          One shared set of terms helps members describe their work. Select a
          skill to see its place in the taxonomy.
        </p>
        <Link className="text-link" href="/skills/picker">
          Try the skill picker
        </Link>
      </div>
      {categories.map((category) => (
        <section className="catalog-section" key={category}>
          <h2>{category}</h2>
          <ul className="skill-list">
            {skills
              .filter((skill) => skill.category === category)
              .map((skill) => (
                <li key={skill.id}>
                  <Link href={`/skills/${skill.id}`}>{skill.name}</Link>
                  {skill.parentName && <span>Within {skill.parentName}</span>}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
