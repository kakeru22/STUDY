import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleClientIdHelpModal } from "../components/GoogleClientIdHelpModal";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";

export function SetupPage() {
  const navigate = useNavigate();
  const { state, setStartupMode, updateSettings } = useAppContext();
  const [clientId, setClientId] = useState(state.settings.googleClientId);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  function handleContinue() {
    updateSettings({ googleClientId: clientId.trim() });
    navigate("/welcome");
  }

  function handleOfflineStart() {
    setStartupMode("offline");
    navigate("/");
  }

  return (
    <section className="page welcome-page">
      <div className="welcome-shell panel">
        <div className="welcome-copy">
          <h2>初期設定</h2>
        </div>

        <div className="setup-panel">
          <label className="field">
            <span className="field-label-with-action">
              <span>Google OAuth Client ID</span>
              <button type="button" className="help-trigger" onClick={() => setIsHelpOpen(true)} aria-label="設定方法を開く">
                ?
              </button>
            </span>
            <input
              type="text"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Netlify 用に発行した Web client ID"
            />
          </label>

          <div className="welcome-options">
            <button type="button" className="welcome-option welcome-option--primary" onClick={handleContinue} disabled={!clientId.trim()}>
              <span className="welcome-option__icon-wrap">
                <AppIcon name="drive" className="welcome-option__icon" />
              </span>
              <strong>保存して進む</strong>
              <span>Google 連携へ</span>
            </button>

            <button type="button" className="welcome-option" onClick={handleOfflineStart}>
              <span className="welcome-option__icon-wrap">
                <AppIcon name="offline" className="welcome-option__icon" />
              </span>
              <strong>オフラインで使う</strong>
              <span>あとで設定</span>
            </button>
          </div>
        </div>
      </div>

      <GoogleClientIdHelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </section>
  );
}
