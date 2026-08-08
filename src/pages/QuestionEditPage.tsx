import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";
import { QuestionForm } from "../features/question-form/QuestionForm";
import type { QuestionDraft } from "../types/question";

export function QuestionEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { state, archiveQuestion, deleteQuestion, updateQuestion } = useAppContext();
  const [message, setMessage] = useState("");

  const question = useMemo(() => state.questions.find((item) => item.id === id), [id, state.questions]);
  const progress = question ? state.progress[question.id] : undefined;

  if (!question) {
    return (
      <section className="page">
        <div className="page-heading">
          <p className="eyebrow">Question Edit</p>
          <h2>問題が見つかりません</h2>
        </div>
        <Link to="/questions" className="text-link">
          問題一覧へ戻る
        </Link>
      </section>
    );
  }

  const currentQuestion = question;

  async function handleSubmit(draft: QuestionDraft) {
    updateQuestion(currentQuestion.id, draft);
    setMessage("問題を更新しました。");
  }

  async function handleSubmitAndExit(draft: QuestionDraft) {
    updateQuestion(currentQuestion.id, draft);
    navigate("/questions");
  }

  function handleDelete() {
    const confirmed = window.confirm("この問題を削除します。元に戻せません。");
    if (!confirmed) {
      return;
    }

    deleteQuestion(currentQuestion.id);
    navigate("/questions", {
      state: {
        toastMessage: "問題を削除しました。"
      }
    });
  }

  return (
    <section className="page">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Question Edit</p>
          <h2>問題編集</h2>
        </div>
        <div className="page-heading__meta">
          <span>Question</span>
          <strong>{currentQuestion.category}</strong>
        </div>
      </div>

      <div className="page-shell">
        <QuestionForm mode="edit" initialValue={currentQuestion} onSubmit={handleSubmit} onSubmitAndExit={handleSubmitAndExit} />

        <aside className="page-side-column">
          <section className="panel save-preview page-side-panel">
            <div className="page-side-panel__heading icon-heading">
              <span className="icon-heading__mark">
                <AppIcon name="chart" className="inline-icon" />
              </span>
              <div>
                <p className="section-title">Progress</p>
                <strong>学習状況</strong>
              </div>
            </div>
            <p className="page-side-panel__lead">{message || "更新すると学習の見直しにすぐ反映されます。"}</p>
            <div className="mini-stat-grid">
              <div className="mini-stat">
                <span>正解</span>
                <strong>{progress?.correctCount ?? 0}</strong>
              </div>
              <div className="mini-stat">
                <span>不正解</span>
                <strong>{progress?.wrongCount ?? 0}</strong>
              </div>
              <div className="mini-stat">
                <span>連続</span>
                <strong>{progress?.correctStreak ?? 0}</strong>
              </div>
              <div className="mini-stat">
                <span>次回</span>
                <strong>{progress?.nextReviewAt ? new Date(progress.nextReviewAt).toLocaleDateString("ja-JP") : "未設定"}</strong>
              </div>
            </div>
            <div className="action-stack">
              <button type="button" className="button-secondary" onClick={() => navigate("/questions")}>
                問題一覧へ戻る
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  archiveQuestion(currentQuestion.id);
                  navigate("/questions", {
                    state: {
                      toastMessage: "問題をアーカイブしました。"
                    }
                  });
                }}
              >
                アーカイブ
              </button>
              <button type="button" className="button-secondary button-danger" onClick={handleDelete}>
                削除
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
