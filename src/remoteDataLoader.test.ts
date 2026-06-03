import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { ChatMessage, CoupleEvent, CouplePhoto, CoupleTodo } from "./domainTypes";
import { runRemoteDataLoad } from "./remoteDataLoader";

function createSnapshot() {
  return {
    events: [{ id: "event-1", createdAt: "2026-05-26T00:00:00.000Z", date: "2026-05-26", title: "date" }],
    latestMessageCreatedAt: "2026-05-26T00:00:01.000Z",
    messages: [
      {
        id: "message-1",
        body: "hello",
        created_at: "2026-05-26T00:00:01.000Z",
        media_file_name: null,
        media_mime_type: null,
        media_size: null,
        media_storage_path: null,
        message_type: "text",
        sender_id: "sender",
        sender_member_key: "jungseo",
      },
    ] satisfies ChatMessage[],
    photos: [
      {
        id: "photo-1",
        createdAt: "2026-05-26T00:00:00.000Z",
        date: "2026-05-26",
        displayUrl: "display",
        storagePath: "photo.jpg",
        thumbnailUrl: "thumb",
        url: "url",
      },
    ] satisfies CouplePhoto[],
    todos: [{ id: "todo-1", completed: false, createdAt: "2026-05-26T00:00:00.000Z", title: "pack" }],
  };
}

describe("remoteDataLoader", () => {
  it("loads a snapshot into state and clears the loading flag", async () => {
    const calls: string[] = [];
    const latestMessageCheckedAtRef = { current: "" };
    let nextEvents: CoupleEvent[] = [];
    let nextMessages: ChatMessage[] = [];
    let nextPhotos: CouplePhoto[] = [];
    let nextTodos: CoupleTodo[] = [];

    const result = await runRemoteDataLoad({
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      fetchSnapshot: async () => {
        calls.push("fetch");
        return createSnapshot();
      },
      latestMessageCheckedAtRef,
      mergeMessages: (_current, snapshotMessages) => snapshotMessages,
      notice: "사진 삭제됨",
      requestIdRef: { current: 0 },
      setEvents: (events) => {
        calls.push("events");
        nextEvents = events;
      },
      setIsLoading: (isLoading) => {
        calls.push(`loading:${isLoading}`);
      },
      setMessages: (updater) => {
        calls.push("messages");
        nextMessages = updater([]);
      },
      setPhotos: (photos) => {
        calls.push("photos");
        nextPhotos = photos;
      },
      setStatusMessage: (message) => {
        calls.push(`status:${message}`);
      },
      setTodos: (todos) => {
        calls.push("todos");
        nextTodos = todos;
      },
      signChatMediaMessages: async (messages) => messages,
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "loaded" });
    expect(calls).toEqual([
      "loading:true",
      "fetch",
      "events",
      "photos",
      "todos",
      "messages",
      "status:사진 삭제됨",
      "loading:false",
    ]);
    expect(nextEvents).toHaveLength(1);
    expect(nextPhotos).toHaveLength(1);
    expect(nextTodos).toHaveLength(1);
    expect(nextMessages).toHaveLength(1);
    expect(latestMessageCheckedAtRef.current).toBe("2026-05-26T00:00:01.000Z");
  });

  it("ignores a stale snapshot when a newer request starts first", async () => {
    const calls: string[] = [];
    const requestIdRef = { current: 0 };

    const result = await runRemoteDataLoad({
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      fetchSnapshot: async () => {
        calls.push("fetch");
        requestIdRef.current += 1;
        return createSnapshot();
      },
      latestMessageCheckedAtRef: { current: "" },
      requestIdRef,
      setEvents: () => {
        calls.push("events");
      },
      setIsLoading: (isLoading) => {
        calls.push(`loading:${isLoading}`);
      },
      setMessages: () => {
        calls.push("messages");
      },
      setPhotos: () => {
        calls.push("photos");
      },
      setStatusMessage: () => {
        calls.push("status");
      },
      setTodos: () => {
        calls.push("todos");
      },
      signChatMediaMessages: async (messages) => messages,
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "stale" });
    expect(calls).toEqual(["loading:true", "fetch"]);
  });

  it("reports an error only for the latest request", async () => {
    const calls: string[] = [];

    const result = await runRemoteDataLoad({
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      fetchSnapshot: async () => {
        throw new Error("network");
      },
      latestMessageCheckedAtRef: { current: "" },
      requestIdRef: { current: 0 },
      setEvents: () => undefined,
      setIsLoading: (isLoading) => {
        calls.push(`loading:${isLoading}`);
      },
      setMessages: () => undefined,
      setPhotos: () => undefined,
      setStatusMessage: (message) => {
        calls.push(`status:${message}`);
      },
      setTodos: () => undefined,
      signChatMediaMessages: async (messages) => messages,
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "failed" });
    expect(calls).toEqual([
      "loading:true",
      "status:데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      "loading:false",
    ]);
  });

  it("skips loading when session inputs are missing", async () => {
    const calls: string[] = [];
    const requestIdRef = { current: 7 };

    const result = await runRemoteDataLoad({
      coupleCode: "",
      coupleSecret: "secret",
      latestMessageCheckedAtRef: { current: "" },
      requestIdRef,
      setEvents: () => undefined,
      setIsLoading: (isLoading) => {
        calls.push(`loading:${isLoading}`);
      },
      setMessages: () => undefined,
      setPhotos: () => undefined,
      setStatusMessage: () => undefined,
      setTodos: () => undefined,
      signChatMediaMessages: async (messages) => messages,
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "skipped" });
    expect(requestIdRef.current).toBe(8);
    expect(calls).toEqual(["loading:false"]);
  });
});
