import { afterEach, describe, expect, it, vi } from "vitest";

import { track } from "@/lib/analytics";

afterEach(() => {
  delete window.umami;
});

describe("track", () => {
  it("does nothing when Umami is not loaded", () => {
    expect(() => track("prompt_copy")).not.toThrow();
  });

  it("sends the event with its properties", () => {
    const umamiTrack = vi.fn();
    window.umami = { track: umamiTrack };

    track("practice_finish", { task: "task2", complete: false });
    track("answer_import", { source: "ai-import", count: 2 });

    expect(umamiTrack.mock.calls).toEqual([
      ["practice_finish", { task: "task2", complete: false }],
      ["answer_import", { source: "ai-import", count: 2 }],
    ]);
  });

  it("sends an event without properties by its name only", () => {
    const umamiTrack = vi.fn();
    window.umami = { track: umamiTrack };

    track("open_chatgpt");

    expect(umamiTrack.mock.calls).toEqual([["open_chatgpt"]]);
  });

  it("never lets an error from the script reach the app", () => {
    window.umami = {
      track: () => {
        throw new Error("blocked");
      },
    };

    expect(() => track("practice_start", { task: "task1" })).not.toThrow();
  });
});
