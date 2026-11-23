import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Every flow checks the page with axe at 1280 px and 375 px wide, in
// the light and dark themes. The theme follows the system (the default setting), so the
// color scheme is emulated.

const WIDTHS = [1280, 375] as const;
const COLOR_SCHEMES = ["light", "dark"] as const;
const DEFAULT_WIDTH = 1280;
const HEIGHT = 800;

// A dialog or sheet that is still fading in has blended colors, which axe would report as
// low contrast. So axe runs only once every animation on the page has finished. Endless
// ones, such as the blinking cursor, are left out.
const waitForAnimations = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );

export const expectNoAxeViolations = async (page: Page) => {
  for (const width of WIDTHS) {
    for (const colorScheme of COLOR_SCHEMES) {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.emulateMedia({ colorScheme });
      await waitForAnimations(page);
      const { violations } = await new AxeBuilder({ page }).analyze();

      expect(
        violations.map((violation) => ({
          rule: violation.id,
          elements: violation.nodes.map((node) => node.failureSummary ?? node.target.join(" ")),
        })),
        `axe at ${width} px, ${colorScheme} theme`,
      ).toEqual([]);
    }
  }
  await page.setViewportSize({ width: DEFAULT_WIDTH, height: HEIGHT });
  await page.emulateMedia({ colorScheme: "light" });
};
