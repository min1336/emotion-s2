import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarView } from "./calendarView";

describe("CalendarView", () => {
  const event = {
    id: "event-1",
    title: "데이트",
    date: "2026-06-01",
    endDate: "2026-06-02",
    time: "09:30",
    memo: "메모",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const photo = {
    id: "photo-1",
    date: "2026-06-01",
    storagePath: "photos/photo-1.jpg",
    url: "https://example.com/photo.jpg",
    thumbnailUrl: "https://example.com/thumb.jpg",
    displayUrl: "https://example.com/display.jpg",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const defaultProps = {
    cancelScheduleRange: () => undefined,
    completeScheduleRange: () => undefined,
    deleteEvent: () => undefined,
    events: [event],
    monthDays: [
      { key: "2026-06-01", day: 1, isCurrentMonth: true },
      { key: "2026-06-02", day: 2, isCurrentMonth: true },
    ],
    moveMonth: () => undefined,
    openDatePhotosModal: () => undefined,
    photosByDate: new Map([["2026-06-01", [photo]]]),
    previewScheduleRange: () => undefined,
    scheduleRange: { start: "2026-06-01", end: "2026-06-02" },
    selectedDate: "2026-06-01",
    selectedDateEvents: [event],
    startScheduleRange: () => undefined,
    visibleMonth: new Date(2026, 5, 1),
  };

  it("renders calendar days, photos, selected range, and selected date events", () => {
    const html = renderToStaticMarkup(<CalendarView {...defaultProps} />);

    expect(html).toContain("2026년 6월");
    expect(html).toContain("range-selected");
    expect(html).toContain("has-event");
    expect(html).toContain("has-photo");
    expect(html).toContain("https://example.com/thumb.jpg");
    expect(html).toContain("기간 선택 중");
    expect(html).toContain("데이트");
    expect(html).toContain("09:30");
    expect(html).toContain("2026년 6월 1일 월요일");
  });
});
