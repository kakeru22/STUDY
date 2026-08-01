import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";

export function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const activeQuestions = state.questions.filter((question) => !question.archived);
  const totalCount = activeQuestions.length || 1;
  const dueToday = activeQuestions.filter((question) => {
    const nextReviewAt = state.progress[question.id]?.nextReviewAt;
    return nextReviewAt ? new Date(nextReviewAt).getTime() <= Date.now() : true;
  }).length;
  const weakCount = activeQuestions.filter((question) => {
    const progress = state.progress[question.id];
    if (!progress || progress.attempts === 0) {
      return false;
    }
    return progress.correctCount / progress.attempts < 0.6;
  }).length;
  const masteredCount = activeQuestions.filter((question) => {
    const progress = state.progress[question.id];
    if (!progress || progress.attempts < 3) {
      return false;
    }
    return progress.correctCount / progress.attempts >= 0.8;
  }).length;
  const syncLabel = state.sync.lastSyncedAt ? new Date(state.sync.lastSyncedAt).toLocaleDateString("ja-JP") : "未同期";
  const chartBars = [
    { label: "Due", value: dueToday, tone: "due" },
    { label: "Weak", value: weakCount, tone: "weak" },
    { label: "Done", value: masteredCount, tone: "done" }
  ] as const;
  const ringSegments = [
    { value: dueToday, color: "#9a3d22" },
    { value: weakCount, color: "#c46a1f" },
    { value: Math.max(0, activeQuestions.length - dueToday - weakCount), color: "#1f6f5f" }
  ];
  const ringCircumference = 2 * Math.PI * 46;
  let offsetCursor = 0;

  const cards = [
    { label: "Today", value: `${dueToday}問`, icon: "◔" },
    { label: "Weak", value: `${weakCount}問`, icon: "△" },
    { label: "Stock", value: `${activeQuestions.length}問`, icon: "≣" },
    { label: "Done", value: `${masteredCount}問`, icon: "✓" }
  ];

  return (
    <section className="page home-page">
      <div className="home-hero panel">
        <div className="home-hero__content">
          <p className="eyebrow">Dashboard</p>
          <h2>今日の復習を、最短距離で。</h2>
          <p>オフラインでも止まらず、オンラインに戻ったらそのまま同期します。</p>
          <div className="home-hero__actions">
            <button type="button" onClick={() => navigate("/review")}>
              復習を始める
            </button>
            <button type="button" className="button-secondary" onClick={() => navigate("/create")}>
              問題を追加
            </button>
          </div>
        </div>
        <div className="home-hero__visual" aria-hidden="true">
          <svg viewBox="0 0 320 220" className="floating-orbit">
            <defs>
              <linearGradient id="heroGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#1f6f5f" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#efe0c6" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="170" cy="110" r="76" fill="url(#heroGradient)" />
            <circle cx="170" cy="110" r="108" className="floating-orbit__ring" />
            <circle cx="102" cy="70" r="18" className="floating-orbit__dot floating-orbit__dot--primary" />
            <circle cx="247" cy="143" r="12" className="floating-orbit__dot floating-orbit__dot--secondary" />
            <path
              d="M95 142C115 166 148 184 183 179C223 173 250 145 258 104"
              className="floating-orbit__stroke"
            />
          </svg>
          <div className="home-hero__status">
            <span className="home-hero__status-label">Sync</span>
            <strong>{syncLabel}</strong>
          </div>
        </div>
      </div>

      <div className="summary-grid home-summary-grid">
        {cards.map((card) => (
          <article key={card.label} className="summary-card">
            <div className="summary-card__head">
              <span className="summary-card__icon" aria-hidden="true">{card.icon}</span>
              <p>{card.label}</p>
            </div>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="home-panels">
        <article className="panel home-panel home-panel--actions">
          <div className="home-panel__heading">
            <p className="section-title">Quick</p>
            <strong>すぐ使う操作</strong>
          </div>
          <div className="home-quick-grid">
            <button type="button" className="home-quick-card" onClick={() => navigate("/review")}>
              <span className="home-quick-card__icon" aria-hidden="true">◉</span>
              <strong>復習</strong>
              <span>{dueToday}問</span>
            </button>
            <button type="button" className="home-quick-card" onClick={() => navigate("/create")}>
              <span className="home-quick-card__icon" aria-hidden="true">+</span>
              <strong>追加</strong>
              <span>新規作成</span>
            </button>
            <button type="button" className="home-quick-card" onClick={() => navigate("/questions")}>
              <span className="home-quick-card__icon" aria-hidden="true">≣</span>
              <strong>一覧</strong>
              <span>{activeQuestions.length}問</span>
            </button>
          </div>
        </article>

        <article className="panel home-panel home-panel--chart">
          <div className="home-panel__heading">
            <p className="section-title">Visual</p>
            <strong>進み具合</strong>
          </div>
          <div className="home-chart">
            <div className="home-ring-chart" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" className="home-ring-chart__base" />
                {ringSegments.map((segment, index) => {
                  const length = (Math.max(segment.value, 0) / totalCount) * ringCircumference;
                  const strokeDasharray = `${length} ${ringCircumference}`;
                  const strokeDashoffset = -offsetCursor;
                  offsetCursor += length;

                  return (
                    <circle
                      key={`${segment.color}-${index}`}
                      cx="60"
                      cy="60"
                      r="46"
                      className="home-ring-chart__segment"
                      style={{ stroke: segment.color, strokeDasharray, strokeDashoffset }}
                    />
                  );
                })}
              </svg>
              <div className="home-ring-chart__label">
                <strong>{activeQuestions.length}</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="home-bar-chart">
              {chartBars.map((bar) => (
                <div key={bar.label} className="home-bar-chart__row">
                  <div className="home-bar-chart__meta">
                    <span>{bar.label}</span>
                    <strong>{bar.value}</strong>
                  </div>
                  <div className="home-bar-chart__track">
                    <span
                      className={`home-bar-chart__fill home-bar-chart__fill--${bar.tone}`}
                      style={{ width: `${Math.max((bar.value / totalCount) * 100, bar.value > 0 ? 12 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel home-panel">
          <div className="home-panel__heading">
            <p className="section-title">Focus</p>
            <strong>今日の状況</strong>
          </div>
          <div className="home-focus-list">
            <div className="home-focus-item">
              <span>要復習</span>
              <strong>{dueToday}問</strong>
            </div>
            <div className="home-focus-item">
              <span>苦手</span>
              <strong>{weakCount}問</strong>
            </div>
            <div className="home-focus-item">
              <span>同期</span>
              <strong>{state.sync.unsyncedCount > 0 ? `${state.sync.unsyncedCount}件` : "完了"}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
