import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReferenceText } from "@/components/ReferenceText";
import { tokenize } from "@/lib/tokenize";

afterEach(() => {
  cleanup();
});

describe("ReferenceText: paragraph ends", () => {
  it("marks the last word of each paragraph but the last with ↵, hidden from screen readers", () => {
    render(
      <ReferenceText
        words={tokenize("It rose.\n\nThen it fell.\n\nOverall it ended.")}
        committedKinds={[]}
        currentWordIndex={0}
        currentWord=""
        fontSize={20}
        inputId="typing-input"
      />,
    );
    const box = screen.getByRole("region", { name: "Model answer" });
    const marks = [...box.querySelectorAll("span")].filter((span) => span.textContent === "↵");

    expect(marks.map((mark) => mark.previousElementSibling?.textContent)).toEqual([
      "rose.",
      "fell.",
    ]);
    expect(marks.every((mark) => mark.getAttribute("aria-hidden") === "true")).toBe(true);
  });
});

describe("ReferenceText: letters typed past the word", () => {
  const renderTyped = (currentWord: string) =>
    render(
      <ReferenceText
        words={tokenize("The cost rose.")}
        committedKinds={[null]}
        currentWordIndex={1}
        currentWord={currentWord}
        fontSize={20}
        inputId="typing-input"
      />,
    );

  const getCurrentWord = () =>
    screen.getByRole("region", { name: "Model answer" }).querySelector('[aria-current="true"]');

  it("never adds them to the model answer, and counts them after the word", () => {
    renderTyped("costxyz");
    const word = getCurrentWord();

    expect(word?.textContent).toBe("cost+33 extra letters");
    expect(screen.getByRole("region", { name: "Model answer" }).textContent).not.toContain("xyz");
  });

  it("says one extra letter in the singular", () => {
    renderTyped("costs");

    expect(getCurrentWord()?.textContent).toBe("cost+11 extra letter");
  });

  it("shows no count when the word is not longer than the model word", () => {
    const { rerender } = renderTyped("costs");
    rerender(
      <ReferenceText
        words={tokenize("The cost rose.")}
        committedKinds={[null]}
        currentWordIndex={1}
        currentWord="cos"
        fontSize={20}
        inputId="typing-input"
      />,
    );

    expect(getCurrentWord()?.textContent).toBe("cost");
  });
});
