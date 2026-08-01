import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import type { SyncState } from "../types/sync";

type StatusBannerProps = {
  state: SyncState;
};

export function StatusBanner({ state }: StatusBannerProps) {
  const navigate = useNavigate();
  const { authorizeGoogleDrive, loadFromDrive, syncToDrive } = useAppContext();

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

  return (
    <section className="status-banner">
      <div>
        <strong>{label}</strong>
        <p>未同期の変更: {state.unsyncedCount}件</p>
        <p>最終同期: {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleString("ja-JP") : "未同期"}</p>
        <p>{state.statusMessage}</p>
      </div>
      <div className="status-banner__actions">
        <button
          type="button"
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
          className="button-secondary"
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
