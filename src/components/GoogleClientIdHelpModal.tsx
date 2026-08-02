type GoogleClientIdHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function GoogleClientIdHelpModal({ open, onClose }: GoogleClientIdHelpModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="client-id-help-title">
      <div className="help-modal__backdrop" onClick={onClose} />
      <div className="help-modal__panel">
        <div className="help-modal__header">
          <div>
            <p className="section-title">Google Cloud</p>
            <h3 id="client-id-help-title">Client ID の設定方法</h3>
          </div>
          <button type="button" className="help-modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="help-modal__content">
          <div className="help-figure" aria-hidden="true">
            <svg viewBox="0 0 520 240" className="help-figure__svg">
              <rect x="20" y="30" width="140" height="160" rx="24" className="help-figure__card" />
              <rect x="190" y="30" width="140" height="160" rx="24" className="help-figure__card" />
              <rect x="360" y="30" width="140" height="160" rx="24" className="help-figure__card" />
              <path d="M160 110h30" className="help-figure__line" />
              <path d="M330 110h30" className="help-figure__line" />
              <circle cx="90" cy="74" r="18" className="help-figure__dot" />
              <circle cx="260" cy="74" r="18" className="help-figure__dot" />
              <circle cx="430" cy="74" r="18" className="help-figure__dot" />
              <text x="90" y="80" textAnchor="middle" className="help-figure__num">
                1
              </text>
              <text x="260" y="80" textAnchor="middle" className="help-figure__num">
                2
              </text>
              <text x="430" y="80" textAnchor="middle" className="help-figure__num">
                3
              </text>
              <text x="90" y="120" textAnchor="middle" className="help-figure__label">
                API を有効化
              </text>
              <text x="90" y="148" textAnchor="middle" className="help-figure__sub">
                Google Drive API
              </text>
              <text x="260" y="120" textAnchor="middle" className="help-figure__label">
                同意画面を作成
              </text>
              <text x="260" y="148" textAnchor="middle" className="help-figure__sub">
                テストユーザー追加
              </text>
              <text x="430" y="120" textAnchor="middle" className="help-figure__label">
                Web Client を作成
              </text>
              <text x="430" y="148" textAnchor="middle" className="help-figure__sub">
                Client ID をコピー
              </text>
            </svg>
          </div>

          <ol className="help-steps">
            <li>Google Cloud Console で新しいプロジェクトを作成</li>
            <li>「Google Drive API」を有効化</li>
            <li>「OAuth 同意画面」を作成し、自分の Google アカウントをテストユーザーに追加</li>
            <li>「認証情報」から「OAuth クライアント ID」を新規作成し、種類は「ウェブアプリ」を選択</li>
            <li>発行された Client ID をこのアプリに貼り付ける</li>
          </ol>

          <div className="help-note">
            <strong>このアプリで入力する URL</strong>
            <ul className="plain-list">
              <li>承認済みの JavaScript 生成元: `https://archistudy.netlify.app`</li>
              <li>認証方式はポップアップなので、通常はリダイレクト URI は不要</li>
            </ul>
          </div>

          <div className="help-note">
            <strong>つまずきやすい点</strong>
            <ul className="plain-list">
              <li>テストユーザーに自分の Google アカウントを追加していないとログインできない</li>
              <li>Drive API を有効化していないと 403 エラーになる</li>
              <li>JavaScript 生成元が `https://archistudy.netlify.app` と完全一致していないと認証に失敗する</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
