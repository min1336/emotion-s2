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

    expect(memoryCardRule).toContain("border-radius: 20px;");
    expect(memoryCardRule).toContain("background:");
    expect(ribbonRule).toContain("position: absolute;");
    expect(ribbonRule).toContain("border-radius: 999px;");
    expect(panelRule).toContain("position: relative;");
    expect(panelRule).toContain("overflow: hidden;");
  });

  it("keeps the memory calendar spacing compact", () => {
    const css = readFileSync(stylesPath, "utf8");
    const screenRule = css.match(/\.calendar-memory-screen\s*{[^}]+}/s)?.[0];
    const memoryCardRule = css.match(/\.calendar-memory-card\s*{[^}]+}/s)?.[0];
    const topbarRule = css.match(/\.calendar-topbar\s*{[^}]+}/s)?.[0];
    const titleRule = css.match(/\.calendar-topbar h2\s*{[^}]+}/s)?.[0];
    const gridRule = css.match(/\.calendar-grid\s*{[^}]+}/s)?.[0];
    const rangeHelperRule = css.match(/\.range-helper\s*{[^}]+}/s)?.[0];
    const panelRule = css.match(/\.selected-day-memory-panel\s*{[^}]+}/s)?.[0];

    expect(screenRule).toContain("gap: 10px;");
    expect(memoryCardRule).toContain("padding: 13px;");
    expect(topbarRule).toContain("margin-bottom: 10px;");
    expect(titleRule).toContain("font-size: 19px;");
    expect(titleRule).toContain("padding: 7px 13px;");
    expect(gridRule).toContain("gap: 6px;");
    expect(rangeHelperRule).toContain("margin-top: 10px;");
    expect(rangeHelperRule).toContain("padding: 9px 10px;");
    expect(panelRule).toContain("padding: 13px;");
  });
});
