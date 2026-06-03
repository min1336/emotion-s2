import { describe, expect, it } from "vitest";
import { isKeyboardInputElement } from "./appViewport";

describe("appViewport", () => {
  it("recognizes editable elements that can open the mobile keyboard", () => {
    expect(isKeyboardInputElement({ tagName: "INPUT", isContentEditable: false })).toBe(true);
    expect(isKeyboardInputElement({ tagName: "textarea", isContentEditable: false })).toBe(true);
    expect(isKeyboardInputElement({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isKeyboardInputElement({ tagName: "button", isContentEditable: false })).toBe(false);
    expect(isKeyboardInputElement(null)).toBe(false);
  });
});
