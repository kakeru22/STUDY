import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";

export function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const activeQuestions = state.questions.filter((question) => !question.archived);
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

  const cards = [
    { label: "今日の復習", value: `${dueToday}問` },
    { label: "苦手問題", value: `${weakCount}問` },
    { label: "登録問題", value: `${activeQuestions.length}問` },
    { label: "最終同期", value: state.sync.lastSyncedAt ? new Date(state.sync.lastSyncedAt).toLocaleDateString("ja-JP") : "未同期" }
  ];

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Dashboard</p>
        <h2>今日の学習をすぐ始める</h2>
        <p>起動はローカル優先です。通信が不安定でも、追加・編集・復習はそのまま継続できます。</p>
      </div>

      <div className="summary-grid">
        {cards.map((card) => (
          <article key={card.label} className="summary-card">
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="action-stack">
        <button type="button" onClick={() => navigate("/review")}>
          今日の復習を開始
        </button>
        <button type="button" className="button-secondary" onClick={() => navigate("/create")}>
          問題を追加
        </button>
        <button type="button" className="button-secondary" onClick={() => navigate("/questions")}>
          問題一覧を見る
        </button>
      </div>
    </section>
  );
}
