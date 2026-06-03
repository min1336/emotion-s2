import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  addCoupleEvent,
  addCoupleTodo,
  deleteCoupleEvent,
  deleteCouplePhoto,
  deleteCoupleTodo,
  sendTextChatMessage,
  reactToCoupleMessage,
  updateCoupleTodoCompleted,
  uploadChatMediaMessage,
  uploadCouplePhotos,
} from "./coupleMutations";
import type { CoupleMessageRow } from "./domainTypes";

type MutationResult = {
  error: unknown;
};

function createMutationBuilder(table: string, calls: string[], result: MutationResult) {
  return {
    insert(payload: unknown) {
      calls.push(`${table}.insert:${JSON.stringify(payload)}`);
      return Promise.resolve(result);
    },
    delete() {
      calls.push(`${table}.delete`);
      return {
        eq(column: string, value: string) {
          calls.push(`${table}.eq:${column}:${value}`);
          return Promise.resolve(result);
        },
      };
    },
    update(payload: unknown) {
      calls.push(`${table}.update:${JSON.stringify(payload)}`);
      return {
        eq(column: string, value: string) {
          calls.push(`${table}.eq:${column}:${value}`);
          return Promise.resolve(result);
        },
      };
    },
  };
}

function createSupabase(calls: string[], result: MutationResult = { error: null }) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return createMutationBuilder(table, calls, result);
    },
  } as unknown as SupabaseClient;
}

function createPhotoSupabase(
  calls: string[],
  options: { insertError?: unknown; removeError?: unknown; uploadError?: unknown } = {},
) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return createMutationBuilder(table, calls, { error: options.insertError || null });
    },
    storage: {
      from(bucket: string) {
        calls.push(`storage.from:${bucket}`);
        return {
          async upload(path: string, _file: File, optionsForUpload: unknown) {
            calls.push(`upload:${path}:${JSON.stringify(optionsForUpload)}`);
            return { error: options.uploadError || null };
          },
          async remove(paths: string[]) {
            calls.push(`remove:${paths.join(",")}`);
            return { error: options.removeError || null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
}

function createChatSupabase(
  calls: string[],
  messageRow: CoupleMessageRow,
  options: { insertError?: unknown; uploadError?: unknown } = {},
) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        insert(payload: unknown) {
          calls.push(`${table}.insert:${JSON.stringify(payload)}`);
          return {
            select(columns: string) {
              calls.push(`${table}.select:${columns}`);
              return {
                single() {
                  calls.push(`${table}.single`);
                  return Promise.resolve({
                    data: options.insertError ? null : messageRow,
                    error: options.insertError || null,
                  });
                },
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        calls.push(`storage.from:${bucket}`);
        return {
          async upload(path: string, _file: File, optionsForUpload: unknown) {
            calls.push(`upload:${path}:${JSON.stringify(optionsForUpload)}`);
            return { error: options.uploadError || null };
          },
          async remove(paths: string[]) {
            calls.push(`remove:${paths.join(",")}`);
            return { error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
}

describe("coupleMutations", () => {
  it("adds and deletes couple events", async () => {
    const calls: string[] = [];
    const supabase = createSupabase(calls);

    await addCoupleEvent(supabase, {
      coupleCode: "S2-0526",
      title: "데이트",
      startDate: "2026-06-01",
      endDate: "2026-06-02",
      time: "09:30",
      memo: "메모",
    });
    await deleteCoupleEvent(supabase, "event-1");

    expect(calls).toContain("from:couple_events");
    expect(calls).toContain(
      'couple_events.insert:{"couple_code":"S2-0526","title":"데이트","event_date":"2026-06-01","event_end_date":"2026-06-02","event_time":"09:30","memo":"메모"}',
    );
    expect(calls).toContain("couple_events.delete");
    expect(calls).toContain("couple_events.eq:id:event-1");
  });

  it("normalizes optional event fields", async () => {
    const calls: string[] = [];
    const supabase = createSupabase(calls);

    await addCoupleEvent(supabase, {
      coupleCode: "S2-0526",
      title: "하루 일정",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      time: "",
      memo: "",
    });

    expect(calls).toContain(
      'couple_events.insert:{"couple_code":"S2-0526","title":"하루 일정","event_date":"2026-06-01","event_end_date":null,"event_time":null,"memo":null}',
    );
  });

  it("adds, updates, and deletes todos", async () => {
    const calls: string[] = [];
    const supabase = createSupabase(calls);

    await addCoupleTodo(supabase, { coupleCode: "S2-0526", title: "예약하기" });
    await updateCoupleTodoCompleted(supabase, "todo-1", true);
    await deleteCoupleTodo(supabase, "todo-1");

    expect(calls).toContain('couple_todos.insert:{"couple_code":"S2-0526","title":"예약하기","completed":false}');
    expect(calls).toContain('couple_todos.update:{"completed":true}');
    expect(calls).toContain("couple_todos.delete");
    expect(calls).toContain("couple_todos.eq:id:todo-1");
  });

  it("uploads photos and inserts photo rows", async () => {
    const calls: string[] = [];
    const supabase = createPhotoSupabase(calls);
    const file = new File(["image"], "photo.png", { type: "image/png" });

    const result = await uploadCouplePhotos(supabase, {
      coupleCode: "S2-0526",
      createId: () => "photo-id",
      date: "2026-06-01",
      files: [file],
      uploadedBy: "jungseo",
    });

    expect(result).toEqual({ uploadedCount: 1, storagePaths: ["S2-0526/2026-06-01/photo-id.png"] });
    expect(calls).toContain("storage.from:couple-photos");
    expect(calls).toContain(
      'upload:S2-0526/2026-06-01/photo-id.png:{"cacheControl":"604800","contentType":"image/png","upsert":false}',
    );
    expect(calls).toContain(
      'couple_photos.insert:[{"couple_code":"S2-0526","photo_date":"2026-06-01","storage_path":"S2-0526/2026-06-01/photo-id.png","uploaded_by":"jungseo"}]',
    );
  });

  it("removes uploaded photo files when row insert fails", async () => {
    const calls: string[] = [];
    const supabase = createPhotoSupabase(calls, { insertError: new Error("insert failed") });
    const file = new File(["image"], "photo.png", { type: "image/png" });

    await expect(
      uploadCouplePhotos(supabase, {
        coupleCode: "S2-0526",
        createId: () => "photo-id",
        date: "2026-06-01",
        files: [file],
        uploadedBy: null,
      }),
    ).rejects.toThrow("insert failed");

    expect(calls).toContain("remove:S2-0526/2026-06-01/photo-id.png");
  });

  it("deletes photo rows before removing the stored file", async () => {
    const calls: string[] = [];
    const supabase = createPhotoSupabase(calls);

    const result = await deleteCouplePhoto(supabase, {
      id: "photo-1",
      storagePath: "S2-0526/2026-06-01/photo-id.png",
    });

    expect(result).toEqual({ deleteError: null, storageError: null });
    expect(calls).toContain("couple_photos.delete");
    expect(calls).toContain("couple_photos.eq:id:photo-1");
    expect(calls).toContain("remove:S2-0526/2026-06-01/photo-id.png");
  });

  it("sends a text chat message and returns the inserted row", async () => {
    const calls: string[] = [];
    const messageRow: CoupleMessageRow = {
      id: "message-1",
      body: "안녕",
      sender_id: "client-a",
      sender_member_key: "jungseo",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      created_at: "2026-06-01T00:00:00.000Z",
    };
    const supabase = createChatSupabase(calls, messageRow);

    const result = await sendTextChatMessage(supabase, {
      body: "안녕",
      coupleCode: "S2-0526",
      senderId: "client-a",
      senderMemberKey: "jungseo",
    });

    expect(result.data).toBe(messageRow);
    expect(calls).toContain(
      'couple_messages.insert:{"couple_code":"S2-0526","sender_id":"client-a","sender_member_key":"jungseo","body":"안녕","message_type":"text"}',
    );
    expect(calls).toContain("couple_messages.single");
  });

  it("stores reply targets when sending a text chat message", async () => {
    const calls: string[] = [];
    const messageRow: CoupleMessageRow = {
      id: "message-1",
      body: "답장",
      sender_id: "client-a",
      sender_member_key: "jungseo",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      reply_to_message_id: "message-parent",
      created_at: "2026-06-01T00:00:00.000Z",
    };
    const supabase = createChatSupabase(calls, messageRow);

    await sendTextChatMessage(supabase, {
      body: "답장",
      coupleCode: "S2-0526",
      replyToMessageId: "message-parent",
      senderId: "client-a",
      senderMemberKey: "jungseo",
    });

    expect(calls).toContain(
      'couple_messages.insert:{"couple_code":"S2-0526","sender_id":"client-a","sender_member_key":"jungseo","body":"답장","message_type":"text","reply_to_message_id":"message-parent"}',
    );
  });

  it("upserts a chat message emoji reaction", async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        calls.push(`from:${table}`);
        return {
          upsert(payload: unknown, options: unknown) {
            calls.push(`${table}.upsert:${JSON.stringify(payload)}:${JSON.stringify(options)}`);
            return Promise.resolve({ error: null });
          },
        };
      },
    } as unknown as SupabaseClient;

    await reactToCoupleMessage(supabase, {
      coupleCode: "S2-0526",
      emoji: "❤️",
      memberKey: "jungseo",
      messageId: "message-1",
    });

    expect(calls).toEqual([
      "from:couple_message_reactions",
      'couple_message_reactions.upsert:{"couple_code":"S2-0526","message_id":"message-1","member_key":"jungseo","emoji":"❤️"}:{"onConflict":"message_id,member_key"}',
    ]);
  });

  it("uploads chat media and cleans up storage when message insert fails", async () => {
    const calls: string[] = [];
    const messageRow: CoupleMessageRow = {
      id: "message-1",
      body: "photo.png",
      sender_id: "client-a",
      sender_member_key: "jungseo",
      message_type: "image",
      media_storage_path: "S2/messages/jungseo/media-id.png",
      media_mime_type: "image/png",
      media_size: 5,
      media_file_name: "photo.png",
      created_at: "2026-06-01T00:00:00.000Z",
    };
    const supabase = createChatSupabase(calls, messageRow, { insertError: new Error("insert failed") });
    const file = new File(["image"], "photo.png", { type: "image/png" });

    await expect(
      uploadChatMediaMessage(supabase, {
        coupleCode: "S2-0526",
        file,
        mediaKind: "image",
        senderId: "client-a",
        senderMemberKey: "jungseo",
        storagePath: "S2/messages/jungseo/media-id.png",
      }),
    ).rejects.toThrow("insert failed");

    expect(calls).toContain("storage.from:couple-chat-media");
    expect(calls).toContain("remove:S2/messages/jungseo/media-id.png");
  });
});
