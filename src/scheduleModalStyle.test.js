import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("schedule modal styles", () => {
  it("keeps the time wheel visually slim", () => {
    const css = readFileSync(stylesPath, "utf8");
    const sheetRule = css.match(/\.time-wheel-sheet\s*{[^}]+}/s)?.[0];
    const columnRule = css.match(/\.time-wheel-column\s*{[^}]+}/s)?.[0];
    const optionRule = css.match(/\.time-wheel-option\s*{[^}]+}/s)?.[0];

    expect(sheetRule).toContain("border-radius: 16px;");
    expect(sheetRule).toContain("gap: 8px;");
    expect(sheetRule).toContain("padding: 8px;");
    expect(columnRule).toContain("gap: 4px;");
    expect(columnRule).toContain("max-height: 120px;");
    expect(optionRule).toContain("font-size: 13px;");
    expect(optionRule).toContain("min-height: 32px;");
  });
});
