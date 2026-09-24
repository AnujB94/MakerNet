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

async function waitForSignInLink(email: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const inbox = (await fetch("http://127.0.0.1:8025/api/v1/messages").then(
      (response) => response.json(),
    )) as {
      messages: { ID: string; To: { Address: string }[] }[];
    };
    const summary = inbox.messages.find((message) =>
      message.To.some((recipient) => recipient.Address === email),
    );
    if (summary) {
      const message = await fetch(
        `http://127.0.0.1:8025/api/v1/message/${summary.ID}`,
      ).then((response) => response.text());
      const match = message.match(
        /http:\/\/127\.0\.0\.1:\d+\/auth\/email\/verify\?token=[A-Za-z0-9_-]{43}/,
      );
      if (match) return match[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No sign-in email arrived for ${email}`);
}

test("a valid email receives a single-use sign-in link", async ({ page }) => {
  const email = `${handle("email")}@example.test`;
  await page.goto("/sign-in?returnTo=/settings");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  const link = await waitForSignInLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Your account" }),
  ).toBeVisible();
  await page.goto(link);
  await expect(page).toHaveURL(/\/sign-in\?error=expired/);
  await expect(page.locator(".alert.warning")).toContainText(
    "expired or was already used",
  );
});

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

test("a collaborator consents to credit and evidence before a guide reaches their profile", async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const contributorName = handle("contributor");
  const ownerName = handle("guideowner");
  const contributorContext = await browser.newContext();
  try {
    const contributor = await contributorContext.newPage();
    await signIn(contributor, contributorName, "/guides");
    await signIn(page, ownerName, "/guides");
    await page.goto("/guides/new");
    await page.getByRole("button", { name: "Create draft" }).click();
    await page
      .getByRole("textbox", { name: "Title" })
      .fill("Inspect a printed fitting");
    await page
      .getByRole("textbox", { name: "Goal" })
      .fill("Record whether the model fits");
    await page
      .getByRole("textbox", { name: "Steps" })
      .fill("Inspect the finished model\nRecord the fit");
    await page
      .getByRole("combobox", { name: "Risk declaration" })
      .selectOption("no_hazards");
    await page
      .getByRole("listbox", { name: "Skills used or taught" })
      .selectOption("00000000-0000-4000-8000-000000000004");
    await page.getByRole("button", { name: "Save draft" }).click();
    const draftUrl = page.url();
    await page
      .getByRole("textbox", { name: "College email" })
      .fill(`${contributorName}@local.makernet.invalid`);
    await page
      .getByRole("textbox", { name: "Contribution note" })
      .fill("Checked the sample fit");
    await page.getByRole("button", { name: "Invite contributor" }).click();
    await page.getByRole("button", { name: "Publish revision" }).click();
    await expect(page.locator(".alert.error")).toContainText(
      "could not be completed",
    );

    await contributor.goto("/guides");
    await contributor
      .getByRole("link", { name: "Respond to invitation" })
      .click();
    await contributor.getByRole("button", { name: "Accept credit" }).click();
    await expect(contributor.getByRole("status")).toContainText(
      "response was saved",
    );

    await page.goto(draftUrl);
    const contributorRow = page
      .locator(".record-list li")
      .filter({ hasText: contributorName });
    await contributorRow
      .getByRole("button", { name: "Propose evidence" })
      .click();
    await contributor.goto("/guides");
    await contributor
      .getByRole("link", { name: "Respond to invitation" })
      .click();
    await expect(contributor.getByText("3D printing")).toBeVisible();
    await contributor.getByRole("button", { name: "Accept evidence" }).click();
    await expect(contributor.getByRole("status")).toContainText(
      "response was saved",
    );

    await page.goto(draftUrl);
    await page.getByRole("button", { name: "Publish revision" }).click();
    await expect(
      page.getByRole("heading", { name: "Inspect a printed fitting" }),
    ).toBeVisible();
    await contributor.goto("/members/me");
    await expect(
      contributor.getByRole("heading", { name: "Accepted guide evidence" }),
    ).toBeVisible();
    await expect(
      contributor.getByRole("link", { name: "Inspect a printed fitting" }),
    ).toBeVisible();
    await checkPage(contributor);
  } finally {
    await contributorContext.close();
  }
});
