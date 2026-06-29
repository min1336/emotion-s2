export type ChatMessageKind = "text" | "image" | "video";

export const CHAT_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

function getExtensionFromName(fileName: string) {
  if (!fileName.includes(".")) {
    return "";
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return /^[a-z0-9]+$/.test(extension) ? extension : "";
}

export function getPhotoExtension(file: File) {
  const extensionFromName = getExtensionFromName(file.name);
  if (extensionFromName) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

export function getChatMediaKind(file: File): Exclude<ChatMessageKind, "text"> | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return null;
}

export function isAllowedChatMediaType(file: File) {
  return CHAT_MEDIA_ACCEPT.split(",").includes(file.type);
}

export function getChatMediaExtension(file: File) {
  const extensionFromName = getExtensionFromName(file.name);
  if (extensionFromName) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  if (file.type === "video/webm") {
    return "webm";
  }

  if (file.type === "video/quicktime") {
    return "mov";
  }

  return file.type.startsWith("video/") ? "mp4" : "jpg";
}

export function getChatMediaLabel(kind: ChatMessageKind) {
  if (kind === "image") {
    return "사진";
  }

  if (kind === "video") {
    return "동영상";
  }

  return "메시지";
}

export function getChatMessageText(message: Pick<{ body: string | null; message_type: ChatMessageKind }, "body" | "message_type">) {
  if (message.body?.trim()) {
    return message.body.trim();
  }

  return `${getChatMediaLabel(message.message_type)}을 보냈어요`;
}
