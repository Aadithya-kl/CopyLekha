import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PasteModal } from "@/components/PasteModal";
import { type AddAnswersResult, DEFAULT_SETTINGS } from "@/lib/storage";
import type { Answer } from "@/lib/types";

const SAVED: AddAnswersResult = {
  ok: true,
  added: [],
  saved: true,
  data: { answers: [], attempts: [], settings: DEFAULT_SETTINGS, lastAnswerId: null },
};

const setup = (result: AddAnswersResult = SAVED, libraryTexts: readonly string[] = []) => {
  const user = userEvent.setup();
  const onSave = vi.fn<(answers: Answer[]) => AddAnswersResult>(() => result);
  const onOpenExisting = vi.fn();
  render(
    <PasteModal
      open
      onOpenChange={() => {}}
      onSave={onSave}
      isInLibrary={(text) => libraryTexts.includes(text)}
      onOpenExisting={onOpenExisting}
      onCloseAutoFocus={() => {}}
    />,
  );
  return {
    user,
    onSave,
    onOpenExisting,
    answerBox: screen.getByLabelText("Answer"),
    save: () => user.click(screen.getByRole("button", { name: "Save and start" })),
  };
};

const savedAnswer = (onSave: ReturnType<typeof setup>["onSave"]): Answer => {
  const answer = onSave.mock.calls[0]?.[0][0];
  if (answer === undefined) {
    throw new Error("Nothing was saved");
  }
  return answer;
};

afterEach(() => {
  cleanup();
});

describe("PasteModal: a plain answer", () => {
  it("puts the cursor in the answer box", () => {
    const { answerBox } = setup();

    expect(document.activeElement).toBe(answerBox);
  });

  it("shows a live word count", async () => {
    const { user, answerBox } = setup();

    expect(screen.getByText("0 words")).toBeTruthy();

    await user.click(answerBox);
    await user.paste("The graph shows\n\ntwo lines.");

    expect(screen.getByText("5 words")).toBeTruthy();
  });

  it("does not save empty text", async () => {
    const { onSave, save } = setup();
    await save();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Paste an answer first.");
  });

  it("saves the cleaned text as Task 2, titled with its first six words", async () => {
    const { user, onSave, answerBox, save } = setup();
    await user.click(answerBox);
    await user.paste("  The **graph** shows how the number   of visitors rose…  ");
    await save();

    const answer = savedAnswer(onSave);
    expect(answer.text).toBe("The graph shows how the number of visitors rose...");
    expect(answer.title).toBe("The graph shows how the number");
    expect(answer.task).toBe("task2");
    expect(answer.source).toBe("manual");
    expect(answer.day).toBeNull();
    expect(answer.question).toBeNull();
  });

  it("saves the chosen title and task", async () => {
    const { user, onSave, answerBox, save } = setup();
    await user.click(answerBox);
    await user.paste("Prices rose.");
    await user.type(screen.getByLabelText("Title (optional)"), "  Prices  ");
    await user.click(screen.getByRole("radio", { name: "Task 1" }));
    await save();

    const answer = savedAnswer(onSave);
    expect(answer.title).toBe("Prices");
    expect(answer.task).toBe("task1");
  });

  it("says when the answer is too long", async () => {
    const { user, answerBox, save } = setup({ ok: false, reason: "too-long" });
    await user.click(answerBox);
    await user.paste("Prices rose.");
    await save();

    expect(screen.getByRole("alert").textContent).toBe("Answers can be up to 2,000 words.");
  });

  it("offers to open an answer already in the library", async () => {
    const { user, onOpenExisting, answerBox, save } = setup({
      ok: false,
      reason: "duplicate",
      existingId: "a1",
    });
    await user.click(answerBox);
    await user.paste("Prices rose.");
    await save();

    expect(screen.getByRole("alert").textContent).toContain(
      "This answer is already in your library.",
    );

    await user.click(screen.getByRole("button", { name: "Open it" }));

    expect(onOpenExisting).toHaveBeenCalledWith("a1");
  });

  it("clears the message when the text changes", async () => {
    const { user, answerBox, save } = setup();
    await save();
    await user.type(answerBox, "P");

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("warns about characters outside a standard English keyboard, and still saves", async () => {
    const { user, onSave, answerBox, save } = setup();
    await user.click(answerBox);
    await user.paste("A café opened.");

    expect(
      screen.getByText("Some characters may be hard to type on an English keyboard."),
    ).toBeTruthy();

    await save();

    expect(onSave).toHaveBeenCalledOnce();
  });
});

const AI_REPLY = [
  "Sure, here is Day 3.",
  "=== DAY 3 ===",
  "=== TASK 1 QUESTION ===",
  "The chart shows car sales.",
  "=== TASK 1 ANSWER ===",
  "```",
  "Car sales rose.",
  "```",
  "=== TASK 1 VOCABULARY ===",
  "- rose: went up",
  "=== TASK 2 QUESTION ===",
  "Discuss both views.",
  "=== TASK 2 ANSWER ===",
  "```",
  "Some people disagree with this view.",
  "```",
].join("\n");

describe("PasteModal: a whole AI reply", () => {
  it("shows what it found instead of the title and task fields", async () => {
    const { user, answerBox } = setup();
    await user.click(answerBox);
    await user.paste(AI_REPLY);

    expect(screen.getByRole("status").textContent).toBe("Day 3: Task 1, 3 words · Task 2, 6 words");
    expect(screen.queryByLabelText("Title (optional)")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText(/already in your library/)).toBeNull();
  });

  it("says when a task is already in the library and starts with the other one", async () => {
    const { user, answerBox } = setup(SAVED, ["Car sales rose."]);
    await user.click(answerBox);
    await user.paste(AI_REPLY);

    expect(
      screen.getByText("Task 1 is already in your library. Only Task 2 will be saved."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save and start Task 2" })).toBeTruthy();
  });

  it("says when both tasks are already in the library", async () => {
    const { user, answerBox } = setup(SAVED, [
      "Car sales rose.",
      "Some people disagree with this view.",
    ]);
    await user.click(answerBox);
    await user.paste(AI_REPLY);

    expect(screen.getByText("Both tasks are already in your library.")).toBeTruthy();
  });

  it("saves both tasks with their day, question and vocabulary", async () => {
    const { user, onSave, answerBox } = setup();
    await user.click(answerBox);
    await user.paste(AI_REPLY);
    await user.click(screen.getByRole("button", { name: "Save and start Task 1" }));

    const answers = onSave.mock.calls[0]?.[0];
    expect(
      answers?.map(({ title, task, text, question, vocabulary, day, source }) => ({
        title,
        task,
        text,
        question,
        vocabulary,
        day,
        source,
      })),
    ).toEqual([
      {
        title: "Day 3 · Task 1",
        task: "task1",
        text: "Car sales rose.",
        question: "The chart shows car sales.",
        vocabulary: [{ phrase: "rose", meaning: "went up" }],
        day: 3,
        source: "ai-import",
      },
      {
        title: "Day 3 · Task 2",
        task: "task2",
        text: "Some people disagree with this view.",
        question: "Discuss both views.",
        vocabulary: [],
        day: 3,
        source: "ai-import",
      },
    ]);
  });

  it("starts with Task 2 when only Task 2 is found", async () => {
    const { user, onSave, answerBox } = setup();
    await user.click(answerBox);
    await user.paste("=== TASK 2 ANSWER ===\nCities grow.");
    await user.click(screen.getByRole("button", { name: "Save and start Task 2" }));

    expect(onSave.mock.calls[0]?.[0].map((answer) => answer.title)).toEqual(["Task 2"]);
  });
});
