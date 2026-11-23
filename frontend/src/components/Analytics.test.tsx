import { cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Next's Script loads the file itself; here it is a plain <script> tag, so the test checks
// only whether the app asks for the Umami script, and with which attributes.
vi.mock("next/script", () => ({
  default: (props: ComponentProps<"script">) => <script data-testid="umami" {...props} />,
}));

// The analytics check reads the environment when the module loads, so it is imported again
// after the environment is set.
const renderAnalytics = async () => {
  vi.resetModules();
  const { Analytics } = await import("@/components/Analytics");
  const { container } = render(<Analytics />);
  return container.querySelector("script");
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("Analytics", () => {
  it("loads nothing outside a production build", async () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");

    expect(await renderAnalytics()).toBeNull();
  });

  it("loads nothing in a production build without an Umami id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");

    expect(await renderAnalytics()).toBeNull();
  });

  it("loads the Umami script in a production build with an Umami id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL", "");

    const script = await renderAnalytics();

    expect(script?.getAttribute("src")).toBe("https://cloud.umami.is/script.js");
    expect(script?.getAttribute("data-website-id")).toBe("test-website-id");
  });

  it("uses a self-hosted Umami script when its address is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL", "https://stats.example.com/script.js");

    const script = await renderAnalytics();

    expect(script?.getAttribute("src")).toBe("https://stats.example.com/script.js");
  });
});
