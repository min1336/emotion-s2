import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScheduleModal } from "./scheduleModal";

describe("ScheduleModal", () => {
  const defaultProps = {
    eventMemo: "준비물 챙기기",
    eventTime: "09:30",
    eventTitle: "데이트",
    isOpen: true,
    onClose: () => undefined,
    onSubmit: () => undefined,
    range: { start: "2026-06-01", end: "2026-06-02" },
    setEventMemo: () => undefined,
    setEventTime: () => undefined,
    setEventTitle: () => undefined,
  };

  it("renders the selected range and form values when open", () => {
    const html = renderToStaticMarkup(<ScheduleModal {...defaultProps} />);

    expect(html).toContain("일정 추가");
    expect(html).toContain("2026년 6월 1일");
    expect(html).toContain("2026년 6월 2일");
    expect(html).toContain("데이트");
    expect(html).toContain("09:30");
    expect(html).toContain("준비물 챙기기");
  });

  it("renders edit copy when editing an existing event", () => {
    const html = renderToStaticMarkup(<ScheduleModal {...defaultProps} mode="edit" />);

    expect(html).toContain("일정 편집");
    expect(html).toContain("일정 저장");
    expect(html).toContain('aria-label="일정 편집 닫기"');
  });

  it("renders a bottom wheel picker for hour and minute", () => {
    const html = renderToStaticMarkup(<ScheduleModal {...defaultProps} />);

    expect(html).toContain("시간 없음");
    expect(html).toContain("하단에서 시 / 분 선택");
    expect(html).toContain('class="time-wheel-sheet"');
    expect(html).toContain('aria-label="시 선택"');
    expect(html).toContain('aria-label="분 선택"');
    expect(html).toContain('aria-pressed="true" data-time-value="9">09시');
    expect(html).toContain('aria-pressed="true" data-time-value="30">30분');
    expect(html).not.toContain('type="range"');
    expect(html).not.toContain("시간 슬라이더");
    expect(html).not.toContain("빠른 선택");
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(<ScheduleModal {...defaultProps} isOpen={false} />);

    expect(html).toBe("");
  });
});
