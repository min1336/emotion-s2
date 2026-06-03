import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ChatView,
  activateChatReply,
  isMessageActionShortcutKey,
  shouldCloseMessageActionsFromPointerTarget,
  submitChatComposer,
} from "./chatView";

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

  it("renders the sent time beside the message bubble", () => {
    const html = renderToStaticMarkup(
      <ChatView
        {...defaultProps}
        messages={[
          {
            id: "mine",
            body: "시간은 옆에",
            sender_id: "client-a",
            sender_member_key: "jungseo",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            created_at: "2026-06-01T09:01:00.000Z",
          },
        ]}
      />,
    );

    const messageMarkup = html.slice(html.indexOf('class="chat-message mine"'));
    const sideMetaStart = messageMarkup.indexOf('class="chat-message-side-meta"');
    const bubbleStart = messageMarkup.indexOf('class="chat-bubble"');
    const bubbleEnd = messageMarkup.indexOf('class="chat-message-accessories"');

    expect(messageMarkup).toContain('class="chat-message-main"');
    expect(messageMarkup).toContain('class="chat-message-side-meta"');
    expect(sideMetaStart).toBeGreaterThan(-1);
    expect(sideMetaStart).toBeLessThan(bubbleStart);
    expect(messageMarkup.indexOf("<time")).toBeLessThan(bubbleStart);
    expect(messageMarkup.slice(bubbleStart, bubbleEnd)).not.toContain("<time");
  });

  it("side-aligns reply context and reply message rows in the same direction", () => {
    const html = renderToStaticMarkup(
      <ChatView
        {...defaultProps}
        messages={[
          {
            id: "mine",
            body: "내 답장",
            sender_id: "client-a",
            sender_member_key: "jungseo",
            message_type: "text",
            media_storage_path: null,
            media_mime_type: null,
            media_size: null,
            media_file_name: null,
            reply_to_message_id: "theirs",
            created_at: "2026-06-01T09:01:00.000Z",
          },
          {
            id: "theirs",
            body: "상대 메시지",
            sender_id: "client-b",
            sender_member_key: "minhyeok",
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

    expect(html).toContain('class="chat-message-stack side-end"');
    expect(html).toContain('class="chat-message-stack side-start"');
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

  it("activates the chat input immediately and after render when replying", () => {
    const calls: string[] = [];

    activateChatReply({
      focusChatInput: () => {
        calls.push("focus");
      },
      message: { id: "message-1" },
      replyToMessage: (message) => {
        calls.push(`reply:${message.id}`);
      },
      scheduleFocusRetry: (focusChatInput) => {
        calls.push("schedule");
        focusChatInput();
      },
    });

    expect(calls).toEqual(["focus", "reply:message-1", "schedule", "focus"]);
  });

  it("opens message actions from standard button shortcut keys", () => {
    expect(isMessageActionShortcutKey("Enter")).toBe(true);
    expect(isMessageActionShortcutKey(" ")).toBe(true);
    expect(isMessageActionShortcutKey("Escape")).toBe(false);
  });

  it("closes message actions only when the pointer starts outside the action surface", () => {
    const insideTarget = {} as Node;
    const outsideTarget = {} as Node;
    const actionSurface = {
      contains: (target: Node) => target === insideTarget,
    } as Pick<HTMLElement, "contains">;

    expect(shouldCloseMessageActionsFromPointerTarget(insideTarget, actionSurface)).toBe(false);
    expect(shouldCloseMessageActionsFromPointerTarget(outsideTarget, actionSurface)).toBe(true);
    expect(shouldCloseMessageActionsFromPointerTarget(null, actionSurface)).toBe(true);
  });
});
