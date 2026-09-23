import { expect, test } from "@playwright/test";

test("foundation page and health endpoint render", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One place for campus making.",
  );
  await expect(page.getByRole("status")).toHaveText(
    "Application status: running",
  );
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
});
