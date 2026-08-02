import type { SyncState } from "../types/sync";

type SyncBadgeProps = {
  state: SyncState;
};

export function SyncBadge({ state }: SyncBadgeProps) {
  const labels = {
    offline: "オフライン",
    online: state.isAuthorized ? "同期中" : "未接続",
    syncing: "同期中",
    conflict: "要確認"
  };

  return <span className={`sync-badge sync-badge--${state.mode}`}>{labels[state.mode]}</span>;
}
