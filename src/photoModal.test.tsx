import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoModal } from "./photoModal";

describe("PhotoModal", () => {
  const defaultProps = {
    activeIndex: 0,
    addPhotos: () => undefined,
    closePhotoModal: () => undefined,
    deletePhoto: () => undefined,
    isUploadingPhoto: false,
    movePhotoSlide: () => undefined,
    photos: [
      {
        id: "photo-1",
        date: "2026-06-01",
        storagePath: "photos/photo-1.jpg",
        url: "https://example.com/photo.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        displayUrl: "https://example.com/display.jpg",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    selectedDate: "2026-06-01",
  };

  it("renders the active photo and slide count", () => {
    const html = renderToStaticMarkup(<PhotoModal {...defaultProps} />);

    expect(html).toContain("2026년 6월 1일");
    expect(html).toContain("https://example.com/display.jpg");
    expect(html).toContain("6월 1일 사진 1");
    expect(html).toContain("1 / 1");
  });

  it("renders nothing when no photo is active", () => {
    const html = renderToStaticMarkup(<PhotoModal {...defaultProps} activeIndex={null} />);

    expect(html).toBe("");
  });
});
