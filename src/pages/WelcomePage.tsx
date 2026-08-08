import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";

export function WelcomePage() {
  const navigate = useNavigate();
  const { authorizeGoogleDrive, enterOfflineMode, loadFromDrive, state } = useAppContext();
  const [busyMessage, setBusyMessage] = useState("");

  async function handleDriveStart() {
    setBusyMessage("Google Drive に接続しています...");
    try {
      await authorizeGoogleDrive();
      try {
        await loadFromDrive();
      } catch {
        // First-time users may not have a Drive snapshot yet.
      }
      navigate("/");
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : "ログインに失敗しました。");
    }
  }

  function handleOfflineStart() {
    enterOfflineMode();
    navigate("/");
  }

  const statusLabel =
    state.settings.startupMode === "drive" && !state.sync.isAuthorized
      ? "再ログインが必要"
      : state.sync.isAuthorized
        ? "接続済み"
        : "未接続";

  return (
    <section className="page welcome-page">
      <div className="welcome-shell panel">
        <div className="welcome-copy">
          <h2>再ログイン</h2>
          <p>Google Drive と接続するか、この起動中だけオフラインで使うかを選べます。</p>
        </div>

        <div className="welcome-options">
          <button type="button" className="welcome-option welcome-option--primary" onClick={handleDriveStart}>
            <span className="welcome-option__icon-wrap">
              <AppIcon name="drive" className="welcome-option__icon" />
            </span>
            <strong>Google Drive とつなぐ</strong>
            <span>自動同期を再開</span>
          </button>

          <button type="button" className="welcome-option" onClick={handleOfflineStart}>
            <span className="welcome-option__icon-wrap">
              <AppIcon name="offline" className="welcome-option__icon" />
            </span>
            <strong>オフラインで使う</strong>
            <span>この起動中だけ使う</span>
          </button>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta__item">
            <span>接続状態</span>
            <strong>{statusLabel}</strong>
          </div>
          <div className="welcome-meta__item">
            <span>通信状態</span>
            <strong>{state.sync.mode === "offline" ? "オフライン" : "オンライン"}</strong>
          </div>
        </div>

        {busyMessage ? <p className="welcome-message">{busyMessage}</p> : null}
      </div>
    </section>
  );
}
