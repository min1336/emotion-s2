import { describe, expect, it } from "vitest";
import { getInitialCoupleState } from "./initialCoupleState";

describe("initialCoupleState", () => {
  it("resumes a stored couple when the invite input is empty", () => {
    expect(
      getInitialCoupleState({
        initialCodeInput: "",
        initialSecretInput: "",
        storedCoupleCode: "S2-0526",
        storedCoupleSecret: "secret",
      }),
    ).toEqual({
      codeInput: "S2-0526",
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      joinMode: "join",
      secretInput: "secret",
    });
  });

  it("uses invite input without resuming a different stored couple", () => {
    expect(
      getInitialCoupleState({
        initialCodeInput: "NEW",
        initialSecretInput: "new-secret",
        storedCoupleCode: "S2-0526",
        storedCoupleSecret: "secret",
      }),
    ).toEqual({
      codeInput: "NEW",
      coupleCode: "",
      coupleSecret: "",
      joinMode: "join",
      secretInput: "new-secret",
    });
  });

  it("starts in create mode when no invite or stored couple exists", () => {
    expect(
      getInitialCoupleState({
        initialCodeInput: "",
        initialSecretInput: "",
        storedCoupleCode: "",
        storedCoupleSecret: "",
      }),
    ).toMatchObject({
      joinMode: "create",
    });
  });
});
