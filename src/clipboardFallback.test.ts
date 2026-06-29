import { describe, expect, it } from "vitest";
import { copyTextWithTextarea } from "./clipboardFallback";

function createDocument(execCommand: () => boolean) {
  const calls: string[] = [];
  const textarea = {
    setSelectionRange(start: number, end: number) {
      calls.push(`setSelectionRange:${start}:${end}`);
    },
    focus() {
      calls.push("focus");
    },
    select() {
      calls.push("select");
    },
    setAttribute(name: string, value: string) {
      calls.push(`setAttribute:${name}:${value}`);
    },
    style: {} as Record<string, string>,
    value: "",
  } as unknown as HTMLTextAreaElement;
  const documentRef = {
    body: {
      appendChild(element: HTMLTextAreaElement) {
        calls.push(`append:${element.value}`);
      },
      removeChild(element: HTMLTextAreaElement) {
        calls.push(`remove:${element.value}`);
      },
    },
    createElement(tagName: string) {
      calls.push(`create:${tagName}`);
      return textarea;
    },
    execCommand(command: string) {
      calls.push(`exec:${command}`);
      return execCommand();
    },
  } as unknown as Document;

  return { calls, documentRef, textarea };
}

describe("clipboardFallback", () => {
  it("copies text with a temporary textarea", () => {
    const { calls, documentRef, textarea } = createDocument(() => true);

    expect(copyTextWithTextarea("invite-link", documentRef)).toBe(true);
    expect(textarea.value).toBe("invite-link");
    expect(textarea.style).toMatchObject({
      left: "-9999px",
      position: "fixed",
      top: "0",
    });
    expect(calls).toEqual([
      "create:textarea",
      "setAttribute:readonly:",
      "append:invite-link",
      "focus",
      "select",
      "setSelectionRange:0:11",
      "exec:copy",
      "remove:invite-link",
    ]);
  });

  it("returns false and still removes the textarea when copy throws", () => {
    const { calls, documentRef } = createDocument(() => {
      throw new Error("blocked");
    });

    expect(copyTextWithTextarea("invite-link", documentRef)).toBe(false);
    expect(calls[calls.length - 1]).toBe("remove:invite-link");
  });
});
