import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeView } from "./homeView";

describe("HomeView", () => {
  it("renders relationship counters and home sections", () => {
    const html = renderToStaticMarkup(
      <HomeView
        relationshipElapsed={{ days: 371, hours: 8_888 }}
        todayEvents={[]}
        weekEvents={[]}
        openTodos={[]}
        setActiveTab={() => undefined}
      />,
    );

    expect(html).toContain("D+371");
    expect(html).toContain("8,888시간");
    expect(html).toContain("오늘의 약속");
    expect(html).toContain("이번 주 일정");
    expect(html).toContain("같이 할 일");
  });
});
