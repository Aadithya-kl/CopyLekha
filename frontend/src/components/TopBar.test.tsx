import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SoundButton, TimerOptions, TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";

afterEach(() => {
  cleanup();
});

describe("SoundButton", () => {
  it("shows whether sound is on and toggles it", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SoundButton isOn isSupported isReady onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "Sound" });

    expect(button.getAttribute("aria-pressed")).toBe("true");

    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("is disabled with the reason in a tooltip when the browser has no speech", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SoundButton isOn isSupported={false} isReady onToggle={() => {}} />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Sound" }).hasAttribute("disabled")).toBe(true);

    await user.tab();

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Sound isn't supported in this browser.",
    );
  });
});

describe("TimerOptions", () => {
  const setup = (needsRestart: boolean) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TimerOptions
        value={0}
        needsRestart={needsRestart}
        isReady
        onChange={onChange}
        onCloseAutoFocus={() => {}}
      />,
    );
    return { user, onChange };
  };

  it("shows the three limits with the current one pressed", () => {
    setup(false);
    const group = screen.getByRole("group", { name: "Time limit" });
    const buttons = within(group).getAllByRole("button");

    expect(buttons.map((button) => button.textContent)).toEqual(["No limit", "20 min", "40 min"]);
    expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
    ]);
  });

  it("changes the limit at once before typing starts", async () => {
    const { user, onChange } = setup(false);
    await user.click(screen.getByRole("button", { name: "20 min" }));

    expect(onChange).toHaveBeenCalledWith(20);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before restarting once typing has started", async () => {
    const { user, onChange } = setup(true);
    await user.click(screen.getByRole("button", { name: "40 min" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Restart with the new time limit?",
    );

    await user.click(screen.getByRole("button", { name: "Restart" }));

    expect(onChange).toHaveBeenCalledWith(40);
  });

  it("keeps the limit when the question is cancelled", async () => {
    const { user, onChange } = setup(true);
    await user.click(screen.getByRole("button", { name: "20 min" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does nothing when the current limit is chosen again", async () => {
    const { user, onChange } = setup(true);
    await user.click(screen.getByRole("button", { name: "No limit" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("TopBar: icon buttons", () => {
  it("names Paste and Library, and shows the name in a tooltip", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(
      <TooltipProvider>
        <TopBar
          answer={null}
          isReady
          onPaste={onPaste}
          onGetAnswers={() => {}}
          onOpenLibrary={() => {}}
        />
      </TooltipProvider>,
    );

    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Paste" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe("Paste");

    await user.keyboard("{Enter}");

    expect(onPaste).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Library" })).toBeTruthy();
  });

  it("keeps Paste, Get answers from AI and Library disabled until the answers are read", () => {
    render(
      <TooltipProvider>
        <TopBar
          answer={null}
          isReady={false}
          onPaste={() => {}}
          onGetAnswers={() => {}}
          onOpenLibrary={() => {}}
        />
      </TooltipProvider>,
    );

    for (const name of ["Paste", "Get answers from AI", "Library"]) {
      expect(screen.getByRole("button", { name })).toHaveProperty("disabled", true);
    }
  });
});
