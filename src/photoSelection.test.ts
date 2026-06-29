import { describe, expect, it } from "vitest";
import { getPhotoUploadSelection } from "./photoSelection";

function createFile(type: string, size: number, name = "file") {
  return { name, size, type } as File;
}

describe("photoSelection", () => {
  it("returns empty when no files are selected", () => {
    expect(getPhotoUploadSelection([])).toEqual({
      files: [],
      status: "empty",
    });
  });

  it("rejects non-image files", () => {
    expect(getPhotoUploadSelection([createFile("image/png", 100), createFile("text/plain", 100)])).toEqual({
      files: [],
      status: "invalid-type",
    });
  });

  it("rejects oversized image files", () => {
    expect(getPhotoUploadSelection([createFile("image/png", 5 * 1024 * 1024 + 1)])).toEqual({
      files: [],
      status: "oversized",
    });
  });

  it("keeps only the maximum upload count", () => {
    const files = Array.from({ length: 10 }, (_, index) => createFile("image/png", 100, `photo-${index}`));

    const result = getPhotoUploadSelection(files);

    expect(result.status).toBe("ready");
    expect(result.files).toHaveLength(8);
    expect(result.files.map((file) => file.name)).toEqual([
      "photo-0",
      "photo-1",
      "photo-2",
      "photo-3",
      "photo-4",
      "photo-5",
      "photo-6",
      "photo-7",
    ]);
  });
});
