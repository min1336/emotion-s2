import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { ChatMessage, CoupleMessageRow } from "./domainTypes";
import { sendMediaChatWorkflow, sendTextChatWorkflow } from "./chatSendWorkflow";

const messageRow: CoupleMessageRow = {
  id: "message-1",
  body: "안녕",
  sender_id: "client-1",
  sender_member_key: "jungseo",
  message_type: "text",
  media_storage_path: null,
  media_mime_type: null,
  media_size: null,
  media_file_name: null,
  created_at: "2026-05-26T00:00:00.000Z",
};

function createInput(overrides: Partial<Parameters<typeof sendTextChatWorkflow>[1]> = {}) {
  return {
    body: "안녕",
    coupleCode: "S2-0526",
    coupleSecret: "secret",
    senderId: "client-1",
    senderMemberKey: "jungseo" as const,
    senderName: "정서",
    ...overrides,
  };
}

describe("chatSendWorkflow", () => {
  it("sends a text message and reports delivered push", async () => {
    const calls: string[] = [];
    const supabase = {} as SupabaseClient;

    const result = await sendTextChatWorkflow(
      supabase,
      createInput({
        sendMessage: async (nextSupabase, input) => {
          calls.push(`message:${nextSupabase === supabase}:${input.body}:${input.senderMemberKey}`);
          return { data: messageRow, error: null };
        },
        sendPush: async (nextSupabase, input) => {
          calls.push(`push:${nextSupabase === supabase}:${input.message}:${input.pokeId}`);
          return { attempted: 1, sent: 1 };
        },
      }),
    );

    expect(result).toEqual({
      data: messageRow,
      status: "sent",
      statusMessage: "메시지를 보냈어요. 핸드폰 알림도 보냈어요.",
    });
    expect(calls).toEqual(["message:true:안녕:jungseo", "push:true:안녕:message-1"]);
  });

  it("passes reply target when sending a text message", async () => {
    const calls: string[] = [];

    await sendTextChatWorkflow(
      {} as SupabaseClient,
      createInput({
        replyToMessageId: "message-parent",
        sendMessage: async (_supabase, input) => {
          calls.push(`reply:${input.replyToMessageId}`);
          return { data: messageRow, error: null };
        },
        sendPush: async () => ({ attempted: 0, sent: 0 }),
      }),
    );

    expect(calls).toEqual(["reply:message-parent"]);
  });

  it("reports send failure when the text insert fails", async () => {
    const result = await sendTextChatWorkflow(
      {} as SupabaseClient,
      createInput({
        sendMessage: async () => ({ data: null, error: new Error("insert failed") }),
      }),
    );

    expect(result).toEqual({ status: "failed" });
  });

  it("keeps the sent message when push delivery throws", async () => {
    const result = await sendTextChatWorkflow(
      {} as SupabaseClient,
      createInput({
        sendMessage: async () => ({ data: messageRow, error: null }),
        sendPush: async () => {
          throw new Error("push failed");
        },
      }),
    );

    expect(result).toEqual({
      data: messageRow,
      status: "sent",
      statusMessage: "메시지를 보냈어요. 핸드폰 푸시는 잠시 후 다시 확인해 주세요.",
    });
  });

  it("uploads media, signs the saved row, and reports delivered push", async () => {
    const calls: string[] = [];
    const file = { name: "photo.png", size: 1234, type: "image/png" } as File;
    const savedMediaRow: CoupleMessageRow = {
      ...messageRow,
      id: "media-1",
      body: "photo.png",
      message_type: "image",
      media_storage_path: "S2-0526/messages/jungseo/photo.png",
      media_mime_type: "image/png",
      media_size: 1234,
      media_file_name: "photo.png",
    };
    const signedMessage: ChatMessage = {
      ...savedMediaRow,
      media_url: "signed-url",
    };

    const result = await sendMediaChatWorkflow(
      {} as SupabaseClient,
      {
        coupleCode: "S2-0526",
        coupleSecret: "secret",
        file,
        mediaKind: "image",
        mediaLabel: "사진",
        senderId: "client-1",
        senderMemberKey: "jungseo",
        senderName: "정서",
        signMessages: async (messages) => {
          calls.push(`sign:${messages[0].id}`);
          return [signedMessage];
        },
        storagePath: "S2-0526/messages/jungseo/photo.png",
        uploadMessage: async (_supabase, input) => {
          calls.push(`upload:${input.storagePath}:${input.mediaKind}`);
          return savedMediaRow;
        },
        sendPush: async (_supabase, input) => {
          calls.push(`push:${input.message}:${input.pokeId}`);
          return { attempted: 1, sent: 1 };
        },
      },
    );

    expect(result).toEqual({
      data: signedMessage,
      status: "sent",
      statusMessage: "사진을 보냈어요. 핸드폰 알림도 보냈어요.",
    });
    expect(calls).toEqual([
      "upload:S2-0526/messages/jungseo/photo.png:image",
      "sign:media-1",
      "push:사진을 보냈어요:media-1",
    ]);
  });

  it("reports media send failure when upload throws", async () => {
    const result = await sendMediaChatWorkflow(
      {} as SupabaseClient,
      {
        coupleCode: "S2-0526",
        coupleSecret: "secret",
        file: { name: "photo.png", size: 1234, type: "image/png" } as File,
        mediaKind: "image",
        mediaLabel: "사진",
        senderId: "client-1",
        senderMemberKey: "jungseo",
        senderName: "정서",
        signMessages: async () => [],
        storagePath: "S2-0526/messages/jungseo/photo.png",
        uploadMessage: async () => {
          throw new Error("upload failed");
        },
      },
    );

    expect(result).toEqual({ status: "failed" });
  });

  it("keeps the signed media message when push delivery throws", async () => {
    const savedMediaRow: CoupleMessageRow = {
      ...messageRow,
      id: "media-1",
      message_type: "video",
      media_storage_path: "S2-0526/messages/jungseo/video.mp4",
    };
    const signedMessage: ChatMessage = { ...savedMediaRow, media_url: "signed-video-url" };

    const result = await sendMediaChatWorkflow(
      {} as SupabaseClient,
      {
        coupleCode: "S2-0526",
        coupleSecret: "secret",
        file: { name: "video.mp4", size: 1234, type: "video/mp4" } as File,
        mediaKind: "video",
        mediaLabel: "동영상",
        senderId: "client-1",
        senderMemberKey: "jungseo",
        senderName: "정서",
        signMessages: async () => [signedMessage],
        storagePath: "S2-0526/messages/jungseo/video.mp4",
        uploadMessage: async () => savedMediaRow,
        sendPush: async () => {
          throw new Error("push failed");
        },
      },
    );

    expect(result).toEqual({
      data: signedMessage,
      status: "sent",
      statusMessage: "동영상을 보냈어요. 핸드폰 푸시는 잠시 후 다시 확인해 주세요.",
    });
  });
});
