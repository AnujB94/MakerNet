import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the shell and workbench are accessible at desktop and phone widths", async ({
  page,
}, testInfo) => {
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Useful interfaces for useful work.",
  );
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "01 / Tokens" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "03 / Page templates" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("design-system.png"),
    fullPage: true,
  });
});

test("keyboard navigation, tabs, menu, and dialog work", async ({ page }) => {
  await page.goto("/design-system");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const tabs = page.getByRole("tablist", { name: "Example sections" });
  await tabs.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Details" })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Activity" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: "Overview" })).toBeFocused();

  const menu = page.getByText("Open menu", { exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Templates" })).toBeHidden();
  await expect(menu).toBeFocused();

  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirm this action" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("form errors are tied to fields and touch targets are usable", async ({
  page,
}) => {
  await page.goto("/design-system");
  const invalid = page.getByRole("textbox", { name: "Required detail" });
  await expect(invalid).toHaveAttribute("aria-invalid", "true");
  const messageId = await invalid.getAttribute("aria-describedby");
  expect(messageId).toBeTruthy();
  await expect(page.locator(`#${messageId}`)).toContainText(
    "Enter a detail before continuing.",
  );
  for (const control of await page
    .locator("button, summary, a, select")
    .all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
