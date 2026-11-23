import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/EmptyState";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("says where answers come from and offers both ways to add one", async () => {
    const user = userEvent.setup();
    const onGetAnswers = vi.fn();
    const onPaste = vi.fn();
    render(<EmptyState onGetAnswers={onGetAnswers} onPaste={onPaste} />);

    expect(screen.getByRole("heading", { name: "Add your first model answer" })).toBeDefined();
    expect(
      screen.getByText("Get model answers from your own AI chat, or paste one you already have."),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Get answers from AI" }));
    await user.click(screen.getByRole("button", { name: "Paste answer" }));

    expect(onGetAnswers).toHaveBeenCalledOnce();
    expect(onPaste).toHaveBeenCalledOnce();
  });
});
