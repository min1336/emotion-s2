import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUS_TOAST_DURATION_MS, StatusToast } from "./statusToast";

describe("StatusToast", () => {
  it("renders status feedback as a toast", () => {
    const html = renderToStaticMarkup(<StatusToast message="링크를 복사했어요." />);

    expect(html).toContain("status-toast");
    expect(html).toContain('role="status"');
    expect(html).toContain("링크를 복사했어요.");
    expect(html).not.toContain("status-message");
  });

  it("uses a two second display duration", () => {
    expect(STATUS_TOAST_DURATION_MS).toBe(2000);
  });

  it("renders nothing without a message", () => {
    expect(renderToStaticMarkup(<StatusToast message="" />)).toBe("");
  });
});
