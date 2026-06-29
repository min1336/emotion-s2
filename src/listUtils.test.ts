import { describe, expect, it } from "vitest";
import { sortEvents, sortTodos } from "./listUtils";

describe("list utilities", () => {
  it("sorts events by date and puts untimed events last on the same day", () => {
    const events = [
      { id: "late", date: "2026-06-02", time: "20:00" },
      { id: "untimed", date: "2026-06-01" },
      { id: "early", date: "2026-06-01", time: "09:00" },
    ];

    expect(sortEvents(events).map((event) => event.id)).toEqual(["early", "untimed", "late"]);
  });

  it("sorts open todos before completed todos, then by creation time", () => {
    const todos = [
      { id: "done", completed: true, createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "new-open", completed: false, createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "old-open", completed: false, createdAt: "2026-05-31T00:00:00.000Z" },
    ];

    expect(sortTodos(todos).map((todo) => todo.id)).toEqual(["old-open", "new-open", "done"]);
  });

  it("does not mutate the original arrays", () => {
    const events = [{ id: "b", date: "2026-06-02" }, { id: "a", date: "2026-06-01" }];
    const sorted = sortEvents(events);

    expect(sorted).not.toBe(events);
    expect(events.map((event) => event.id)).toEqual(["b", "a"]);
  });
});
