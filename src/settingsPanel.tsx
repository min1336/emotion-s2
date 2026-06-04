import { confirmWithWindow } from "./browserAdapters";

const LEAVE_COUPLE_CONFIRM_MESSAGE = "이 기기에서 커플 공간 입장 정보를 지울까요? 다시 들어가려면 초대 링크가 필요해요.";

type ConfirmLeaveCoupleActionInput = {
  confirmLeave?: (message: string) => boolean;
  leaveCouple: () => void;
};

export function confirmLeaveCoupleAction({
  confirmLeave = confirmWithWindow,
  leaveCouple,
}: ConfirmLeaveCoupleActionInput) {
  if (confirmLeave(LEAVE_COUPLE_CONFIRM_MESSAGE)) {
    leaveCouple();
  }
}

type SettingsPanelProps = {
  coupleCode: string;
  inviteLink: string;
  copyInviteLink: () => void;
  shareInviteLink: () => void;
  leaveCouple: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  coupleCode,
  inviteLink,
  copyInviteLink,
  shareInviteLink,
  leaveCouple,
  onClose,
}: SettingsPanelProps) {
  function confirmLeaveCouple() {
    confirmLeaveCoupleAction({ leaveCouple });
  }

  return (
    <section className="settings-screen app-content" aria-label="설정">
      <div className="settings-screen-header">
        <button type="button" className="icon-button settings-back-button" aria-label="설정 닫기" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>
        <div>
          <p className="section-label">설정</p>
          <h2>커플 공간</h2>
        </div>
      </div>

      <div className="settings-code-row">
        <span>커플 코드</span>
        <strong>{coupleCode}</strong>
      </div>

      <input
        className="invite-link settings-invite-link"
        value={inviteLink}
        readOnly
        aria-label="초대 링크"
        data-invite-link-input
        onFocus={(event) => event.currentTarget.select()}
      />

      <div className="settings-action-list">
        <button type="button" className="settings-action-button" onClick={copyInviteLink}>
          링크 복사
        </button>
        <button type="button" className="settings-action-button" onClick={shareInviteLink}>
          공유
        </button>
        <button
          type="button"
          className="settings-action-button danger"
          onClick={confirmLeaveCouple}
        >
          커플 공간 나가기
        </button>
      </div>
    </section>
  );
}
