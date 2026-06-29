import { describe, expect, it } from "vitest";
import {
  createOptimisticMediaMessage,
  createOptimisticTextMessage,
} from "./optimisticChatMessages";

describe("optimisticChatMessages", () => {
  it("creates a sending text message with generated id and timestamp", () => {
    expect(
      createOptimisticTextMessage({
        body: "안녕",
        createdAt: () => "2026-05-26T00:00:00.000Z",
        createId: () => "local-1",
        senderId: "client-1",
        senderMemberKey: "jungseo",
      }),
    ).toEqual({
      body: "안녕",
      created_at: "2026-05-26T00:00:00.000Z",
      delivery_status: "sending",
      id: "local-1",
      media_file_name: null,
      media_mime_type: null,
      media_size: null,
      media_storage_path: null,
      message_type: "text",
      reply_to_message_id: null,
      sender_id: "client-1",
      sender_member_key: "jungseo",
    });
  });

  it("reuses failed text message ids when retrying", () => {
    expect(
      createOptimisticTextMessage({
        body: "다시",
        createdAt: () => "2026-05-26T00:00:00.000Z",
        createId: () => "local-new",
        failedMessageId: "local-failed",
        senderId: "client-1",
        senderMemberKey: "minhyeok",
      }).id,
    ).toBe("local-failed");
  });

  it("keeps the reply target on optimistic text messages", () => {
    expect(
      createOptimisticTextMessage({
        body: "답장",
        createdAt: () => "2026-05-26T00:00:00.000Z",
        createId: () => "local-reply",
        replyToMessageId: "message-1",
        senderId: "client-1",
        senderMemberKey: "jungseo",
      }).reply_to_message_id,
    ).toBe("message-1");
  });

  it("creates a sending media message with local file metadata", () => {
    const file = {
      name: "photo.webp",
      size: 1234,
      type: "image/webp",
    } as File;

    expect(
      createOptimisticMediaMessage({
        coupleCode: "S2-0526",
        createdAt: () => "2026-05-26T00:00:00.000Z",
        createId: () => "local-media",
        createObjectUrl: () => "blob:photo",
        createStorageId: () => "storage-id",
        extension: "webp",
        file,
        mediaKind: "image",
        mediaLabel: "사진",
        senderId: "client-1",
        senderMemberKey: "jungseo",
      }),
    ).toEqual({
      message: {
        body: "photo.webp",
        created_at: "2026-05-26T00:00:00.000Z",
        delivery_status: "sending",
        id: "local-media",
        local_file: file,
        media_file_name: "photo.webp",
        media_mime_type: "image/webp",
        media_size: 1234,
        media_storage_path: "S2-0526/messages/jungseo/storage-id.webp",
        media_url: "blob:photo",
        message_type: "image",
        reply_to_message_id: null,
        sender_id: "client-1",
        sender_member_key: "jungseo",
      },
      storagePath: "S2-0526/messages/jungseo/storage-id.webp",
    });
  });

  it("uses a label fallback when the media file has no name", () => {
    const file = {
      name: "",
      size: 1234,
      type: "video/mp4",
    } as File;

    const result = createOptimisticMediaMessage({
      coupleCode: "S2-0526",
      createdAt: () => "2026-05-26T00:00:00.000Z",
      createId: () => "local-media",
      createObjectUrl: () => "blob:video",
      createStorageId: () => "storage-id",
      extension: "mp4",
      file,
      mediaKind: "video",
      mediaLabel: "동영상",
      senderId: "client-1",
      senderMemberKey: "minhyeok",
    });

    expect(result.message.body).toBe("동영상을 보냈어요");
    expect(result.message.media_file_name).toBeNull();
  });

  it("keeps the reply target on optimistic media messages", () => {
    const file = {
      name: "photo.webp",
      size: 1234,
      type: "image/webp",
    } as File;

    expect(
      createOptimisticMediaMessage({
        coupleCode: "S2-0526",
        createObjectUrl: () => "blob:photo",
        extension: "webp",
        file,
        mediaKind: "image",
        mediaLabel: "사진",
        replyToMessageId: "message-1",
        senderId: "client-1",
        senderMemberKey: "jungseo",
      }).message.reply_to_message_id,
    ).toBe("message-1");
  });
});
