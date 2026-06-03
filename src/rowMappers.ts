import type {
  CoupleEvent,
  CoupleEventRow,
  CoupleMessageRow,
  CouplePhoto,
  CouplePhotoRow,
  CoupleTodo,
  CoupleTodoRow,
  PhotoUrlSet,
} from "./domainTypes";
import type { ChatMessageKind } from "./mediaUtils";

export type RealtimeMessagePayload = {
  body?: string | null;
  created_at?: string | null;
  id?: string | null;
  media_file_name?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
  media_storage_path?: string | null;
  message_type?: ChatMessageKind | string | null;
  reply_to_message_id?: string | null;
  sender_id?: string | null;
  sender_member_key?: string | null;
};

export function mapEvent(row: CoupleEventRow): CoupleEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    endDate: row.event_end_date || undefined,
    time: row.event_time?.slice(0, 5) || undefined,
    memo: row.memo || undefined,
    createdAt: row.created_at,
  };
}

export function mapTodo(row: CoupleTodoRow): CoupleTodo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

export function mapPhoto(row: CouplePhotoRow, urls: PhotoUrlSet): CouplePhoto {
  return {
    id: row.id,
    date: row.photo_date,
    storagePath: row.storage_path,
    url: urls.url,
    thumbnailUrl: urls.thumbnailUrl,
    displayUrl: urls.displayUrl,
    caption: row.caption || undefined,
    uploadedBy: row.uploaded_by || undefined,
    createdAt: row.created_at,
  };
}

export function mapRealtimeMessagePayload(
  row: RealtimeMessagePayload | null | undefined,
  now: () => string = () => new Date().toISOString(),
): CoupleMessageRow | null {
  if (!row?.id || row.sender_member_key !== "jungseo" && row.sender_member_key !== "minhyeok") {
    return null;
  }

  const messageType = row.message_type === "image" || row.message_type === "video" ? row.message_type : "text";
  return {
    id: row.id,
    body: row.body ?? null,
    sender_id: row.sender_id || "",
    sender_member_key: row.sender_member_key,
    message_type: messageType,
    media_storage_path: row.media_storage_path || null,
    media_mime_type: row.media_mime_type || null,
    media_size: row.media_size || null,
    media_file_name: row.media_file_name || null,
    reply_to_message_id: row.reply_to_message_id || null,
    created_at: row.created_at || now(),
  };
}
