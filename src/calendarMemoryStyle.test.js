import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("calendar memory styles", () => {
  it("defines stamp, ribbon, and selected-day memory surfaces", () => {
    const css = readFileSync(stylesPath, "utf8");
    const memoryCardRule = css.match(/\.calendar-memory-card\s*{[^}]+}/s)?.[0];
    const ribbonRule = css.match(/\.calendar-day-event-ribbon\s*{[^}]+}/s)?.[0];
    const panelRule = css.match(/\.selected-day-memory-panel\s*{[^}]+}/s)?.[0];

    expect(memoryCardRule).toContain("border-radius: 26px;");
    expect(memoryCardRule).toContain("background:");
    expect(ribbonRule).toContain("position: absolute;");
    expect(ribbonRule).toContain("border-radius: 999px;");
    expect(panelRule).toContain("position: relative;");
    expect(panelRule).toContain("overflow: hidden;");
  });
});
