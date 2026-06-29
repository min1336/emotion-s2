import { describe, expect, it } from "vitest";
import { normalizeCoupleCode, normalizeCoupleSecret } from "./coupleAccess";

describe("couple access normalization", () => {
  it("removes whitespace and uppercases invite codes", () => {
    expect(normalizeCoupleCode(" s2- ab12  ")).toBe("S2-AB12");
  });

  it("trims secrets without changing their case or internal spacing", () => {
    expect(normalizeCoupleSecret("  Abc 123  ")).toBe("Abc 123");
  });
});
