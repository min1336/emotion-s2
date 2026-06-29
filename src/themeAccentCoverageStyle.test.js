import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("theme accent coverage styles", () => {
  it("uses theme variables for primary highlighted surfaces", () => {
    const css = readFileSync(stylesPath, "utf8");
    const heroRule = css.match(/\.hero-card\s*{[^}]+}/s)?.[0];
    const heroBeforeRule = css.match(/\.home-hero::before\s*{[^}]+}/s)?.[0];
    const selectedDayRule = css.match(/\.calendar-day\.selected \.calendar-day-number\s*{[^}]+}/s)?.[0];
    const rangeDayRule = css.match(/\.calendar-day\.range-selected\s*{[^}]+}/s)?.[0];

    expect(heroRule).toContain("var(--accent-soft)");
    expect(heroRule).toContain("var(--accent)");
    expect(heroBeforeRule).toContain("var(--accent-soft)");
    expect(selectedDayRule).toContain("var(--accent-soft)");
    expect(selectedDayRule).toContain("var(--accent-strong)");
    expect(rangeDayRule).toContain("var(--accent-soft)");
    expect(rangeDayRule).toContain("var(--accent)");

    expect([heroRule, heroBeforeRule, selectedDayRule, rangeDayRule].join("\n")).not.toMatch(
      /#(?:ffc1b6|ef8b7e|ffd1c4|ff9f96|df655e)/i,
    );
  });
});
