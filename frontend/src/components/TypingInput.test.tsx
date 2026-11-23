import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { TypingInput } from "@/components/TypingInput";
import { useTypingSession } from "@/hooks/use-typing-session";
import { tokenize } from "@/lib/tokenize";

// Two paragraphs: "rose." needs Enter; "fell." is the last word.
const ANSWER = "It rose.\n\nThen it fell.";

// The typing box with a real typing session, as the practice page uses it.
const Practice = ({ text = ANSWER }: { text?: string }) => {
  const words = useMemo(() => tokenize(text), [text]);
  const session = useTypingSession(words, 0, () => {});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <p data-testid="status">{session.status}</p>
      <TypingInput
        inputId="typing"
        inputRef={inputRef}
        words={words}
        committedWords={session.typing.committedWords}
        committedKinds={session.committedKinds}
        currentWord={session.typing.currentWord}
        status={session.status}
        fontSize={20}
        onKeyAction={session.handleKeyAction}
        onBlur={session.pause}
      />
      <button type="button">Elsewhere</button>
    </>
  );
};

const setup = (text?: string) => {
  const user = userEvent.setup();
  render(<Practice text={text} />);
  const input = screen.getByLabelText("Type the answer here");
  return { user, input };
};

const typedText = () => screen.getByTestId("typed-text").textContent?.trim();
const status = () => screen.getByTestId("status").textContent;

afterEach(() => {
  cleanup();
});

describe("TypingInput: key rules", () => {
  it("shows the placeholder before the first key", () => {
    setup();

    expect(typedText()).toBe(
      "Type this model answer word by word to learn its grammar and vocabulary. The timer starts with your first key.",
    );
  });

  it("shows what was typed and starts the attempt", async () => {
    const { user, input } = setup();
    await user.type(input, "It");

    expect(typedText()).toBe("It");
    expect(status()).toBe("typing");
  });

  it("moves on with Space even when the word is wrong, and marks it wrong", async () => {
    const { user, input } = setup();
    await user.type(input, "Iy rose.{Enter}");

    expect(typedText()).toBe("Iy rose.");
    expect(screen.getByText("Iy").getAttribute("data-state")).toBe("wrong");
    expect(screen.getByText("rose.").getAttribute("data-state")).toBe("correct");
  });

  it("ignores Space on an empty word and a second Space", async () => {
    const { user, input } = setup();
    await user.type(input, " It  ");

    expect(typedText()).toBe("It");
  });

  it("needs Enter at a paragraph end, where Space does nothing", async () => {
    const { user, input } = setup();
    await user.type(input, "It rose. Then");

    expect(typedText()).toBe("It rose.Then");

    await user.type(input, "{Backspace}{Backspace}{Backspace}{Backspace}{Enter}Then");

    expect(typedText()).toBe("It rose. Then");
  });

  it("ignores Enter inside a paragraph", async () => {
    const { user, input } = setup();
    await user.type(input, "It{Enter}");

    expect(typedText()).toBe("It");
  });

  it("never goes back into a committed word with Backspace", async () => {
    const { user, input } = setup();
    await user.type(input, "It {Backspace}{Backspace}");

    expect(typedText()).toBe("It");
  });

  it("keeps extra letters, and Backspace removes them", async () => {
    const { user, input } = setup();
    await user.type(input, "Itss");

    expect(typedText()).toBe("Itss");

    await user.type(input, "{Backspace}{Backspace}");

    expect(typedText()).toBe("It");
  });

  it("finishes when the last word is typed, without Space", async () => {
    const { user, input } = setup();
    await user.type(input, "It rose.{Enter}Then it fell.");

    expect(status()).toBe("finished");
    expect(typedText()).toBe("It rose. Then it fell.");
  });
});

describe("TypingInput: paste, pause and restart", () => {
  it("blocks pasting", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.paste("It rose.");

    expect(typedText()).toContain("Type this model answer");
    expect(status()).toBe("ready");
  });

  it("pauses on Esc and resumes with the next key", async () => {
    const { user, input } = setup();
    await user.type(input, "I{Escape}");

    expect(status()).toBe("paused");

    await user.type(input, "t");

    expect(status()).toBe("typing");
    expect(typedText()).toBe("It");
  });

  it("restarts on Ctrl + Enter and on Cmd + Enter", async () => {
    const { user, input } = setup();
    await user.type(input, "It ro{Control>}{Enter}{/Control}");

    expect(status()).toBe("ready");
    expect(typedText()).toContain("Type this model answer");

    await user.type(input, "It{Meta>}{Enter}{/Meta}");

    expect(status()).toBe("ready");
  });
});

describe("TypingInput: input methods", () => {
  it("adds the composed letters and clears them from the textarea", () => {
    const { input } = setup();
    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error("The typing box is not a textarea");
    }
    fireEvent.compositionStart(input);
    input.value = "It";
    fireEvent.compositionEnd(input, { data: "It" });

    expect(typedText()).toBe("It");
    expect(input.value).toBe("");
  });
});

describe("TypingInput: Windows Alt codes", () => {
  it("does not type the digits of an Alt code", async () => {
    const { input } = setup();
    for (const digit of ["0", "1", "6", "3"]) {
      fireEvent.keyDown(input, { key: digit, code: `Numpad${digit}`, altKey: true });
    }

    expect(status()).toBe("ready");
    expect(typedText()).toContain("Type this model answer");
  });
});

describe("TypingInput: Enter at a paragraph end", () => {
  const enterHint = () => screen.queryByText("Press Enter for a new paragraph.");

  it("says to press Enter when Space is pressed at a paragraph end", async () => {
    const { user, input } = setup();
    await user.type(input, "It rose. ");

    expect(enterHint()?.getAttribute("role")).toBe("status");
    expect(typedText()).toBe("It rose.");
  });

  it("hides the hint once Enter moves on", async () => {
    const { user, input } = setup();
    await user.type(input, "It rose. {Enter}");

    expect(enterHint()).toBeNull();
  });

  it("starts the next attempt without the hint", async () => {
    const { user, input } = setup();
    await user.type(input, "It rose. {Control>}{Enter}{/Control}It ro");

    expect(enterHint()).toBeNull();
  });

  it("gives no hint for Space in the middle of a paragraph", async () => {
    const { user, input } = setup();
    await user.type(input, "It ");

    expect(enterHint()).toBeNull();
  });
});

describe("TypingInput: Caps Lock", () => {
  it("says when Caps Lock is on", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard("{CapsLock}");

    expect(screen.getByRole("status").textContent).toBe("Caps Lock is on");
  });
});

describe("TypingInput: writing tools", () => {
  it("tells Grammarly to stay out of the typing box", () => {
    const { input } = setup();

    expect(input.getAttribute("data-gramm")).toBe("false");
    expect(input.getAttribute("data-gramm_editor")).toBe("false");
    expect(input.getAttribute("data-enable-grammarly")).toBe("false");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("refuses text a writing tool puts in, such as a correction", async () => {
    const { user, input } = setup();
    await user.type(input, "Iy");
    const correction = new InputEvent("beforeinput", {
      inputType: "insertReplacementText",
      data: "It",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(correction);

    expect(correction.defaultPrevented).toBe(true);
    expect(typedText()).toBe("Iy");
  });
});

describe("TypingInput: focus", () => {
  it("pauses when the focus leaves the box, and goes on with the next key", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard("I");

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(status()).toBe("paused");

    await user.click(input);
    await user.keyboard("t");
    expect(status()).toBe("typing");
    expect(typedText()).toBe("It");
  });
});
