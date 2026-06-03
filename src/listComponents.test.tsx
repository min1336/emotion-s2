import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventList, TabButton, TodoList } from "./listComponents";

describe("list components", () => {
  it("renders event empty state", () => {
    expect(renderToStaticMarkup(<EventList events={[]} emptyText="비어 있음" />)).toContain("비어 있음");
  });

  it("renders event date, time, title, and memo", () => {
    const html = renderToStaticMarkup(
      <EventList
        events={[
          {
            id: "event-1",
            title: "데이트",
            date: "2026-06-01",
            time: "09:30",
            memo: "메모",
          },
        ]}
        emptyText="비어 있음"
      />,
    );

    expect(html).toContain("6월 1일");
    expect(html).toContain("09:30");
    expect(html).toContain("데이트");
    expect(html).toContain("메모");
  });

  it("renders todo status and active tab class", () => {
    const todoHtml = renderToStaticMarkup(
      <TodoList
        todos={[{ id: "todo-1", title: "예약하기", completed: true }]}
        emptyText="비어 있음"
      />,
    );
    const tabHtml = renderToStaticMarkup(<TabButton active label="홈" onClick={() => undefined} />);

    expect(todoHtml).toContain("예약하기");
    expect(todoHtml).toContain("완료");
    expect(tabHtml).toContain('class="active"');
  });
});
