import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("chat composer keyboard style", () => {
  it("lifts the focused composer by the measured keyboard inset", () => {
    const css = readFileSync(stylesPath, "utf8");
    const fixedComposerRule = css.match(
      /\.keyboard-open \.chat-composer-card,\s*\.chat-input-focused \.chat-composer-card\s*{[^}]+}/s,
    )?.[0];

    expect(css).toContain("--chat-keyboard-lift: max(0px, calc(var(--keyboard-inset) + 10px));");
    expect(fixedComposerRule).toContain("bottom: var(--chat-keyboard-lift);");
  });
});
