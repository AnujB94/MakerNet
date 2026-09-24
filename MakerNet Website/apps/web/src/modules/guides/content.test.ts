import { describe, expect, it } from "vitest";
import { emptyGuideContent, parseGuideContent } from "./content";

describe("guide publication content", () => {
  it("accepts complete safe text content", () => {
    expect(
      parseGuideContent(
        {
          ...emptyGuideContent,
          title: "Paper notebook",
          goal: "Bind pages",
          steps: ["Fold paper"],
          riskDeclaration: "no_hazards",
        },
        true,
      ).title,
    ).toBe("Paper notebook");
  });
  it("blocks incomplete or potentially hazardous internal-alpha publication", () => {
    expect(() => parseGuideContent(emptyGuideContent, true)).toThrow();
    expect(() =>
      parseGuideContent(
        {
          ...emptyGuideContent,
          title: "Safe",
          goal: "Make",
          steps: ["Use a flame"],
          riskDeclaration: "no_hazards",
        },
        true,
      ),
    ).toThrow(/hazard/i);
    expect(() =>
      parseGuideContent(
        {
          ...emptyGuideContent,
          title: "Safe",
          goal: "Make",
          steps: ["Fold"],
          riskDeclaration: "hazards_present",
        },
        true,
      ),
    ).toThrow(/Hazardous/);
  });
});
