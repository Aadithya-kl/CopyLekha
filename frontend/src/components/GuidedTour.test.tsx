import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { findTourSteps, GuidedTour, TOUR_STEPS } from "@/components/GuidedTour";

beforeAll(() => {
  // jsdom has no layout, so scrolling does nothing.
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
});

// The page's controls, each with its data-tour name; some steps can be left out.
const Controls = ({ targets }: { targets: readonly string[] }) => (
  <>
    {targets.map((target) => (
      <button key={target} type="button" data-tour={target}>
        {target}
      </button>
    ))}
  </>
);

const ALL_TARGETS = TOUR_STEPS.map((step) => step.target);

// As on the page: the controls are there first, then the tour starts with their steps.
const renderTour = (targets: readonly string[] = ALL_TARGETS) => {
  const handleEnd = vi.fn();
  const { rerender } = render(<Controls targets={targets} />);
  rerender(
    <>
      <Controls targets={targets} />
      <GuidedTour steps={findTourSteps()} onEnd={handleEnd} onCloseAutoFocus={() => {}} />
    </>,
  );
  return { handleEnd, user: userEvent.setup() };
};

const getStep = () => screen.getByRole("dialog");

describe("GuidedTour", () => {
  it("starts at the first step, outlines its control and focuses Next", () => {
    renderTour();

    expect(getStep().textContent).toContain("1 of 6");
    expect(screen.getByRole("dialog", { name: "The model answer" })).toBeTruthy();
    expect(screen.getByText("model-answer").getAttribute("data-tour-active")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
  });

  it("moves on with Next and back with Back, outlining one control at a time", async () => {
    const { user } = renderTour();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Your typing box" })).toBeTruthy();
    expect(screen.getByText("model-answer").hasAttribute("data-tour-active")).toBe(false);
    expect(screen.getByText("typing-box").getAttribute("data-tour-active")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "The model answer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("moves with the arrow keys", async () => {
    const { user } = renderTour();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(getStep().textContent).toContain("3 of 6");

    await user.keyboard("{ArrowLeft}");
    expect(getStep().textContent).toContain("2 of 6");
  });

  it("ends with Done on the last step", async () => {
    const { handleEnd, user } = renderTour();
    for (let step = 1; step < TOUR_STEPS.length; step += 1) {
      await user.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(getStep().textContent).toContain("6 of 6");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(handleEnd).toHaveBeenCalledOnce();
  });

  it("ends with Skip tour and with Esc", async () => {
    const { handleEnd, user } = renderTour();

    await user.click(screen.getByRole("button", { name: "Skip tour" }));
    await user.keyboard("{Escape}");

    expect(handleEnd).toHaveBeenCalledTimes(2);
  });

  it("leaves out a step whose control isn't on the page", () => {
    renderTour(ALL_TARGETS.filter((target) => target !== "model-answer"));

    expect(getStep().textContent).toContain("1 of 5");
    expect(screen.getByRole("dialog", { name: "Your typing box" })).toBeTruthy();
  });

  it("finds no step when no control is on the page", () => {
    expect(findTourSteps()).toEqual([]);
  });
});
