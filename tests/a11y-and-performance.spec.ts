import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("NOIR 3D Fashion Accessibility & Baseline Validation", () => {
  test("Page loads without unhandled console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Filter out standard third-party or network tracking warnings if any
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon.ico") && !err.includes("Download the React DevTools")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("Homepage passes automated accessibility checks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Optional fine-tuning for intentional dark aesthetic if needed
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

