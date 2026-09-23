import { expect, test } from "@playwright/test";

test("foundation page and health endpoint render", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A shared workshop starts with a clear place to work.",
  );
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toHaveAttribute("href", "#main-content");
  await expect(
    page.getByRole("link", { name: "Explore the design system" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("foundation.png"),
    fullPage: true,
  });

  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const health = await response.json();
  expect(health).toMatchObject({
    status: "ok",
    service: "makernet-web",
  });
  expect(health.version).toMatch(/^0\.1\.0-/);

  const readinessResponse = await request.get("/api/ready");
  expect(readinessResponse.ok()).toBe(true);
  expect(await readinessResponse.json()).toMatchObject({
    status: "ready",
    service: "makernet-web",
  });
});
