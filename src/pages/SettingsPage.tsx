import { useRef, useState, type ChangeEvent } from "react";
import { GoogleClientIdHelpModal } from "../components/GoogleClientIdHelpModal";
import { useAppContext } from "../contexts/AppContext";
import type { PersistedState } from "../types/app";

export function SettingsPage() {
  const { state, authorizeGoogleDrive, exportSnapshot, importSnapshot, loadFromDrive, signOutDrive, syncToDrive, updateSettings } =
    useAppContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  function downloadBackup() {
    const snapshot = exportSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `study-review-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBusyMessage("バックアップを書き出しました。");
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    importSnapshot(JSON.parse(text) as PersistedState);
    setBusyMessage("バックアップを読み込みました。");
  }

  return (
    <section className="page">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Sync & Settings</p>
          <h2>同期 / 設定</h2>
        </div>
        <div className="page-heading__meta">
          <span>Sync</span>
          <strong>{state.sync.mode}</strong>
        </div>
      </div>

      <div className="page-shell">
        <div className="panel settings-list settings-shell">
          <div className="field">
            <p className="section-title">Google Drive</p>
            <label className="field">
              <span className="field-label-with-action">
                <span>Google OAuth Client ID</span>
                <button type="button" className="help-trigger" onClick={() => setIsHelpOpen(true)} aria-label="設定方法を開く">
                  ?
                </button>
              </span>
              <input
                type="text"
                value={state.settings.googleClientId}
                onChange={(event) => updateSettings({ googleClientId: event.target.value })}
                placeholder="Netlify 用に発行した Web client ID"
              />
            </label>
          </div>

          <div className="field">
            <p className="section-title">Drive フォルダ名</p>
            <input
              type="text"
              value={state.settings.driveFolderName}
              onChange={(event) => updateSettings({ driveFolderName: event.target.value })}
            />
          </div>

          <div className="settings-status">
            <p className="section-title">同期状態</p>
            <div className="mini-stat-grid">
              <div className="mini-stat">
                <span>状態</span>
                <strong>{state.sync.mode}</strong>
              </div>
              <div className="mini-stat">
                <span>未同期</span>
                <strong>{state.sync.unsyncedCount}</strong>
              </div>
              <div className="mini-stat mini-stat--wide">
                <span>最終同期</span>
                <strong>{state.sync.lastSyncedAt ? new Date(state.sync.lastSyncedAt).toLocaleString("ja-JP") : "未同期"}</strong>
              </div>
            </div>
            <p className="settings-status__message">{busyMessage || state.sync.statusMessage}</p>
          </div>

          <div className="action-stack">
            <button
              type="button"
              onClick={async () => {
                setBusyMessage("Google に接続中...");
                try {
                  await authorizeGoogleDrive();
                  setBusyMessage("Google Drive を認証しました。");
                } catch (error) {
                  setBusyMessage(error instanceof Error ? error.message : "Google 認証に失敗しました。");
                }
              }}
            >
              Google に接続
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                setBusyMessage("Drive に同期中...");
                try {
                  await syncToDrive();
                  setBusyMessage("Drive に同期しました。");
                } catch (error) {
                  setBusyMessage(error instanceof Error ? error.message : "Drive 同期に失敗しました。");
                }
              }}
            >
              今すぐ同期
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                setBusyMessage("Drive から読み込み中...");
                try {
                  await loadFromDrive();
                  setBusyMessage("Drive から読み込みました。");
                } catch (error) {
                  setBusyMessage(error instanceof Error ? error.message : "Drive 読み込みに失敗しました。");
                }
              }}
            >
              Drive から読み込む
            </button>

            <button type="button" className="button-secondary" onClick={downloadBackup}>
              バックアップを書き出す
            </button>

            <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}>
              バックアップを読み込む
            </button>

            <button type="button" className="button-secondary" onClick={signOutDrive}>
              Drive 連携を解除
            </button>

            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileImport} />
          </div>
        </div>
      </div>

      <GoogleClientIdHelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </section>
  );
}
