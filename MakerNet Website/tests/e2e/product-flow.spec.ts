import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function handle(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function signIn(
  page: import("@playwright/test").Page,
  name: string,
  returnTo = "/",
) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByRole("textbox", { name: "Account name" }).fill(name);
  await page.getByRole("button", { name: "Sign in locally" }).click();
  await expect(page).toHaveURL(
    new RegExp(returnTo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

async function checkPage(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
}

test("identity session, restricted admin route, and skill browser", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/session-expired/);
  const name = handle("member");
  await signIn(page, name, "/settings");
  await expect(
    page.getByRole("heading", { name: "Your account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Renew session" }).click();
  await expect(page.getByRole("status")).toContainText("session was renewed");
  await page.goto("/admin/audit");
  await expect(page).toHaveURL(/access-denied/);
  await page.goto("/skills");
  await expect(
    page.getByRole("heading", { name: "Skills in the workshop" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "3D printing" })).toBeVisible();
  await checkPage(page);
  await page.screenshot({
    path: testInfo.outputPath("skills.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Try the skill picker" }).click();
  await page
    .getByRole("combobox", { name: "Skill" })
    .selectOption("00000000-0000-4000-8000-000000000004");
  await page.getByRole("button", { name: "Show selection" }).click();
  await expect(page).toHaveURL(/skill=00000000-0000-4000-8000-000000000004/);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/api/auth/me");
  await expect(page.locator("body")).toContainText('"signedIn":false');
});

test("profile privacy and guide publication work on desktop and phone", async ({
  page,
  browser,
}, testInfo) => {
  const ownerName = handle("owner");
  await signIn(page, ownerName, "/members/me");
  await page.getByRole("link", { name: "Edit profile" }).click();
  await page.getByRole("textbox", { name: "Display name" }).fill("Paper Maker");
  await page
    .getByRole("textbox", { name: "Biography" })
    .fill("Club-only fold notes");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Paper Maker" }),
  ).toBeVisible();
  await checkPage(page);
  await page.screenshot({
    path: testInfo.outputPath("profile.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Privacy and preview" }).click();
  const biography = page
    .locator(".privacy-row")
    .filter({ hasText: "biography" });
  await biography.getByRole("combobox").first().selectOption("private");
  await biography.getByRole("button", { name: "Save" }).click();
  await page.goto("/members/me/privacy?audience=college");
  await expect(page.locator(".preview-panel")).not.toContainText(
    "Club-only fold notes",
  );
  await checkPage(page);
  const exported = await page.request.get("/api/me/export");
  expect(exported.ok()).toBe(true);
  const ownerId = (await exported.json()).profile.person_id;

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await signIn(second, handle("viewer"));
  const profileResponse = await second.request.get(`/api/profiles/${ownerId}`);
  expect(profileResponse.ok()).toBe(true);
  expect(await profileResponse.text()).not.toContain("Club-only fold notes");

  await page.goto("/guides/new");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Untitled guide" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Title" })
    .fill("Fold a paper sample");
  await page
    .getByRole("textbox", { name: "Goal" })
    .fill("Make a small paper model");
  await page
    .getByRole("textbox", { name: "Steps" })
    .fill("Fold a sheet\nJoin the edges");
  await page
    .getByRole("combobox", { name: "Risk declaration" })
    .selectOption("no_hazards");
  await page
    .getByRole("listbox", { name: "Skills used or taught" })
    .selectOption("00000000-0000-4000-8000-000000000004");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Publish revision" }).click();
  await expect(
    page.getByRole("heading", { name: "Fold a paper sample" }),
  ).toBeVisible();
  await checkPage(page);
  await page.screenshot({
    path: testInfo.outputPath("guide.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Revision history" }).click();
  await expect(page.getByText("Revision 1: Fold a paper sample")).toBeVisible();
  await secondContext.close();
});
