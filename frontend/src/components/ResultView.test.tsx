import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultView } from "@/components/ResultView";
import type { Attempt } from "@/lib/types";

const ATTEMPT: Attempt = {
  id: "t1",
  answerId: "a1",
  finishedAt: "2026-11-21T10:05:00.000Z",
  durationMs: 125_000,
  timeLimit: 0,
  wordsTyped: 9,
  wordsTotal: 10,
  complete: false,
  wpm: 31,
  accuracy: 89,
  errors: [{ index: 3, expected: "Canada", typed: "canada", kind: "case" }],
};

const VOCABULARY = [
  { phrase: "accounted for", meaning: "made up" },
  { phrase: "rose to a peak of", meaning: "reached its highest point" },
];

const renderResult = (props: Partial<Parameters<typeof ResultView>[0]> = {}) =>
  render(
    <ResultView
      attempt={ATTEMPT}
      previousAccuracy={82}
      bestAccuracy={null}
      vocabulary={VOCABULARY}
      vocabularyWithMistakes={[false, true]}
      onTryAgain={() => {}}
      onChooseAnother={() => {}}
      next={null}
      onGetAnswers={null}
      {...props}
    />,
  );

afterEach(() => {
  cleanup();
});

describe("ResultView", () => {
  it("shows the four numbers and the comparison with the last attempt", () => {
    renderResult();

    expect(screen.getByText("31")).toBeDefined();
    expect(screen.getByText("89%")).toBeDefined();
    expect(screen.getByText("02:05")).toBeDefined();
    expect(screen.getByText("9 / 10")).toBeDefined();
    expect(screen.getByText("Last time 82%, this time 89%")).toBeDefined();
  });

  it("says when the attempt is incomplete, and when it is the first", () => {
    renderResult({ previousAccuracy: null });

    expect(screen.getByRole("heading", { name: "Incomplete attempt" })).toBeDefined();
    expect(screen.getByText("First attempt on this answer")).toBeDefined();
  });

  it("calls a complete attempt a Result", () => {
    renderResult({ attempt: { ...ATTEMPT, complete: true } });

    expect(screen.getByRole("heading", { name: "Result" })).toBeDefined();
  });

  it("lists each mistake with the correct word, the typed word and its kind", () => {
    renderResult();
    const row = screen.getByText("Canada").closest("tr");

    expect(row?.textContent).toBe("CanadacanadaCapital letters");
  });

  it("says when there are no mistakes", () => {
    renderResult({ attempt: { ...ATTEMPT, errors: [] } });

    expect(screen.getByText("No mistakes in this attempt.")).toBeDefined();
  });

  it("marks a vocabulary phrase with a mistake in words, not only by color", () => {
    renderResult();

    expect(screen.getAllByText("(mistake here)")).toHaveLength(1);
    expect(screen.getByText("rose to a peak of").textContent).toContain("(mistake here)");
  });

  it("puts the focus on Try again and calls it", async () => {
    const onTryAgain = vi.fn();
    renderResult({ onTryAgain });
    const button = screen.getByRole("button", { name: "Try again" });

    expect(document.activeElement).toBe(button);

    await userEvent.setup().click(button);

    expect(onTryAgain).toHaveBeenCalledOnce();
  });
});

describe("ResultView: next steps", () => {
  it("offers Try again and Choose another answer", async () => {
    const user = userEvent.setup();
    const onTryAgain = vi.fn();
    const onChooseAnother = vi.fn();
    renderResult({ onTryAgain, onChooseAnother });
    await user.click(screen.getByRole("button", { name: "Choose another answer" }));
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onChooseAnother).toHaveBeenCalledOnce();
    expect(onTryAgain).toHaveBeenCalledOnce();
  });
});

describe("ResultView: the next step after a sample answer", () => {
  it("offers Get answers from AI when it is set", async () => {
    const user = userEvent.setup();
    const onGetAnswers = vi.fn();
    renderResult({ onGetAnswers });

    expect(
      screen.getByText("Get a new Task 1 and Task 2 every day from your own AI chat."),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Get answers from AI" }));

    expect(onGetAnswers).toHaveBeenCalledOnce();
  });

  it("does not show it for the learner's own answers", () => {
    renderResult();

    expect(screen.queryByRole("button", { name: "Get answers from AI" })).toBeNull();
  });
});

describe("ResultView: the next answer of the day", () => {
  it("starts the next answer", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderResult({ next: { title: "Day 1 · Task 2", onStart } });

    await user.click(screen.getByRole("button", { name: "Start Day 1 · Task 2" }));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("has no Start button when nothing comes next", () => {
    renderResult();

    expect(screen.queryByRole("button", { name: /^Start / })).toBeNull();
  });
});

describe("ResultView: personal best", () => {
  it("says when this attempt beats every earlier one on the answer", () => {
    renderResult({ bestAccuracy: 85 });

    expect(screen.getByText("New best accuracy on this answer")).toBeDefined();
  });

  it("shows the best so far when this attempt doesn't beat it", () => {
    renderResult({ bestAccuracy: 95 });

    expect(screen.getByText("Your best on this answer: 95%")).toBeDefined();
  });

  it("says nothing about a best on a first attempt", () => {
    renderResult({ previousAccuracy: null, bestAccuracy: null });

    expect(screen.queryByText(/best/)).toBeNull();
  });
});
