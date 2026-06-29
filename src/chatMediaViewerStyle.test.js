import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "styles.css");

describe("chat media viewer styles", () => {
  it("renders the viewer as a full viewport overlay", () => {
    const css = readFileSync(stylesPath, "utf8");
    const viewerRule = css.match(/\.chat-media-viewer\s*{[^}]+}/s)?.[0];

    expect(viewerRule).toContain("position: fixed;");
    expect(viewerRule).toContain("inset: 0;");
    expect(viewerRule).toContain("z-index:");
  });
});
