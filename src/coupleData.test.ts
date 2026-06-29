import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { fetchCoupleSnapshot, fetchOlderMessages, fetchRecentMessages, signChatMediaMessages } from "./coupleData";
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

type QueryState = {
  rangeFrom: number | null;
  rangeTo: number | null;
};

type QueryResultSource = QueryResult | ((state: QueryState) => QueryResult);

function createQueryBuilder(table: string, resultSource: QueryResultSource, calls: string[]) {
  const queryState: QueryState = {
    rangeFrom: null,
    rangeTo: null,
  };
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
    lt(column: string, value: string) {
      calls.push(`${table}.lt:${column}:${value}`);
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
    range(from: number, to: number) {
      calls.push(`${table}.range:${from}:${to}`);
      queryState.rangeFrom = from;
      queryState.rangeTo = to;
      return builder;
    },
    then(resolve: (result: QueryResult) => void) {
      const result = typeof resultSource === "function" ? resultSource(queryState) : resultSource;
      resolve(result);
    },
  };

  return builder;
}

function createSupabase(results: Record<string, QueryResultSource>, signedUrls: Record<string, string>, calls: string[]) {
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
    expect(calls).toContain("couple_messages.range:0:100");
    expect(calls).toContain("storage.from:couple-photos");
    expect(snapshot.events).toEqual([{ id: "event-1", title: "데이트", date: "2026-06-01", time: "09:30", createdAt: "2026-06-01T00:00:00.000Z" }]);
    expect(snapshot.photos[0]).toMatchObject({ id: "photo-1", url: "signed-url", thumbnailUrl: "signed-url" });
    expect(snapshot.todos).toEqual([{ id: "todo-1", title: "예약하기", completed: false, createdAt: "2026-06-01T00:00:00.000Z" }]);
    expect(snapshot.messages[0]).toMatchObject({ id: "message-1", media_url: "signed-message-url" });
    expect(snapshot.hasOlderMessages).toBe(false);
    expect(snapshot.latestMessageCreatedAt).toBe("2026-06-01T09:00:00.000Z");
  });

  it("keeps only the latest 100 messages in the initial snapshot", async () => {
    const calls: string[] = [];
    const messageRows = Array.from({ length: 101 }, (_, index): CoupleMessageRow => ({
      id: `message-${index}`,
      body: `메시지 ${index}`,
      sender_id: "client-a",
      sender_member_key: "jungseo",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      created_at: new Date(Date.UTC(2026, 5, 1, 9, 0, index)).toISOString(),
    }));
    const supabase = createSupabase(
      {
        couple_events: { data: [], error: null },
        couple_photos: { data: [], error: null },
        couple_todos: { data: [], error: null },
        couple_messages: { data: messageRows, error: null },
      },
      {},
      calls,
    );

    const snapshot = await fetchCoupleSnapshot({
      coupleCode: "S2-0526",
      signChatMediaMessages: async (messages) => messages,
      storage: { getItem: () => null, setItem: () => undefined },
      supabase,
    });

    expect(calls).toContain("couple_messages.range:0:100");
    expect(snapshot.messages).toHaveLength(100);
    expect(snapshot.hasOlderMessages).toBe(true);
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
    expect(calls.some((call) => call.startsWith("couple_messages.limit:"))).toBe(false);
    expect(messages).toEqual([{ ...messageRow, reactions: [] }]);
  });

  it("fetches recent messages across storage pages by default", async () => {
    const calls: string[] = [];
    const firstPage = Array.from({ length: 1000 }, (_, index): CoupleMessageRow => ({
      id: `message-${String(index).padStart(4, "0")}`,
      body: `최근 메시지 ${index}`,
      sender_id: "client-a",
      sender_member_key: "minhyeok",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      created_at: `2026-06-01T09:${String(index % 60).padStart(2, "0")}:00.000Z`,
    }));
    const secondPage: CoupleMessageRow[] = [
      {
        id: "message-1000",
        body: "마지막 메시지",
        sender_id: "client-a",
        sender_member_key: "minhyeok",
        message_type: "text",
        media_storage_path: null,
        media_mime_type: null,
        media_size: null,
        media_file_name: null,
        created_at: "2026-06-01T10:00:00.000Z",
      },
    ];
    const supabase = createSupabase(
      {
        couple_messages: ({ rangeFrom }) => ({
          data: rangeFrom === 0 ? firstPage : secondPage,
          error: null,
        }),
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

    expect(calls).toContain("couple_messages.range:0:999");
    expect(calls).toContain("couple_messages.range:1000:1999");
    expect(messages).toHaveLength(1001);
  });

  it("returns empty recent messages when a sync page fails", async () => {
    const supabase = createSupabase(
      {
        couple_messages: { data: null, error: new Error("recent failed") },
      },
      {},
      [],
    );

    await expect(
      fetchRecentMessages({
        coupleCode: "S2-0526",
        signChatMediaMessages: async (rows) => rows,
        since: "2026-06-01T08:59:00.000Z",
        supabase,
      }),
    ).resolves.toEqual([]);
  });

  it("fetches older messages before the oldest loaded timestamp", async () => {
    const calls: string[] = [];
    const messageRow: CoupleMessageRow = {
      id: "older-message",
      body: "이전 메시지",
      sender_id: "client-b",
      sender_member_key: "minhyeok",
      message_type: "text",
      media_storage_path: null,
      media_mime_type: null,
      media_size: null,
      media_file_name: null,
      created_at: "2026-06-01T08:00:00.000Z",
    };
    const supabase = createSupabase(
      {
        couple_messages: { data: [messageRow], error: null },
      },
      {},
      calls,
    );

    const page = await fetchOlderMessages({
      before: "2026-06-01T09:00:00.000Z",
      coupleCode: "S2-0526",
      signChatMediaMessages: async (messages) => messages,
      supabase,
    });

    expect(calls).toContain("couple_messages.lt:created_at:2026-06-01T09:00:00.000Z");
    expect(calls).toContain("couple_messages.range:0:100");
    expect(page).toEqual({ hasMore: false, messages: [{ ...messageRow, reactions: [] }] });
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
