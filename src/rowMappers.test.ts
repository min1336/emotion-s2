import { describe, expect, it } from "vitest";
import { mapEvent, mapPhoto, mapRealtimeMessagePayload, mapTodo } from "./rowMappers";

describe("Supabase row mappers", () => {
  it("maps event rows and trims database-only nulls", () => {
    expect(
      mapEvent({
        id: "event-1",
        title: "여행",
        event_date: "2026-06-01",
        event_end_date: null,
        event_time: "09:30:00",
        memo: null,
        created_at: "2026-05-31T00:00:00.000Z",
      }),
    ).toEqual({
      id: "event-1",
      title: "여행",
      date: "2026-06-01",
      time: "09:30",
      createdAt: "2026-05-31T00:00:00.000Z",
    });
  });

  it("maps todo rows", () => {
    expect(
      mapTodo({
        id: "todo-1",
        title: "예약하기",
        completed: false,
        created_at: "2026-06-01T00:00:00.000Z",
      }),
    ).toEqual({
      id: "todo-1",
      title: "예약하기",
      completed: false,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("maps photo rows with signed URL variants", () => {
    expect(
      mapPhoto(
        {
          id: "photo-1",
          photo_date: "2026-06-01",
          storage_path: "S2/photos/photo.jpg",
          caption: null,
          uploaded_by: "jungseo",
          created_at: "2026-06-01T00:00:00.000Z",
        },
        { displayUrl: "display-url", thumbnailUrl: "thumb-url", url: "original-url" },
      ),
    ).toEqual({
      id: "photo-1",
      date: "2026-06-01",
      storagePath: "S2/photos/photo.jpg",
      url: "original-url",
      thumbnailUrl: "thumb-url",
      displayUrl: "display-url",
      uploadedBy: "jungseo",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("maps realtime message payloads into message rows", () => {
    expect(
      mapRealtimeMessagePayload(
        {
          id: "message-1",
          body: undefined,
          sender_id: "client-1",
          sender_member_key: "jungseo",
          message_type: "image",
          media_storage_path: "S2/messages/photo.png",
          media_mime_type: "image/png",
          media_size: 1234,
          media_file_name: "photo.png",
          created_at: "",
        },
        () => "2026-06-01T00:00:00.000Z",
      ),
    ).toEqual({
      id: "message-1",
      body: null,
      sender_id: "client-1",
      sender_member_key: "jungseo",
      message_type: "image",
      media_storage_path: "S2/messages/photo.png",
      media_mime_type: "image/png",
      media_size: 1234,
      media_file_name: "photo.png",
      created_at: "2026-06-01T00:00:00.000Z",
    });
  });

  it("rejects realtime message payloads without a valid member", () => {
    expect(mapRealtimeMessagePayload({ id: "message-1", sender_member_key: "other" })).toBeNull();
    expect(mapRealtimeMessagePayload({ sender_member_key: "jungseo" })).toBeNull();
  });
});
