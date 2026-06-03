import type { ChatMessage, MemberKey } from "./domainTypes";
import type { ChatMessageKind } from "./mediaUtils";

type ChatMediaKind = Exclude<ChatMessageKind, "text">;

type CreateOptimisticTextMessageInput = {
  body: string;
  createdAt?: () => string;
  createId?: () => string;
  failedMessageId?: string;
  senderId: string;
  senderMemberKey: MemberKey;
};

type CreateOptimisticMediaMessageInput = {
  coupleCode: string;
  createdAt?: () => string;
  createId?: () => string;
  createObjectUrl?: (file: File) => string;
  createStorageId?: () => string;
  extension: string;
  failedMessageId?: string;
  file: File;
  mediaKind: ChatMediaKind;
  mediaLabel: string;
  senderId: string;
  senderMemberKey: MemberKey;
};

export function createOptimisticTextMessage({
  body,
  createdAt = () => new Date().toISOString(),
  createId = () => `local-${crypto.randomUUID()}`,
  failedMessageId,
  senderId,
  senderMemberKey,
}: CreateOptimisticTextMessageInput): ChatMessage {
  return {
    body,
    created_at: createdAt(),
    delivery_status: "sending",
    id: failedMessageId || createId(),
    media_file_name: null,
    media_mime_type: null,
    media_size: null,
    media_storage_path: null,
    message_type: "text",
    sender_id: senderId,
    sender_member_key: senderMemberKey,
  };
}

export function createOptimisticMediaMessage({
  coupleCode,
  createdAt = () => new Date().toISOString(),
  createId = () => `local-${crypto.randomUUID()}`,
  createObjectUrl = (file) => URL.createObjectURL(file),
  createStorageId = () => crypto.randomUUID(),
  extension,
  failedMessageId,
  file,
  mediaKind,
  mediaLabel,
  senderId,
  senderMemberKey,
}: CreateOptimisticMediaMessageInput) {
  const storagePath = `${coupleCode}/messages/${senderMemberKey}/${createStorageId()}.${extension}`;

  return {
    message: {
      body: file.name || `${mediaLabel}을 보냈어요`,
      created_at: createdAt(),
      delivery_status: "sending",
      id: failedMessageId || createId(),
      local_file: file,
      media_file_name: file.name || null,
      media_mime_type: file.type,
      media_size: file.size,
      media_storage_path: storagePath,
      media_url: createObjectUrl(file),
      message_type: mediaKind,
      sender_id: senderId,
      sender_member_key: senderMemberKey,
    } satisfies ChatMessage,
    storagePath,
  };
}
