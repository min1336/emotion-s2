import { describe, expect, it } from "vitest";
import {
  getChatMediaExtension,
  getChatMediaKind,
  getChatMediaLabel,
  getChatMessageText,
  getPhotoExtension,
  isAllowedChatMediaType,
} from "./mediaUtils";

describe("media utilities", () => {
  it("normalizes image extensions from file names and MIME types", () => {
    expect(getPhotoExtension(new File([""], "photo.jpeg", { type: "image/jpeg" }))).toBe("jpg");
    expect(getPhotoExtension(new File([""], "upload", { type: "image/webp" }))).toBe("webp");
  });

  it("classifies allowed chat media files", () => {
    const image = new File([""], "photo.png", { type: "image/png" });
    const video = new File([""], "clip.mov", { type: "video/quicktime" });
    const text = new File([""], "note.txt", { type: "text/plain" });

    expect(getChatMediaKind(image)).toBe("image");
    expect(getChatMediaKind(video)).toBe("video");
    expect(getChatMediaKind(text)).toBeNull();
    expect(isAllowedChatMediaType(image)).toBe(true);
    expect(isAllowedChatMediaType(text)).toBe(false);
  });

  it("uses media labels when a chat message has no body", () => {
    expect(getChatMediaExtension(new File([""], "clip", { type: "video/webm" }))).toBe("webm");
    expect(getChatMediaLabel("video")).toBe("동영상");
    expect(getChatMessageText({ body: "  안녕  ", message_type: "text" })).toBe("안녕");
    expect(getChatMessageText({ body: null, message_type: "image" })).toBe("사진을 보냈어요");
  });
});
