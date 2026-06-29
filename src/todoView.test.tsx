import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TodoView } from "./todoView";

describe("TodoView", () => {
  it("renders todo metrics and sections", () => {
    const html = renderToStaticMarkup(
      <TodoView
        openTodos={[{ id: "open-1", title: "예약하기", completed: false }]}
        completedTodos={[
          { id: "done-1", title: "완료한 일", completed: true },
        ]}
        todoTitle=""
        setTodoTitle={() => undefined}
        addTodo={() => undefined}
        toggleTodo={() => undefined}
        deleteTodo={() => undefined}
      />,
    );

    expect(html).toContain("남은 일");
    expect(html).toContain("완료한 일");
    expect(html).toContain("완료율");
    expect(html).toContain("50%");
    expect(html).toContain("예약하기");
  });
});
