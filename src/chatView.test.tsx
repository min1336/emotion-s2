import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatView } from "./chatView";

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

  it("renders an empty state without messages", () => {
    const html = renderToStaticMarkup(<ChatView {...defaultProps} messages={[]} />);

    expect(html).toContain("아직 주고받은 메시지가 없어요.");
  });
});
