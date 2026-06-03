import { describe, expect, it } from "vitest";
import { getChatMediaUploadSelection } from "./chatMediaSelection";

function createFile(type: string, size: number) {
  return { size, type } as File;
}

describe("chatMediaSelection", () => {
  it("rejects unsupported file types", () => {
    expect(getChatMediaUploadSelection(createFile("application/pdf", 100))).toEqual({
      mediaKind: null,
      status: "invalid-type",
    });
  });

  it("rejects oversized media files", () => {
    expect(getChatMediaUploadSelection(createFile("video/mp4", 50 * 1024 * 1024 + 1))).toEqual({
      mediaKind: "video",
      status: "oversized",
    });
  });

  it("accepts supported image and video files", () => {
    expect(getChatMediaUploadSelection(createFile("image/webp", 100))).toEqual({
      mediaKind: "image",
      status: "ready",
    });
    expect(getChatMediaUploadSelection(createFile("video/quicktime", 100))).toEqual({
      mediaKind: "video",
      status: "ready",
    });
  });
});
