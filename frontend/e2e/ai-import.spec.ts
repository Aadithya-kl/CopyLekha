import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";

// Flow 2: a whole AI reply is pasted, the preview shows the day and
// both tasks, Task 1 starts with its question, and the Library groups both under the day.

// A real ChatGPT reply, also used by the parser's unit tests.
const AI_REPLY = readFileSync(join(process.cwd(), "src/lib/parse-ai-response.fixture.txt"), "utf8");

test("import a whole AI reply and find it in the Library", async ({ page }) => {
  await page.goto("/");
  // The first visit opens How it works, and the tour is the way on.
  await page.getByRole("button", { name: "Show me around" }).click();
  await page.getByRole("button", { name: "Skip tour" }).click();
  await expect(page.locator("h1")).toHaveText("Sample · Task 2");

  // The way the AI modal teaches: step 3 goes on to the Paste modal.
  await page.getByRole("button", { name: "Get answers from AI" }).click();
  await page.getByRole("button", { name: "Paste the reply" }).click();
  const dialog = page.getByRole("dialog", { name: "Paste an answer" });
  const answerBox = dialog.getByRole("textbox", { name: "Answer" });
  await expect(page.getByRole("dialog", { name: "Get answers from AI" })).toBeHidden();
  await expect(answerBox).toBeFocused();
  await answerBox.fill(AI_REPLY);

  await expect(dialog.getByRole("status")).toHaveText(
    "Day 1: Task 1, 170 words · Task 2, 288 words",
  );
  await expectNoAxeViolations(page);

  await dialog.getByRole("button", { name: "Save and start Task 1" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator("h1")).toHaveText("Day 1 · Task 1");
  await expect(page.getByRole("region", { name: "Task question" })).toContainText(
    "The table below shows the percentage of households",
  );
  await expect(page.getByRole("textbox", { name: "Type the answer here" })).toBeFocused();

  await page.getByRole("button", { name: "Library" }).click();
  const library = page.getByRole("dialog", { name: "Library" });
  const dayGroup = library.getByRole("region", { name: "Day 1" });
  await expect(dayGroup.getByRole("button", { name: /^Day 1 · Task/ })).toHaveText([
    /^Day 1 · Task 1/,
    /^Day 1 · Task 2/,
  ]);
  await expect(library.getByRole("region", { name: "Other answers" })).toContainText(
    "Sample · Task 2",
  );
  await expectNoAxeViolations(page);
});
