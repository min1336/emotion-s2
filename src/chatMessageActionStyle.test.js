import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("chat message action styles", () => {
  it("prevents long-press selection on message action surfaces", () => {
    const css = readFileSync(stylesPath, "utf8");
    const nonSelectableRule = css.match(
      /\.chat-bubble,\s*\.chat-reaction-chip,\s*\.chat-action-menu,\s*\.chat-action-menu button\s*{[^}]+}/s,
    )?.[0];

    expect(nonSelectableRule).toContain("-webkit-touch-callout: none;");
    expect(nonSelectableRule).toContain("-webkit-user-select: none;");
    expect(nonSelectableRule).toContain("user-select: none;");
  });
});
