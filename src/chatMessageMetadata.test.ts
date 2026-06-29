import { describe, expect, it } from "vitest";
import {
  attachChatReactions,
  getChatReplyPreview,
  summarizeChatReactions,
} from "./chatMessageMetadata";
import type { ChatMessage, ChatMessageReactionRow } from "./domainTypes";

const messages: ChatMessage[] = [
  {
    id: "message-1",
    body: "원문",
    created_at: "2026-06-01T09:00:00.000Z",
    media_file_name: null,
    media_mime_type: null,
    media_size: null,
    media_storage_path: null,
    message_type: "text",
    reply_to_message_id: null,
    sender_id: "client-a",
    sender_member_key: "jungseo",
  },
  {
    id: "message-2",
    body: "답장",
    created_at: "2026-06-01T09:01:00.000Z",
    media_file_name: null,
    media_mime_type: null,
    media_size: null,
    media_storage_path: null,
    message_type: "text",
    reply_to_message_id: "message-1",
    sender_id: "client-b",
    sender_member_key: "minhyeok",
  },
];

describe("chatMessageMetadata", () => {
  it("finds a reply preview from the loaded message list", () => {
    expect(getChatReplyPreview(messages, "message-1")).toEqual({
      id: "message-1",
      sender_member_key: "jungseo",
      text: "원문",
    });
  });

  it("summarizes reactions by emoji and marks my reaction", () => {
    expect(
      summarizeChatReactions(
        [
          { emoji: "❤️", member_key: "jungseo", message_id: "message-2" },
          { emoji: "❤️", member_key: "minhyeok", message_id: "message-2" },
          { emoji: "👍", member_key: "minhyeok", message_id: "message-2" },
        ],
        "jungseo",
      ),
    ).toEqual([
      { count: 2, emoji: "❤️", reactedByMe: true },
      { count: 1, emoji: "👍", reactedByMe: false },
    ]);
  });

  it("attaches reaction rows to their messages", () => {
    const rows: ChatMessageReactionRow[] = [
      { emoji: "❤️", member_key: "jungseo", message_id: "message-2" },
      { emoji: "👍", member_key: "minhyeok", message_id: "message-2" },
    ];

    expect(attachChatReactions(messages, rows)[1].reactions).toEqual(rows);
    expect(attachChatReactions(messages, rows)[0].reactions).toEqual([]);
  });
});
