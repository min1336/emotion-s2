import { confirmWithWindow } from "./browserAdapters";
import { APP_THEME_COLOR_OPTIONS, getNextAppTheme, type AppTheme, type AppThemeColorField } from "./appTheme";

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
  appTheme: AppTheme;
  coupleCode: string;
  inviteLink: string;
  resetAppTheme: () => void;
  updateAppTheme: (theme: AppTheme) => void;
  copyInviteLink: () => void;
  shareInviteLink: () => void;
  leaveCouple: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  appTheme,
  coupleCode,
  inviteLink,
  resetAppTheme,
  updateAppTheme,
  copyInviteLink,
  shareInviteLink,
  leaveCouple,
  onClose,
}: SettingsPanelProps) {
  function confirmLeaveCouple() {
    confirmLeaveCoupleAction({ leaveCouple });
  }

  function updateThemeColor(field: AppThemeColorField, color: string) {
    updateAppTheme(getNextAppTheme(appTheme, field, color));
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

      <section className="settings-theme-card" aria-label="앱 테마">
        <div className="settings-theme-header">
          <div>
            <p className="section-label">앱 테마</p>
            <h3>색상</h3>
          </div>
          <button type="button" className="theme-reset-button" onClick={resetAppTheme}>
            기본값
          </button>
        </div>
        <div className="theme-chip-groups">
          <div className="theme-chip-group">
            <p>바탕색</p>
            <div className="theme-chip-list">
              {APP_THEME_COLOR_OPTIONS.backgroundColor.map((option) => (
                <button
                  type="button"
                  className={`theme-color-chip ${appTheme.backgroundColor === option.color ? "active" : ""}`}
                  aria-label={`바탕색 ${option.label}`}
                  aria-pressed={appTheme.backgroundColor === option.color}
                  key={option.color}
                  onClick={() => updateThemeColor("backgroundColor", option.color)}
                >
                  <span
                    className="theme-chip-swatch"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  <span className="theme-chip-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="theme-chip-group">
            <p>강조색</p>
            <div className="theme-chip-list">
              {APP_THEME_COLOR_OPTIONS.accentColor.map((option) => (
                <button
                  type="button"
                  className={`theme-color-chip ${appTheme.accentColor === option.color ? "active" : ""}`}
                  aria-label={`강조색 ${option.label}`}
                  aria-pressed={appTheme.accentColor === option.color}
                  key={option.color}
                  onClick={() => updateThemeColor("accentColor", option.color)}
                >
                  <span
                    className="theme-chip-swatch"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  <span className="theme-chip-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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
