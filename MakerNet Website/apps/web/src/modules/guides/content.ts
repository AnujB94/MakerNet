export type GuideType = "how_to" | "build_log" | "reference";
export type SkillRelationship = "taught" | "required" | "used";

export interface GuideContent {
  title: string;
  goal: string;
  prerequisites: string[];
  materials: string[];
  steps: string[];
  lessons: string;
  skills: { id: string; relationship: SkillRelationship }[];
  riskDeclaration: "not_reviewed" | "no_hazards" | "hazards_present";
}

export const emptyGuideContent: GuideContent = {
  title: "",
  goal: "",
  prerequisites: [],
  materials: [],
  steps: [],
  lessons: "",
  skills: [],
  riskDeclaration: "not_reviewed",
};

export function parseGuideContent(
  input: unknown,
  publish = false,
): GuideContent {
  if (!input || typeof input !== "object")
    throw new Error("Invalid guide content");
  const value = input as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (typeof value[key] !== "string") throw new Error(`Invalid ${key}`);
    const result = (value[key] as string).trim();
    if (result.length > max) throw new Error(`${key} is too long`);
    return result;
  };
  const lines = (key: string, maxLines: number) => {
    if (
      !Array.isArray(value[key]) ||
      (value[key] as unknown[]).length > maxLines
    )
      throw new Error(`Invalid ${key}`);
    return (value[key] as unknown[])
      .map((item) => {
        if (typeof item !== "string" || item.trim().length > 500)
          throw new Error(`Invalid ${key}`);
        return item.trim();
      })
      .filter(Boolean);
  };
  if (!Array.isArray(value.skills) || value.skills.length > 20)
    throw new Error("Invalid skills");
  const skills = value.skills.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid skill");
    const skill = item as Record<string, unknown>;
    if (
      typeof skill.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(skill.id) ||
      !["taught", "required", "used"].includes(String(skill.relationship))
    )
      throw new Error("Invalid skill");
    return {
      id: skill.id,
      relationship: skill.relationship as SkillRelationship,
    };
  });
  const content: GuideContent = {
    title: text("title", 140),
    goal: text("goal", 2000),
    prerequisites: lines("prerequisites", 30),
    materials: lines("materials", 50),
    steps: lines("steps", 100),
    lessons: text("lessons", 4000),
    skills,
    riskDeclaration: value.riskDeclaration as GuideContent["riskDeclaration"],
  };
  if (
    !["not_reviewed", "no_hazards", "hazards_present"].includes(
      content.riskDeclaration,
    )
  )
    throw new Error("Invalid risk declaration");
  if (publish) {
    if (!content.title || !content.goal || !content.steps.length)
      throw new Error("Title, goal, and steps are required");
    if (content.riskDeclaration !== "no_hazards")
      throw new Error("Hazardous guides are unavailable during internal alpha");
    const words = [
      content.title,
      content.goal,
      ...content.prerequisites,
      ...content.materials,
      ...content.steps,
      content.lessons,
    ]
      .join(" ")
      .toLowerCase();
    if (
      /\b(fire|flame|high[ -]?voltage|explosive|flammable|hazardous chemical|acid|welding|laser cutter|power saw|cnc mill)\b/i.test(
        words,
      )
    )
      throw new Error(
        "Potential hazard requires safety review in a later release",
      );
  }
  return content;
}
