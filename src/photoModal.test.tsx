import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoModal } from "./photoModal";

describe("PhotoModal", () => {
  const defaultProps = {
    activeIndex: 0,
    addPhotos: () => undefined,
    closePhotoModal: () => undefined,
    deletePhoto: () => undefined,
    events: [
      {
        id: "event-1",
        title: "저녁 데이트",
        date: "2026-06-01",
        time: "19:00",
        memo: "사진 찍고 바로 이동",
      },
    ],
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

  it("renders selected date events below the photo", () => {
    const html = renderToStaticMarkup(<PhotoModal {...defaultProps} />);
    const photoSlideStart = html.indexOf('class="photo-slide"');
    const eventPanelStart = html.indexOf('class="photo-modal-events"');

    expect(eventPanelStart).toBeGreaterThan(photoSlideStart);
    expect(html).toContain("일정");
    expect(html).toContain("저녁 데이트");
    expect(html).toContain("19:00");
    expect(html).toContain("사진 찍고 바로 이동");
  });

  it("renders nothing when no photo is active", () => {
    const html = renderToStaticMarkup(<PhotoModal {...defaultProps} activeIndex={null} />);

    expect(html).toBe("");
  });
});
