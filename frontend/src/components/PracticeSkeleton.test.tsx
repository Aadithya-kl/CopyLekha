import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PracticeSkeleton } from "@/components/PracticeSkeleton";

afterEach(() => {
  cleanup();
});

describe("PracticeSkeleton", () => {
  it("tells screen readers that the answer is loading", () => {
    render(<PracticeSkeleton />);

    const status = screen.getByRole("status", { name: "Loading your answer" });
    expect(status.getAttribute("aria-busy")).toBe("true");
  });
});
