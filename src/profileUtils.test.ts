import { describe, expect, it } from "vitest";
import { getMemberDisplayName, memberProfiles } from "./profileUtils";

describe("profile utilities", () => {
  it("defines the supported couple members in display order", () => {
    expect(memberProfiles).toEqual([
      { key: "jungseo", label: "정서", caption: "jungseo" },
      { key: "minhyeok", label: "민혁", caption: "minhyeok" },
    ]);
  });

  it("returns display names and falls back to 상대", () => {
    expect(getMemberDisplayName("jungseo")).toBe("정서");
    expect(getMemberDisplayName("minhyeok")).toBe("민혁");
    expect(getMemberDisplayName(null)).toBe("상대");
  });
});
