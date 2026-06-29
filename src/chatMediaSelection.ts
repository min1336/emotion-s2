import type { ChatMessageKind } from "./mediaUtils";
import { getChatMediaKind, isAllowedChatMediaType } from "./mediaUtils";

export const MAX_CHAT_MEDIA_SIZE = 50 * 1024 * 1024;

type ChatMediaKind = Exclude<ChatMessageKind, "text">;

type ChatMediaUploadSelection =
  | { mediaKind: null; status: "invalid-type" }
  | { mediaKind: ChatMediaKind; status: "oversized" }
  | { mediaKind: ChatMediaKind; status: "ready" };

export function getChatMediaUploadSelection(
  file: File,
  maxSize = MAX_CHAT_MEDIA_SIZE,
): ChatMediaUploadSelection {
  const mediaKind = getChatMediaKind(file);
  if (!mediaKind || !isAllowedChatMediaType(file)) {
    return { mediaKind: null, status: "invalid-type" };
  }

  if (file.size > maxSize) {
    return { mediaKind, status: "oversized" };
  }

  return { mediaKind, status: "ready" };
}
