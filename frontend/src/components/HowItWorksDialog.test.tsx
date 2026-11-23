import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HowItWorksDialog } from "@/components/HowItWorksDialog";
import { SiteFooter } from "@/components/SiteFooter";

afterEach(() => {
  cleanup();
});

const renderOpen = () =>
  render(
    <HowItWorksDialog
      open
      onOpenChange={() => {}}
      isRequired={false}
      onStartTour={() => {}}
      onCloseAutoFocus={() => {}}
    />,
  );

describe("HowItWorksDialog", () => {
  it("says what copywork is", () => {
    renderOpen();
    const dialog = screen.getByRole("dialog", { name: "How it works" });

    expect(dialog.textContent).toContain("you retype a Band 8.5+ model answer exactly");
  });

  it("lists the four daily steps in order", () => {
    renderOpen();
    const steps = within(screen.getByRole("region", { name: "Every day" })).getAllByRole(
      "listitem",
    );

    expect(steps).toHaveLength(4);
    expect(steps[0].textContent).toContain("Get answers from AI");
    expect(steps[3].textContent).toContain("start the next task");
  });

  it("explains each mark in the model answer, the return arrow in words too", () => {
    renderOpen();
    const marks = within(screen.getByRole("region", { name: "In the model answer" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);

    expect(marks).toEqual([
      "word the word to type next",
      "word a word typed wrong",
      "↵The return arrow: press Enter, a new paragraph starts",
      "grey background the sentence you are typing",
    ]);
  });

  it("lists the keyboard shortcuts", () => {
    renderOpen();
    const keys = within(screen.getByRole("region", { name: "Keyboard" }))
      .getAllByText((_, element) => element?.tagName === "KBD")
      .map((key) => key.textContent);

    expect(keys).toEqual(["Space", "Enter", "Esc", "Ctrl/Cmd + Enter", "Ctrl/Cmd + Space"]);
  });

  it("ends with Start practising, which closes it, or Show me around", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleStartTour = vi.fn();
    render(
      <HowItWorksDialog
        open
        onOpenChange={handleOpenChange}
        isRequired={false}
        onStartTour={handleStartTour}
        onCloseAutoFocus={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start practising" })).toBe(document.activeElement);
    await user.click(screen.getByRole("button", { name: "Start practising" }));
    expect(handleOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Show me around" }));
    expect(handleStartTour).toHaveBeenCalledOnce();
  });

  it("on the very first visit can't be closed, and Show me around is the only way on", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleStartTour = vi.fn();
    render(
      <HowItWorksDialog
        open
        onOpenChange={handleOpenChange}
        isRequired
        onStartTour={handleStartTour}
        onCloseAutoFocus={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "How it works" });

    expect(
      within(dialog)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Show me around"]);
    expect(screen.getByRole("button", { name: "Show me around" })).toBe(document.activeElement);

    await user.keyboard("{Escape}");
    expect(handleOpenChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Show me around" }));
    expect(handleStartTour).toHaveBeenCalledOnce();
  });

  it("opens from the footer", async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();
    render(<SiteFooter onOpenHowItWorks={handleOpen} onCloseAutoFocus={() => {}} />);

    await user.click(screen.getByRole("button", { name: "How it works" }));

    expect(handleOpen).toHaveBeenCalledOnce();
  });
});
