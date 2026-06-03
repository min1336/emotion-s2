import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { confirmLeaveCoupleAction, SettingsPanel } from "./settingsPanel";

describe("SettingsPanel", () => {
  it("renders invite and profile details", () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        coupleCode="S2-ABCD-EF"
        inviteLink="https://example.com/?code=S2-ABCD-EF"
        copyInviteLink={() => undefined}
        shareInviteLink={() => undefined}
        currentMemberName="정서"
        changeMember={() => undefined}
        leaveCouple={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("초대와 프로필");
    expect(html).toContain("S2-ABCD-EF");
    expect(html).toContain("현재 정서 프로필");
    expect(html).toContain("https://example.com/?code=S2-ABCD-EF");
  });

  it("leaves the couple space only after confirmation", () => {
    const calls: string[] = [];

    confirmLeaveCoupleAction({
      confirmLeave: (message) => {
        calls.push(`confirm:${message}`);
        return true;
      },
      leaveCouple: () => {
        calls.push("leave");
      },
    });
    confirmLeaveCoupleAction({
      confirmLeave: () => false,
      leaveCouple: () => {
        calls.push("cancelled-leave");
      },
    });

    expect(calls).toEqual([
      "confirm:이 기기에서 커플 공간 입장 정보를 지울까요? 다시 들어가려면 초대 링크가 필요해요.",
      "leave",
    ]);
  });
});
