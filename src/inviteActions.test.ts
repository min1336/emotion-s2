import { describe, expect, it } from "vitest";
import {
  INVITE_COPIED_MESSAGE,
  INVITE_MANUAL_COPY_MESSAGE,
  INVITE_SHARED_MESSAGE,
  copyInviteLinkWithFallback,
  shareInviteLinkWithFallback,
} from "./inviteActions";

describe("inviteActions", () => {
  it("skips copy when invite link is empty", async () => {
    const calls: string[] = [];

    const result = await copyInviteLinkWithFallback({
      copyTextWithFallback: () => {
        calls.push("legacy-copy");
        return true;
      },
      inviteLink: "",
      selectInviteLink: () => calls.push("select"),
    });

    expect(result).toEqual({ message: null, status: "skipped" });
    expect(calls).toEqual([]);
  });

  it("copies with the legacy fallback first", async () => {
    const result = await copyInviteLinkWithFallback({
      copyTextWithFallback: (text) => text === "https://example.com/invite",
      inviteLink: "https://example.com/invite",
      selectInviteLink: () => undefined,
    });

    expect(result).toEqual({ message: INVITE_COPIED_MESSAGE, status: "copied" });
  });

  it("falls back to clipboard write when legacy copy fails", async () => {
    const calls: string[] = [];

    const result = await copyInviteLinkWithFallback({
      copyTextWithFallback: () => false,
      inviteLink: "https://example.com/invite",
      selectInviteLink: () => calls.push("select"),
      writeClipboardText: async (text) => {
        calls.push(`clipboard:${text}`);
      },
    });

    expect(result).toEqual({ message: INVITE_COPIED_MESSAGE, status: "copied" });
    expect(calls).toEqual(["clipboard:https://example.com/invite"]);
  });

  it("selects the visible invite link when automatic copy fails", async () => {
    const calls: string[] = [];

    const result = await copyInviteLinkWithFallback({
      copyTextWithFallback: () => false,
      inviteLink: "https://example.com/invite",
      selectInviteLink: (textLength) => calls.push(`select:${textLength}`),
      writeClipboardText: async () => {
        throw new Error("blocked");
      },
    });

    expect(result).toEqual({ message: INVITE_MANUAL_COPY_MESSAGE, status: "manual-copy" });
    expect(calls).toEqual(["select:26"]);
  });

  it("shares with the native share sheet when available", async () => {
    const calls: string[] = [];

    const result = await shareInviteLinkWithFallback({
      copyInviteLink: async () => {
        calls.push("copy");
        return { message: INVITE_COPIED_MESSAGE, status: "copied" };
      },
      inviteLink: "https://example.com/invite",
      share: async (shareData) => {
        calls.push(`share:${shareData.url}`);
      },
    });

    expect(result).toEqual({ message: INVITE_SHARED_MESSAGE, status: "shared" });
    expect(calls).toEqual(["share:https://example.com/invite"]);
  });

  it("falls back to copy when native share is cancelled or unavailable", async () => {
    const result = await shareInviteLinkWithFallback({
      copyInviteLink: async () => ({ message: INVITE_COPIED_MESSAGE, status: "copied" }),
      inviteLink: "https://example.com/invite",
      share: async () => {
        throw new Error("cancelled");
      },
    });

    expect(result).toEqual({ message: INVITE_COPIED_MESSAGE, status: "copied" });
  });
});
