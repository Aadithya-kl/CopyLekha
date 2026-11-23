import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StatusBar } from "@/components/StatusBar";

const MINUTE = 60_000;

const renderStatusBar = (remainingMs: number | null) =>
  render(
    <StatusBar
      elapsedMs={5 * MINUTE}
      remainingMs={remainingMs}
      wordsTyped={10}
      wordsTotal={100}
      onRestart={() => {}}
      onFinish={() => {}}
    />,
  );

afterEach(() => {
  cleanup();
});

describe("StatusBar: the time", () => {
  it("counts up without a time limit, never in the warning color", () => {
    renderStatusBar(null);

    expect(screen.getByText("05:00").getAttribute("data-warning")).toBe("false");
  });

  it("shows the time left in the usual color until the last two minutes", () => {
    renderStatusBar(2 * MINUTE + 1000);

    expect(screen.getByText("02:01").getAttribute("data-warning")).toBe("false");
  });

  it("shows the time left in the warning color in the last two minutes", () => {
    renderStatusBar(2 * MINUTE);

    expect(screen.getByText("02:00").getAttribute("data-warning")).toBe("true");
  });
});
