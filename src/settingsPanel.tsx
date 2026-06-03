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
  currentMemberName: string;
  changeMember: () => void;
  leaveCouple: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  coupleCode,
  inviteLink,
  copyInviteLink,
  shareInviteLink,
  currentMemberName,
  changeMember,
  leaveCouple,
  onClose,
}: SettingsPanelProps) {
  function confirmLeaveCouple() {
    confirmLeaveCoupleAction({ leaveCouple });
  }

  return (
    <section className="settings-panel app-content" aria-label="설정">
      <div className="content-card invite-card">
        <div className="settings-panel-header">
          <div>
            <p className="section-label">설정</p>
            <h3>초대와 프로필</h3>
          </div>
          <button type="button" className="icon-button" aria-label="설정 닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div>
          <p className="section-label">초대하기</p>
          <h3>상대방에게 이 링크를 보내요</h3>
          <p>현재 {currentMemberName} 프로필이에요. 링크에는 커플 비밀키가 함께 들어갑니다.</p>
        </div>
        <div className="invite-actions">
          <span className="code-chip">{coupleCode}</span>
          <div className="invite-buttons">
            <button type="button" className="text-button" onClick={copyInviteLink}>
              링크 복사
            </button>
            <button type="button" className="text-button" onClick={shareInviteLink}>
              공유
            </button>
          </div>
          <button type="button" className="text-button profile-change-button" onClick={changeMember}>
            프로필 변경
          </button>
          <button type="button" className="text-button profile-change-button" onClick={confirmLeaveCouple}>
            커플 공간 나가기
          </button>
        </div>
        <input
          className="invite-link"
          value={inviteLink}
          readOnly
          aria-label="초대 링크"
          data-invite-link-input
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
    </section>
  );
}
