import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { emailIdentity, normalizeEmail, safeReturnTo } from "./provider";

describe("email identity input", () => {
  it("normalizes ordinary deliverable email addresses", () => {
    expect(normalizeEmail(" Maker.Name+club@Example.EDU ")).toBe(
      "maker.name+club@example.edu",
    );
    expect(emailIdentity("maker@example.com")).toMatchObject({
      issuer: "urn:makernet:verified-email",
      subject: "maker@example.com",
      email: "maker@example.com",
      displayName: "maker",
    });
  });

  it.each([
    "",
    "not-an-email",
    "two@@example.com",
    ".maker@example.com",
    "maker..name@example.com",
    "maker@example",
    "maker@-example.com",
    "maker@example-.com",
    "maker name@example.com",
  ])("rejects invalid address %j", (email) => {
    expect(normalizeEmail(email)).toBeNull();
  });

  it("keeps post-login navigation on this site", () => {
    expect(safeReturnTo("/guides?mine=1")).toBe("/guides?mine=1");
    expect(safeReturnTo("//evil.example")).toBe("/");
    expect(safeReturnTo("https://evil.example")).toBe("/");
  });
});
