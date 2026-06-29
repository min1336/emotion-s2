import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const appPath = join(sourceDir, "App.tsx");
const stylesPath = join(sourceDir, "styles.css");

describe("app header chrome", () => {
  it("keeps the main header actions to settings and notification controls", () => {
    const app = readFileSync(appPath, "utf8");
    const css = readFileSync(stylesPath, "utf8");
    const headerActionsRule = css.match(/\.header-actions\s*{[^}]+}/s)?.[0];
    const mobileHeaderActionsRule = css.match(
      /@media \(max-width: 420px\)\s*{[\s\S]*?\.header-actions\s*{[^}]+}/,
    )?.[0];

    expect(app).not.toContain('aria-label="현재 커플 공간"');
    expect(headerActionsRule).toContain("grid-template-columns: 46px 46px;");
    expect(mobileHeaderActionsRule).toContain("grid-template-columns: 42px 42px;");
  });
});
