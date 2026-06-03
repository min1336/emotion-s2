import type { ChatMessageKind } from "./mediaUtils";

export const memberKeys = ["jungseo", "minhyeok"] as const;

export type MemberKey = (typeof memberKeys)[number];
export type ChatDeliveryStatus = "sending" | "failed";

export type CoupleEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  memo?: string;
  createdAt: string;
};

export type CouplePhoto = {
  id: string;
  date: string;
  storagePath: string;
  url: string;
  thumbnailUrl: string;
  displayUrl: string;
  caption?: string;
  uploadedBy?: MemberKey;
  createdAt: string;
};

export type CoupleTodo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type CoupleEventRow = {
  id: string;
  title: string;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  memo: string | null;
  created_at: string;
};

export type CoupleTodoRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export type CouplePhotoRow = {
  id: string;
  photo_date: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: MemberKey | null;
  created_at: string;
};

export type CoupleMessageRow = {
  id: string;
  body: string | null;
  sender_id: string;
  sender_member_key: MemberKey;
  message_type: ChatMessageKind;
  media_storage_path: string | null;
  media_mime_type: string | null;
  media_size: number | null;
  media_file_name: string | null;
  reply_to_message_id?: string | null;
  created_at: string;
};

export type ChatMessageReactionRow = {
  emoji: string;
  member_key: MemberKey;
  message_id: string;
};

export type ChatReactionSummary = {
  count: number;
  emoji: string;
  reactedByMe: boolean;
};

export type ChatMessage = CoupleMessageRow & {
  delivery_status?: ChatDeliveryStatus;
  media_url?: string;
  reactions?: ChatMessageReactionRow[];
  local_file?: File;
};

export type PhotoUrlSet = {
  displayUrl: string;
  thumbnailUrl: string;
  url: string;
};
