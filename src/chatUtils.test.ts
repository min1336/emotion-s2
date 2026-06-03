import { describe, expect, it } from "vitest";
import {
  compareMessagesOldestFirst,
  isMessageFromCurrentMember,
  markChatMessageFailed,
  mergeChatMessages,
  replaceChatMessage,
} from "./chatUtils";

type TestMessage = {
  delivery_status?: "sending" | "failed";
  id: string;
  created_at: string;
  sender_id: string;
  sender_member_key?: string | null;
  text?: string;
};

function message(overrides: Partial<TestMessage> & Pick<TestMessage, "id">): TestMessage {
  return {
    created_at: "2026-06-02T00:00:00.000Z",
    sender_id: "client-a",
    sender_member_key: "jungseo",
    ...overrides,
  };
}

describe("chat utilities", () => {
  it("sorts messages oldest first by creation time and id", () => {
    const messages = [
      message({ id: "c", created_at: "2026-06-02T00:00:02.000Z" }),
      message({ id: "b", created_at: "2026-06-02T00:00:01.000Z" }),
      message({ id: "a", created_at: "2026-06-02T00:00:01.000Z" }),
    ];

    expect([...messages].sort(compareMessagesOldestFirst).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("merges messages newest first, keeps current duplicates, and caps history", () => {
    const current = [
      message({ id: "same", created_at: "2026-06-02T00:00:03.000Z", text: "current" }),
      message({ id: "older", created_at: "2026-06-02T00:00:01.000Z" }),
    ];
    const incoming = [
      message({ id: "newer", created_at: "2026-06-02T00:00:04.000Z" }),
      message({ id: "same", created_at: "2026-06-02T00:00:03.000Z", text: "incoming" }),
    ];

    const merged = mergeChatMessages(current, incoming, 2);

    expect(merged.map((item) => item.id)).toEqual(["newer", "same"]);
    expect(merged.find((item) => item.id === "same")?.text).toBe("current");
  });

  it("uses member key before client id when deciding whether a message is mine", () => {
    expect(
      isMessageFromCurrentMember(
        message({ id: "mine", sender_id: "other-client", sender_member_key: "minhyeok" }),
        "minhyeok",
        "client-a",
      ),
    ).toBe(true);
    expect(isMessageFromCurrentMember(message({ id: "fallback", sender_member_key: null }), "", "client-a")).toBe(
      true,
    );
  });

  it("keeps all merged messages by default and only caps when requested", () => {
    const current = Array.from({ length: 60 }, (_, index) =>
      message({
        id: `current-${index}`,
        created_at: `2026-06-02T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const incoming = Array.from({ length: 60 }, (_, index) =>
      message({
        id: `incoming-${index}`,
        created_at: `2026-06-02T01:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );

    expect(mergeChatMessages(current, incoming)).toHaveLength(120);
    expect(mergeChatMessages(current, incoming, 50)).toHaveLength(50);
  });

  it("replaces a local chat message with the saved message", () => {
    const current = [
      message({ id: "local-1", created_at: "2026-06-02T00:00:01.000Z", text: "local" }),
      message({ id: "existing", created_at: "2026-06-02T00:00:03.000Z" }),
    ];
    const savedMessage = message({ id: "saved-1", created_at: "2026-06-02T00:00:02.000Z", text: "saved" });

    const nextMessages = replaceChatMessage(current, "local-1", savedMessage);

    expect(nextMessages.map((item) => item.id)).toEqual(["existing", "saved-1"]);
    expect(nextMessages.some((item) => item.id === "local-1")).toBe(false);
  });

  it("marks only the failed local message as failed", () => {
    const current = [
      message({ id: "local-1", delivery_status: "sending" }),
      message({ id: "other", delivery_status: "sending" }),
    ];

    expect(markChatMessageFailed(current, "local-1")).toEqual([
      { ...current[0], delivery_status: "failed" },
      current[1],
    ]);
  });
});
