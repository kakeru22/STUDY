import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import type { SyncState } from "../types/sync";

type StatusBannerProps = {
  state: SyncState;
};

export function StatusBanner({ state }: StatusBannerProps) {
  const navigate = useNavigate();
  const { authorizeGoogleDrive, loadFromDrive, syncToDrive } = useAppContext();
  const [dismissed, setDismissed] = useState(false);

  if (state.mode === "online" && state.unsyncedCount === 0 && !state.statusMessage) {
    return null;
  }

  const label =
    state.mode === "conflict"
      ? "競合を検知しました"
      : state.mode === "syncing"
        ? "同期中です"
        : state.mode === "offline"
          ? "オフラインモードで起動中"
          : "未同期の変更があります";

  const statusKey = useMemo(
    () => [state.mode, state.unsyncedCount, state.lastSyncedAt, state.statusMessage].join("|"),
    [state.lastSyncedAt, state.mode, state.statusMessage, state.unsyncedCount]
  );

  useEffect(() => {
    setDismissed(false);
  }, [statusKey]);

  if (dismissed) {
    return null;
  }

  return (
    <section className={`status-toast status-toast--${state.mode}`} role="status" aria-live="polite">
      <div className="status-toast__body">
        <div className="status-toast__copy">
          <strong>{label}</strong>
          <p>
            {state.mode === "syncing"
              ? state.statusMessage
              : `未同期 ${state.unsyncedCount}件${state.lastSyncedAt ? ` ・ 最終 ${new Date(state.lastSyncedAt).toLocaleString("ja-JP")}` : ""}`}
          </p>
        </div>
        <button type="button" className="status-toast__close" onClick={() => setDismissed(true)} aria-label="通知を閉じる">
          ×
        </button>
      </div>
      <div className="status-toast__actions">
        <button
          type="button"
          className="status-toast__action"
          onClick={async () => {
            try {
              if (!state.isAuthorized) {
                await authorizeGoogleDrive();
              } else {
                await loadFromDrive();
              }
              navigate("/settings");
            } catch {
              navigate("/settings");
            }
          }}
        >
          オンラインに戻る
        </button>
        <button
          type="button"
          className="button-secondary status-toast__action"
          onClick={async () => {
            try {
              if (!state.isAuthorized) {
                await authorizeGoogleDrive();
              }
              await syncToDrive();
              navigate("/settings");
            } catch {
              navigate("/settings");
            }
          }}
        >
          今すぐ同期
        </button>
      </div>
    </section>
  );
}
