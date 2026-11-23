import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";

// Flow 3: the theme and the text size are changed, and both are
// still in place after a reload.

test("keep the theme and text size after a reload", async ({ page }) => {
  await page.goto("/");
  // The first visit opens How it works, and the tour is the way on.
  await page.getByRole("button", { name: "Show me around" }).click();
  await page.getByRole("button", { name: "Skip tour" }).click();
  const input = page.getByRole("textbox", { name: "Type the answer here" });
  await expect(input).toBeFocused();

  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  await expectNoAxeViolations(page);

  await settings.getByRole("radio", { name: "Dark" }).click();
  await settings.getByRole("combobox", { name: "Text size" }).click();
  await page.getByRole("option", { name: "24 px" }).click();

  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(input).toHaveCSS("font-size", "24px");

  await page.reload();

  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(input).toHaveCSS("font-size", "24px");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(settings.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(settings.getByRole("combobox", { name: "Text size" })).toHaveText("24 px");
});
