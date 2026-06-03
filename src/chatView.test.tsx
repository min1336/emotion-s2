import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatView, isMessageActionShortcutKey, submitChatComposer } from "./chatView";

describe("ChatView", () => {
  const defaultProps = {
    chatMessage: "답장",
    currentClientId: "client-a",
    currentMemberKey: "jungseo",
    isUploadingChatMedia: false,
    retryChatMessage: () => undefined,
    sendChatMedia: () => undefined,
    sendChatMessage: () => undefined,
    setChatMessage: () => undefined,
  };

  it("renders sorted messages, sender labels, media, and composer state", () => {
    const html = renderToStaticMarkup(
      <ChatView
        {...defaultProps}
        messages={[
          {
            id: "newer",
            body: null,
            sender_id: "client-b",
            sender_member_key: "minhyeok",
            message_type: "image",
            media_storage_path: "messages/photo.jpg",
            media_mime_type: "image/jpeg",
            media_size: 120,
            media_file_name: "photo.jpg",
            media_url: "https://example.com/photo.jpg",
            created_at: "2026-06-01T09:30:00.000Z",
          },
          {
            id: "older",
            body: "안녕",
            sender_id: "client-a",
            sender_member_key: "jungseo",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            created_at: "2026-06-01T09:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html.indexOf('class="chat-message mine"')).toBeLessThan(html.indexOf('class="chat-message theirs"'));
    expect(html).toContain("나");
    expect(html).toContain("민혁");
    expect(html).toContain("photo.jpg");
    expect(html).toContain("답장");
    expect(html).toContain("메시지를 입력하세요");
  });

  it("renders reply previews and emoji reaction counts", () => {
    const html = renderToStaticMarkup(
      <ChatView
        {...defaultProps}
        messages={[
          {
            id: "original",
            body: "원문 메시지",
            sender_id: "client-b",
            sender_member_key: "minhyeok",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            reply_to_message_id: null,
            created_at: "2026-06-01T09:00:00.000Z",
          },
          {
            id: "reply",
            body: "답장 메시지",
            sender_id: "client-a",
            sender_member_key: "jungseo",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            reply_to_message_id: "original",
            reactions: [
              { emoji: "❤️", member_key: "jungseo", message_id: "reply" },
              { emoji: "❤️", member_key: "minhyeok", message_id: "reply" },
            ],
            created_at: "2026-06-01T09:01:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("답장 대상");
    expect(html).toContain("민혁");
    expect(html).toContain("원문 메시지");
    expect(html).toContain("❤️");
    expect(html).toContain("2");
  });

  it("keeps reply previews and emoji reactions outside of the message bubble", () => {
    const html = renderToStaticMarkup(
      <ChatView
        {...defaultProps}
        messages={[
          {
            id: "original",
            body: "원문",
            sender_id: "client-b",
            sender_member_key: "minhyeok",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            reply_to_message_id: null,
            created_at: "2026-06-01T09:00:00.000Z",
          },
          {
            id: "reply",
            body: "좋아",
            sender_id: "client-a",
            sender_member_key: "jungseo",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            reply_to_message_id: "original",
            reactions: [{ emoji: "👍", member_key: "jungseo", message_id: "reply" }],
            created_at: "2026-06-01T09:01:00.000Z",
          },
        ]}
      />,
    );

    const replyMessageMarkup = html.slice(html.indexOf('class="chat-message mine"'));
    const contextStart = replyMessageMarkup.indexOf('class="chat-message-context"');
    const bubbleStart = replyMessageMarkup.indexOf('class="chat-bubble"');
    const accessoriesStart = replyMessageMarkup.indexOf('class="chat-message-accessories"');

    expect(replyMessageMarkup).toContain('class="chat-message-context"');
    expect(replyMessageMarkup).toContain('class="chat-message-accessories"');
    expect(contextStart).toBeLessThan(bubbleStart);
    expect(accessoriesStart).toBeGreaterThan(bubbleStart);
    expect(replyMessageMarkup.indexOf('class="chat-reaction-row"')).toBeGreaterThan(accessoriesStart);
  });

  it("renders an empty state without messages", () => {
    const html = renderToStaticMarkup(<ChatView {...defaultProps} messages={[]} />);

    expect(html).toContain("아직 주고받은 메시지가 없어요.");
  });

  it("submits a message and keeps the chat input focused", () => {
    const calls: string[] = [];

    submitChatComposer({
      focusChatInput: () => {
        calls.push("focus");
      },
      preventDefault: () => {
        calls.push("prevent");
      },
      sendChatMessage: () => {
        calls.push("send");
      },
    });

    expect(calls).toEqual(["prevent", "send", "focus"]);
  });

  it("opens message actions from standard button shortcut keys", () => {
    expect(isMessageActionShortcutKey("Enter")).toBe(true);
    expect(isMessageActionShortcutKey(" ")).toBe(true);
    expect(isMessageActionShortcutKey("Escape")).toBe(false);
  });
});
