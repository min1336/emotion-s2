import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarMemoryDemo, isCalendarDemoMode } from "./calendarDemo";

describe("calendar demo", () => {
  it("detects the calendar demo query param", () => {
    expect(isCalendarDemoMode("?demo=calendar")).toBe(true);
    expect(isCalendarDemoMode("?tab=calendar")).toBe(false);
    expect(isCalendarDemoMode("")).toBe(false);
  });

  it("renders the memory calendar without a couple session", () => {
    const html = renderToStaticMarkup(<CalendarMemoryDemo />);

    expect(html).toContain("캘린더 디자인 미리보기");
    expect(html).toContain("calendar-memory-screen");
    expect(html).toContain("calendar-memory-card");
    expect(html).toContain("selected-day-memory-panel");
    expect(html).toContain("사진 산책");
  });
});
