import { describe, expect, it } from "vitest";
import { COUPLE_CODE_CHARS, generateCoupleCode, generateCoupleSecret } from "./coupleCodeUtils";

describe("couple code generation", () => {
  it("generates invite codes with the expected prefix and alphabet", () => {
    const code = generateCoupleCode();
    const alphabet = `[${COUPLE_CODE_CHARS}]{4}`;
    const suffix = `[${COUPLE_CODE_CHARS}]{2}`;

    expect(code).toMatch(new RegExp(`^S2-${alphabet}-${suffix}$`));
  });

  it("generates lowercase invite secrets in three groups", () => {
    expect(generateCoupleSecret()).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  });
});
