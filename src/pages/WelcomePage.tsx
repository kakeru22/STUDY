import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";

export function WelcomePage() {
  const navigate = useNavigate();
  const { authorizeGoogleDrive, loadFromDrive, setStartupMode, state } = useAppContext();
  const [busyMessage, setBusyMessage] = useState("");

  async function handleDriveStart() {
    setBusyMessage("接続中...");
    try {
      await authorizeGoogleDrive();
      try {
        await loadFromDrive();
      } catch {
        // First-time users may not have a Drive snapshot yet.
      }
      navigate("/");
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : "接続に失敗しました。");
    }
  }

  function handleOfflineStart() {
    setStartupMode("offline");
    navigate("/");
  }

  return (
    <section className="page welcome-page">
      <div className="welcome-shell panel">
        <div className="welcome-copy">
          <h2>Start</h2>
        </div>

        <div className="welcome-options">
          <button type="button" className="welcome-option welcome-option--primary" onClick={handleDriveStart}>
            <span className="welcome-option__icon-wrap">
              <AppIcon name="drive" className="welcome-option__icon" />
            </span>
            <strong>Google</strong>
            <span>Drive Sync</span>
          </button>

          <button type="button" className="welcome-option" onClick={handleOfflineStart}>
            <span className="welcome-option__icon-wrap">
              <AppIcon name="offline" className="welcome-option__icon" />
            </span>
            <strong>Offline</strong>
            <span>Local Only</span>
          </button>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta__item">
            <span>Sync</span>
            <strong>{state.sync.isAuthorized ? "Ready" : "Locked"}</strong>
          </div>
          <div className="welcome-meta__item">
            <span>Mode</span>
            <strong>{state.sync.mode}</strong>
          </div>
        </div>

        {busyMessage ? <p className="welcome-message">{busyMessage}</p> : null}
      </div>
    </section>
  );
}
