import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskQuestion } from "@/components/TaskQuestion";

const QUESTION = "The table shows dishwasher ownership.\n\nDescribe the main features.";

afterEach(() => {
  cleanup();
});

describe("TaskQuestion", () => {
  it("shows the question and a Hide question button", () => {
    render(<TaskQuestion question={QUESTION} isShown onToggle={() => {}} />);

    const button = screen.getByRole("button", { name: "Hide question" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/dishwasher ownership/).hidden).toBe(false);
  });

  it("hides the question behind a Show question button", () => {
    render(<TaskQuestion question={QUESTION} isShown={false} onToggle={() => {}} />);

    const button = screen.getByRole("button", { name: "Show question" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(/dishwasher ownership/).hidden).toBe(true);
  });

  it("asks to toggle when the button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TaskQuestion question={QUESTION} isShown onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: "Hide question" }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows nothing when the answer has no question", () => {
    const { container } = render(<TaskQuestion question={null} isShown onToggle={() => {}} />);

    expect(container.innerHTML).toBe("");
  });
});
