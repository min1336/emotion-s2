export const INVITE_COPIED_MESSAGE = "초대 링크를 복사했어요.";
export const INVITE_MANUAL_COPY_MESSAGE = "자동 복사가 막혔어요. 선택된 초대 링크를 길게 눌러 복사해 주세요.";
export const INVITE_SHARED_MESSAGE = "공유 화면을 열었어요.";

type InviteActionResult =
  | { message: null; status: "skipped" }
  | { message: string; status: "copied" | "manual-copy" | "shared" };

type CopyInviteLinkInput = {
  copyTextWithFallback: (text: string) => boolean;
  inviteLink: string;
  selectInviteLink: (textLength: number) => void;
  writeClipboardText?: (text: string) => Promise<void>;
};

type ShareInviteLinkInput = {
  copyInviteLink: () => Promise<InviteActionResult>;
  inviteLink: string;
  share?: (shareData: ShareData) => Promise<void>;
};

export async function copyInviteLinkWithFallback({
  copyTextWithFallback,
  inviteLink,
  selectInviteLink,
  writeClipboardText,
}: CopyInviteLinkInput): Promise<InviteActionResult> {
  if (!inviteLink) {
    return { message: null, status: "skipped" };
  }

  if (copyTextWithFallback(inviteLink)) {
    return { message: INVITE_COPIED_MESSAGE, status: "copied" };
  }

  if (writeClipboardText) {
    try {
      await writeClipboardText(inviteLink);
      return { message: INVITE_COPIED_MESSAGE, status: "copied" };
    } catch {
      // Fall through to the visible selected link.
    }
  }

  selectInviteLink(inviteLink.length);
  return { message: INVITE_MANUAL_COPY_MESSAGE, status: "manual-copy" };
}

export async function shareInviteLinkWithFallback({
  copyInviteLink,
  inviteLink,
  share,
}: ShareInviteLinkInput): Promise<InviteActionResult> {
  if (!inviteLink) {
    return { message: null, status: "skipped" };
  }

  if (share) {
    try {
      await share({
        title: "정서 S2 민혁 초대",
        text: "우리 커플 공간에 들어와요.",
        url: inviteLink,
      });
      return { message: INVITE_SHARED_MESSAGE, status: "shared" };
    } catch {
      // User can cancel the share sheet, so copy remains the fallback.
    }
  }

  return copyInviteLink();
}
