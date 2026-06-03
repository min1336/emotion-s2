import { describe, expect, it } from "vitest";
import {
  doesEventOccurOnDate,
  doesEventOverlapRange,
  formatDateRangeLabel,
  getDateKeysInRange,
  getMonthGrid,
  getRelationshipElapsed,
  normalizeDateRange,
} from "./dateUtils";

describe("date utilities", () => {
  it("normalizes a dragged date range into chronological order", () => {
    expect(normalizeDateRange("2026-06-03", "2026-06-01")).toEqual({
      start: "2026-06-01",
      end: "2026-06-03",
    });
  });

  it("expands an inclusive date range into date keys", () => {
    expect(getDateKeysInRange("2026-06-01", "2026-06-03")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("detects multi-day event occurrence and overlap", () => {
    const event = { date: "2026-06-02", endDate: "2026-06-04" };

    expect(doesEventOccurOnDate(event, "2026-06-03")).toBe(true);
    expect(doesEventOverlapRange(event, "2026-06-01", "2026-06-02")).toBe(true);
    expect(doesEventOverlapRange(event, "2026-06-05", "2026-06-07")).toBe(false);
  });

  it("builds a six-week month grid starting on Sunday", () => {
    const grid = getMonthGrid(new Date(2026, 5, 1));

    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ key: "2026-05-31", day: 31, isCurrentMonth: false });
    expect(grid[1]).toEqual({ key: "2026-06-01", day: 1, isCurrentMonth: true });
  });

  it("formats a selected range using Korean date labels", () => {
    expect(formatDateRangeLabel({ start: "2026-06-01", end: "2026-06-03" })).toBe(
      "2026년 6월 1일 월요일 - 2026년 6월 3일 수요일",
    );
  });

  it("counts relationship days using Korea date boundaries", () => {
    const noonInKorea = new Date("2025-05-28T03:00:00.000Z").getTime();

    expect(getRelationshipElapsed(noonInKorea).days).toBe(1);
  });
});
