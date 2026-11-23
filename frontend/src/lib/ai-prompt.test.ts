import { describe, expect, it } from "vitest";

import { AI_PROMPT, getChatGptUrl } from "@/lib/ai-prompt";

describe("getChatGptUrl", () => {
  it("opens ChatGPT with the whole prompt in the address", () => {
    const url = new URL(getChatGptUrl());

    expect(url.origin + url.pathname).toBe("https://chatgpt.com/");
    expect(url.searchParams.get("q")).toBe(AI_PROMPT);
  });
});
