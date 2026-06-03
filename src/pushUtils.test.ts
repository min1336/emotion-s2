import { describe, expect, it } from "vitest";
import {
  bufferSourceToUint8Array,
  getPushDeliveryStatusMessage,
  uint8ArrayToUrlBase64,
  urlBase64ToUint8Array,
} from "./pushUtils";

describe("push utilities", () => {
  it("round trips VAPID url-safe base64 keys", () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 251, 252]);
    const encoded = uint8ArrayToUrlBase64(bytes);

    expect(encoded).toBe("AQID-vv8");
    expect(Array.from(urlBase64ToUint8Array(encoded))).toEqual(Array.from(bytes));
  });

  it("converts typed array views without copying unrelated bytes", () => {
    const source = new Uint8Array([9, 1, 2, 3, 9]);
    const view = source.subarray(1, 4);

    expect(Array.from(bufferSourceToUint8Array(view))).toEqual([1, 2, 3]);
  });

  it("summarizes push delivery outcomes for users", () => {
    expect(getPushDeliveryStatusMessage("보냈어요.", { sent: 1 })).toContain("핸드폰 알림도 보냈어요");
    expect(getPushDeliveryStatusMessage("보냈어요.", { attempted: 0 })).toContain("상대방이 알림을 켜면");
    expect(getPushDeliveryStatusMessage("보냈어요.", { attempted: 1, failed: 1 })).toContain("전송에 실패");
    expect(getPushDeliveryStatusMessage("보냈어요.")).toContain("상대방이 알림을 켜면");
  });
});
