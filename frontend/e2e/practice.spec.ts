import { expect, test } from "@playwright/test";

import { SAMPLE_ANSWERS } from "../src/lib/samples";
import { expectNoAxeViolations } from "./axe";

// Flow 1: the sample answer is loaded, typed with one deliberate
// mistake, the Result shows the mistake and its kind, and Try again starts over.

const sample = SAMPLE_ANSWERS.find((answer) => answer.task === "task2");
if (sample === undefined) {
  throw new Error("The Task 2 sample answer is missing");
}

// The mistake: the first word that ends with a comma is typed without it (Punctuation).
const paragraphs = sample.text.split("\n\n").map((paragraph) => paragraph.split(" "));
const wordCount = paragraphs.flat().length;
const mistakeWord = paragraphs.flat().find((word) => word.endsWith(","));
if (mistakeWord === undefined) {
  throw new Error("The sample answer has no comma");
}

// Typing 268 words key by key, plus eight axe checks, takes about 25 seconds on its own.
const PRACTICE_TIMEOUT_MS = 90_000;

test("type the sample answer with one mistake and see it in the Result", async ({ page }) => {
  test.setTimeout(PRACTICE_TIMEOUT_MS);
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("Sample · Task 2");
  const input = page.getByRole("textbox", { name: "Type the answer here" });

  // The very first visit opens How it works by itself, and it can't be closed.
  const guide = page.getByRole("dialog", { name: "How it works" });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("button")).toHaveText(["Show me around"]);
  await page.keyboard.press("Escape");
  await page.mouse.click(10, 10);
  await expect(guide).toBeVisible();
  // A click outside never leaves the focus on the page, so Enter still starts the tour.
  await expect(page.getByRole("button", { name: "Show me around" })).toBeFocused();
  await expectNoAxeViolations(page);

  // Show me around: the tour points at each control in turn.
  await page.getByRole("button", { name: "Show me around" }).click();
  await expect(guide).toBeHidden();
  const tourStep = page.getByRole("dialog", { name: "The model answer" });
  await expect(tourStep).toContainText("1 of 6");
  await expect(page.locator('[data-tour="model-answer"]')).toHaveAttribute(
    "data-tour-active",
    "true",
  );
  await expect(page.getByRole("button", { name: "Next" })).toBeFocused();
  await expectNoAxeViolations(page);
  for (let step = 1; step < 6; step += 1) {
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("dialog", { name: "Timer and settings" })).toContainText("6 of 6");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator("[data-tour-active]")).toHaveCount(0);
  await expect(input).toBeFocused();
  await expectNoAxeViolations(page);

  // After that it opens from the footer as a normal dialog.
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("button")).toHaveText([
    "Show me around",
    "Start practising",
    "Close",
  ]);
  await page.getByRole("button", { name: "Start practising" }).click();
  await expect(input).toBeFocused();

  // The learner reads ahead first: on the first key the box comes back to the word.
  const modelAnswer = page.getByRole("region", { name: "Model answer" });
  const currentWord = modelAnswer.locator('[aria-current="true"]');
  await modelAnswer.evaluate((box) => box.scrollTo({ top: box.scrollHeight }));
  await expect(currentWord).not.toBeInViewport();
  // A click in the typing box brings it back too, before any key.
  await input.click();
  await expect(currentWord).toBeInViewport();
  await modelAnswer.evaluate((box) => box.scrollTo({ top: box.scrollHeight }));
  await expect(currentWord).not.toBeInViewport();
  await input.press("I");
  await expect(currentWord).toBeInViewport();

  // Esc pauses; the notice says what to do, and Resume puts the cursor back.
  await input.press("Escape");
  const pausedNotice = page.getByRole("status").filter({ hasText: "Paused" });
  await expect(pausedNotice).toHaveText(
    "Paused. The timer is stopped.Type the next word to go on.",
  );
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(pausedNotice).toBeHidden();
  await expect(input).toBeFocused();

  await input.press("Backspace");

  let isMistakeMade = false;
  for (const [paragraphIndex, words] of paragraphs.entries()) {
    const isLastParagraph = paragraphIndex === paragraphs.length - 1;
    for (const [wordIndex, word] of words.entries()) {
      const isLastWord = wordIndex === words.length - 1;
      const typed: string = !isMistakeMade && word === mistakeWord ? word.slice(0, -1) : word;
      isMistakeMade ||= typed !== word;
      await input.pressSequentially(typed);
      if (isLastParagraph && isLastWord) {
        // The attempt finishes when the last word's letters are typed.
        break;
      }
      await input.press(isLastWord ? "Enter" : "Space");
    }
  }

  await expect(page.getByRole("heading", { name: "Result" })).toBeVisible();
  const mistakes = page.getByRole("region", { name: "List of mistakes" }).getByRole("row");
  await expect(mistakes).toHaveCount(2);
  await expect(mistakes.nth(1).getByRole("cell")).toHaveText([
    mistakeWord,
    mistakeWord.slice(0, -1),
    "Punctuation",
  ]);
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Try again" }).click();

  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByText(`0 / ${wordCount}`)).toBeVisible();
});
