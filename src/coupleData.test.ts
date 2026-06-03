import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { fetchCoupleSnapshot, fetchRecentMessages, signChatMediaMessages } from "./coupleData";
import type {
  ChatMessage,
  CoupleEventRow,
  CoupleMessageRow,
  CouplePhotoRow,
  CoupleTodoRow,
} from "./domainTypes";

type QueryResult = {
  data: unknown[] | null;
  error: unknown;
};

function createQueryBuilder(table: string, result: QueryResult, calls: string[]) {
  const builder = {
    select(columns: string) {
      calls.push(`${table}.select:${columns}`);
      return builder;
    },
    eq(column: string, value: string) {
      calls.push(`${table}.eq:${column}:${value}`);
      return builder;
    },
    gte(column: string, value: string) {
      calls.push(`${table}.gte:${column}:${value}`);
      return builder;
    },
    in(column: string, values: string[]) {
      calls.push(`${table}.in:${column}:${values.join(",")}`);
      return builder;
    },
    order(column: string) {
      calls.push(`${table}.order:${column}`);
      return builder;
    },
    limit(value: number) {
      calls.push(`${table}.limit:${value}`);
      return builder;
    },
    then(resolve: (result: QueryResult) => void) {
      resolve(result);
    },
  };

  return builder;
}

function createSupabase(results: Record<string, QueryResult>, signedUrls: Record<string, string>, calls: string[]) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return createQueryBuilder(table, results[table] || { data: [], error: null }, calls);
    },
    storage: {
      from(bucket: string) {
        calls.push(`storage.from:${bucket}`);
        return {
          async createSignedUrl(path: string) {
            calls.push(`signed:${path}`);
            return { data: { signedUrl: signedUrls[path] || "" }, error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
}

describe("coupleData", () => {
  it("fetches and maps a couple data snapshot", async () => {
    const calls: string[] = [];
    const eventRow: CoupleEventRow = {
      id: "event-1",
      title: "데이트",
      event_date: "2026-06-01",
      event_end_date: null,
      event_time: "09:30:00",
      memo: null,
      created_at: "2026-06-01T00:00:00.000Z",
    };
    const photoRow: CouplePhotoRow = {
      id: "photo-1",
      photo_date: "2026-06-01",
      storage_path: "S2/photo.jpg",
      caption: null,
      uploaded_by: "jungseo",
      created_at: "2026-06-01T00:00:00.000Z",
    };
    const todoRow: CoupleTodoRow = {
      id: "todo-1",
      title: "예약하기",
      completed: false,
      created_at: "2026-06-01T00:00:00.000Z",
    };
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
      created_at: "2026-06-01T09:00:00.000Z",
    };
    const supabase = createSupabase(
      {
        couple_events: { data: [eventRow], error: null },
        couple_photos: { data: [photoRow], error: null },
        couple_todos: { data: [todoRow], error: null },
        couple_messages: { data: [messageRow], error: null },
      },
      {
        "S2/photo.jpg": "signed-url",
      },
      calls,
    );
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
    };

    const snapshot = await fetchCoupleSnapshot({
      coupleCode: "S2-0526",
      signChatMediaMessages: async (messages) =>
        messages.map((message) => ({ ...message, media_url: "signed-message-url" }) as ChatMessage),
      storage,
      supabase,
    });

    expect(calls).toContain("from:couple_events");
    expect(calls).toContain("couple_events.eq:couple_code:S2-0526");
    expect(calls).toContain("from:couple_photos");
    expect(calls).toContain("from:couple_todos");
    expect(calls).toContain("from:couple_messages");
    expect(calls).toContain("storage.from:couple-photos");
    expect(snapshot.events).toEqual([{ id: "event-1", title: "데이트", date: "2026-06-01", time: "09:30", createdAt: "2026-06-01T00:00:00.000Z" }]);
    expect(snapshot.photos[0]).toMatchObject({ id: "photo-1", url: "signed-url", thumbnailUrl: "signed-url" });
    expect(snapshot.todos).toEqual([{ id: "todo-1", title: "예약하기", completed: false, createdAt: "2026-06-01T00:00:00.000Z" }]);
    expect(snapshot.messages[0]).toMatchObject({ id: "message-1", media_url: "signed-message-url" });
    expect(snapshot.latestMessageCreatedAt).toBe("2026-06-01T09:00:00.000Z");
  });

  it("throws when any snapshot query fails", async () => {
    const supabase = createSupabase(
      {
        couple_events: { data: null, error: new Error("events failed") },
      },
      {},
      [],
    );

    await expect(
      fetchCoupleSnapshot({
        coupleCode: "S2-0526",
        signChatMediaMessages: async (messages) => messages,
        storage: { getItem: () => null, setItem: () => undefined },
        supabase,
      }),
    ).rejects.toThrow("Unable to load couple data");
  });

  it("fetches recent messages since a timestamp", async () => {
    const calls: string[] = [];
    const messageRow: CoupleMessageRow = {
      id: "message-1",
      body: "최근 메시지",
      sender_id: "client-a",
      sender_member_key: "minhyeok",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      created_at: "2026-06-01T09:00:00.000Z",
    };
    const supabase = createSupabase(
      {
        couple_messages: { data: [messageRow], error: null },
      },
      {},
      calls,
    );

    const messages = await fetchRecentMessages({
      coupleCode: "S2-0526",
      signChatMediaMessages: async (rows) => rows,
      since: "2026-06-01T08:59:00.000Z",
      supabase,
    });

    expect(calls).toContain("couple_messages.gte:created_at:2026-06-01T08:59:00.000Z");
    expect(calls).toContain("couple_messages.limit:50");
    expect(messages).toEqual([{ ...messageRow, reactions: [] }]);
  });

  it("signs chat media message URLs", async () => {
    const calls: string[] = [];
    const messages: ChatMessage[] = [
      {
        id: "message-1",
        body: "photo.png",
        sender_id: "client-a",
        sender_member_key: "jungseo",
        message_type: "image",
        media_storage_path: "S2/messages/photo.png",
        media_mime_type: "image/png",
        media_size: 10,
        media_file_name: "photo.png",
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ];
    const supabase = {
      storage: {
        from(bucket: string) {
          calls.push(`storage.from:${bucket}`);
          return {
            async createSignedUrls(paths: string[], ttl: number) {
              calls.push(`signed:${paths.join(",")}:${ttl}`);
              return {
                data: [{ path: "S2/messages/photo.png", signedUrl: "signed-media-url" }],
                error: null,
              };
            },
          };
        },
      },
    } as unknown as SupabaseClient;

    const signedMessages = await signChatMediaMessages(supabase, messages);

    expect(calls).toEqual(["storage.from:couple-chat-media", "signed:S2/messages/photo.png:3600"]);
    expect(signedMessages[0]).toMatchObject({ id: "message-1", media_url: "signed-media-url" });
  });
});
