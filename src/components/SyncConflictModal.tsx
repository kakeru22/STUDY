import type { PersistedState } from "../types/app";

type SyncConflictModalProps = {
  conflict: {
    localState: PersistedState;
    remoteState: PersistedState;
    remoteModifiedAt: string | null;
  } | null;
  onChooseLocal: () => void;
  onChooseCloud: () => void;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "不明";
  }

  return new Date(value).toLocaleString("ja-JP");
}

export function SyncConflictModal({ conflict, onChooseLocal, onChooseCloud }: SyncConflictModalProps) {
  if (!conflict) {
    return null;
  }

  const localCount = conflict.localState.questions.length;
  const remoteCount = conflict.remoteState.questions.length;

  return (
    <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="sync-conflict-title">
      <div className="help-modal__backdrop" />
      <div className="help-modal__panel sync-conflict-modal">
        <div className="help-modal__header">
          <div>
            <p className="section-title">Sync Conflict</p>
            <h3 id="sync-conflict-title">同期の基準を選択</h3>
          </div>
        </div>

        <div className="help-modal__content">
          <p className="sync-conflict-modal__lead">
            ローカルデータとクラウドデータに差異があります。どちらの内容に合わせるか選んでください。
          </p>

          <div className="sync-conflict-modal__grid">
            <button type="button" className="sync-conflict-modal__choice" onClick={onChooseLocal}>
              <span className="sync-conflict-modal__eyebrow">ローカル基準</span>
              <strong>この端末の内容で統一</strong>
              <span>{localCount} 問をクラウド側にも反映します。</span>
            </button>

            <button type="button" className="sync-conflict-modal__choice sync-conflict-modal__choice--primary" onClick={onChooseCloud}>
              <span className="sync-conflict-modal__eyebrow">クラウド基準</span>
              <strong>クラウドの内容で統一</strong>
              <span>{remoteCount} 問をこの端末にも反映します。</span>
            </button>
          </div>

          <div className="sync-conflict-modal__meta">
            <div className="welcome-meta__item">
              <span>クラウド最終更新</span>
              <strong>{formatTimestamp(conflict.remoteModifiedAt)}</strong>
            </div>
            <div className="welcome-meta__item">
              <span>この端末の最終同期</span>
              <strong>{formatTimestamp(conflict.localState.sync.lastSyncedAt)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
