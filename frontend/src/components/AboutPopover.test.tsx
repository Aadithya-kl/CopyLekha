import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/SiteFooter";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const openAbout = async () => {
  const user = userEvent.setup();
  render(<SiteFooter onOpenHowItWorks={() => {}} onCloseAutoFocus={() => {}} />);
  await user.click(screen.getByRole("button", { name: "About" }));
  return screen.getByRole("dialog", { name: "About CopyLekha" });
};

describe("SiteFooter and AboutPopover", () => {
  it("shows the author line and the About button", () => {
    render(<SiteFooter onOpenHowItWorks={() => {}} onCloseAutoFocus={() => {}} />);

    expect(screen.getByRole("contentinfo").textContent).toContain("Built by Hossain. Bangladesh.");
    expect(screen.getByRole("button", { name: "About" })).toBeTruthy();
  });

  it("links to the author and the repository, each in a new tab", async () => {
    await openAbout();
    const links = screen.getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["GitHub (opens in a new tab)", "https://github.com/hossain101199"],
      ["LinkedIn (opens in a new tab)", "https://www.linkedin.com/in/hossain1011/"],
      ["View source on GitHub (opens in a new tab)", "https://github.com/hossain101199/CopyLekha"],
      ["Report an issue (opens in a new tab)", "https://github.com/hossain101199/CopyLekha/issues"],
    ]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("says where the data stays, and nothing about counting in a build without analytics", async () => {
    const about = await openAbout();

    expect(about.textContent).toContain("CopyLekha: copywork practice for IELTS Academic Writing.");
    expect(about.textContent).toContain("Your answers and progress stay in your browser.");
    expect(about.textContent).not.toContain("We count anonymous usage");
    expect(about.textContent).not.toMatch(/@\w/);
  });

  it("says what is counted in a production build with an Umami id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");
    vi.resetModules();
    // Imported again, so the analytics check reads the stubbed environment.
    const { SiteFooter: FooterWithAnalytics } = await import("@/components/SiteFooter");
    const user = userEvent.setup();
    render(<FooterWithAnalytics onOpenHowItWorks={() => {}} onCloseAutoFocus={() => {}} />);
    await user.click(screen.getByRole("button", { name: "About" }));

    expect(screen.getByRole("dialog", { name: "About CopyLekha" }).textContent).toContain(
      "We count anonymous usage (no cookies, no personal data) to improve the app.",
    );
  });
});
