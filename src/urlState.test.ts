import { describe, expect, it } from "vitest";
import {
  buildInviteLink,
  getInitialCodeInput,
  getInitialSecretInput,
  getInitialTab,
} from "./urlState";

describe("urlState", () => {
  it("reads initial couple code and secret from query params", () => {
    expect(getInitialCodeInput("?code=s2 0526")).toBe("S20526");
    expect(getInitialSecretInput("?invite= secret ")).toBe("secret");
    expect(getInitialSecretInput("?secret=fallback")).toBe("fallback");
  });

  it("starts on chat only when the query param explicitly asks for chat", () => {
    expect(getInitialTab("?tab=chat")).toBe("chat");
    expect(getInitialTab("?tab=calendar")).toBe("home");
    expect(getInitialTab("")).toBe("home");
  });

  it("builds an invite link when a couple code exists", () => {
    expect(
      buildInviteLink({
        coupleCode: "S2-0526",
        coupleSecret: "secret value",
        origin: "https://example.com",
        pathname: "/app",
      }),
    ).toBe("https://example.com/app?code=S2-0526&invite=secret%20value");

    expect(
      buildInviteLink({
        coupleCode: "",
        coupleSecret: "secret",
        origin: "https://example.com",
        pathname: "/app",
      }),
    ).toBe("");
  });
});
