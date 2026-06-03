import { describe, expect, it } from "vitest";
import type { CoupleEvent, CouplePhoto, CoupleTodo } from "./domainTypes";
import {
  getEventsForDate,
  getEventsOverlappingRange,
  groupPhotosByDate,
  splitTodosByCompletion,
} from "./viewData";

describe("viewData", () => {
  it("groups photos by date and sorts each day oldest first", () => {
    const photos = [
      { id: "later", date: "2026-05-26", createdAt: "2026-05-26T09:00:00.000Z" },
      { id: "earlier", date: "2026-05-26", createdAt: "2026-05-26T08:00:00.000Z" },
      { id: "other", date: "2026-05-27", createdAt: "2026-05-27T08:00:00.000Z" },
    ] as CouplePhoto[];

    const groupedPhotos = groupPhotosByDate(photos);

    expect(groupedPhotos.get("2026-05-26")?.map((photo) => photo.id)).toEqual(["earlier", "later"]);
    expect(groupedPhotos.get("2026-05-27")?.map((photo) => photo.id)).toEqual(["other"]);
  });

  it("filters events by day and by overlapping range", () => {
    const events = [
      { id: "single", date: "2026-05-26" },
      { id: "range", date: "2026-05-24", endDate: "2026-05-28" },
      { id: "outside", date: "2026-06-01" },
    ] as CoupleEvent[];

    expect(getEventsForDate(events, "2026-05-26").map((event) => event.id)).toEqual(["single", "range"]);
    expect(
      getEventsOverlappingRange(events, {
        start: "2026-05-25",
        end: "2026-05-27",
      }).map((event) => event.id),
    ).toEqual(["single", "range"]);
  });

  it("splits todos into open and completed lists", () => {
    const todos = [
      { id: "open", completed: false },
      { id: "done", completed: true },
    ] as CoupleTodo[];

    expect(splitTodosByCompletion(todos)).toEqual({
      completedTodos: [{ id: "done", completed: true }],
      openTodos: [{ id: "open", completed: false }],
    });
  });
});
