import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import { QuestionForm } from "../features/question-form/QuestionForm";
import type { QuestionDraft } from "../types/question";

export function QuestionEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { state, archiveQuestion, updateQuestion } = useAppContext();
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

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Question Edit</p>
        <h2>問題編集</h2>
      </div>

      <QuestionForm mode="edit" initialValue={currentQuestion} onSubmit={handleSubmit} onSubmitAndExit={handleSubmitAndExit} />

      <aside className="panel save-preview">
        <p className="section-title">学習状況</p>
        <p>{message || "内容を更新しながら、この問題の学習状況を確認できます。"}</p>
        <div className="save-preview__details">
          <p>
            <strong>正解:</strong> {progress?.correctCount ?? 0}
          </p>
          <p>
            <strong>不正解:</strong> {progress?.wrongCount ?? 0}
          </p>
          <p>
            <strong>連続正解:</strong> {progress?.correctStreak ?? 0}
          </p>
          <p>
            <strong>次回復習:</strong> {progress?.nextReviewAt ? new Date(progress.nextReviewAt).toLocaleString("ja-JP") : "未設定"}
          </p>
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
              navigate("/questions");
            }}
          >
            アーカイブ
          </button>
        </div>
      </aside>
    </section>
  );
}
