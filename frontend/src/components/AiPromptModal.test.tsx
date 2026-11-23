import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiPromptModal } from "@/components/AiPromptModal";
import { AI_PROMPT, getChatGptUrl } from "@/lib/ai-prompt";

vi.mock("sonner", () => ({ toast: vi.fn() }));

const setup = (nextDay = 1) => {
  const user = userEvent.setup();
  const onPasteReply = vi.fn();
  render(
    <AiPromptModal
      open
      onOpenChange={() => {}}
      nextDay={nextDay}
      onPasteReply={onPasteReply}
      onCloseAutoFocus={() => {}}
    />,
  );
  return { user, onPasteReply };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AiPromptModal", () => {
  it("shows the three steps and the whole prompt", () => {
    setup();

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByLabelText<HTMLTextAreaElement>("Prompt").value).toBe(AI_PROMPT);
  });

  it("copies the prompt and says so", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(await navigator.clipboard.readText()).toBe(AI_PROMPT);
    expect(toast).toHaveBeenCalledWith("Prompt copied");
  });

  it("selects the prompt when the clipboard can't be used", async () => {
    const { user } = setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));

    const prompt = screen.getByLabelText<HTMLTextAreaElement>("Prompt");
    expect(document.activeElement).toBe(prompt);
    expect(prompt.selectionEnd - prompt.selectionStart).toBe(AI_PROMPT.length);
  });

  it("opens ChatGPT with the prompt in a new tab", () => {
    setup();
    const link = screen.getByRole("link", { name: /Open in ChatGPT/ });

    expect(link.getAttribute("href")).toBe(getChatGptUrl());
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("AiPromptModal: step 2, the next day", () => {
  it("starts with Day 1 when the Library has no days", () => {
    setup(1);

    expect(screen.getAllByRole("listitem")[1]?.textContent).toBe(
      "Write Start Day 1. The next day, write Start Day 2 in the same chat.",
    );
  });

  it("says which day comes next when the Library has days", () => {
    setup(4);

    expect(screen.getAllByRole("listitem")[1]?.textContent).toBe(
      "Write Start Day 4 in the same chat as before.",
    );
  });
});

describe("AiPromptModal: step 3", () => {
  it("goes on to the Paste modal with Paste the reply", async () => {
    const { user, onPasteReply } = setup();
    await user.click(screen.getByRole("button", { name: "Paste the reply" }));

    expect(onPasteReply).toHaveBeenCalledOnce();
  });
});

describe("AiPromptModal: analytics", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("counts Copy prompt and Open in ChatGPT", async () => {
    const umamiTrack = vi.fn();
    window.umami = { track: umamiTrack };
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));
    // jsdom does not open new tabs, so the click only runs the handler.
    await user.click(screen.getByRole("link", { name: /Open in ChatGPT/ }));

    expect(umamiTrack.mock.calls).toEqual([["prompt_copy"], ["open_chatgpt"]]);
  });
});
