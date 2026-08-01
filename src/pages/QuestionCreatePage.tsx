import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import { QuestionForm } from "../features/question-form/QuestionForm";
import type { QuestionDraft } from "../types/question";

export function QuestionCreatePage() {
  const navigate = useNavigate();
  const { addQuestion } = useAppContext();
  const [lastSaved, setLastSaved] = useState<QuestionDraft | null>(null);
  const [message, setMessage] = useState("フォーム入力を始めてください。");

  async function handleSubmit(draft: QuestionDraft) {
    addQuestion(draft);
    setLastSaved(draft);
    setMessage(`「${draft.category}」の問題をローカル保存しました。`);
  }

  async function handleSaveDraft(draft: QuestionDraft) {
    setLastSaved(draft);
    setMessage("下書き内容を保持しました。");
  }

  async function handleSubmitAndExit(draft: QuestionDraft) {
    addQuestion(draft);
    navigate("/questions");
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Question Form</p>
        <h2>問題追加</h2>
      </div>

      <QuestionForm mode="create" onSubmit={handleSubmit} onSubmitAndExit={handleSubmitAndExit} onSaveDraft={handleSaveDraft} />

      <aside className="panel save-preview">
        <p className="section-title">保存状態</p>
        <p>{message}</p>
        {lastSaved ? (
          <div className="save-preview__details">
            <p>
              <strong>形式:</strong> {lastSaved.type === "binary" ? "〇×" : "N択"}
            </p>
            <p>
              <strong>カテゴリ:</strong> {lastSaved.category}
            </p>
            <p>
              <strong>タグ:</strong> {lastSaved.tags.length > 0 ? lastSaved.tags.join(", ") : "なし"}
            </p>
            <p>
              <strong>正解:</strong> {lastSaved.correctChoiceId.toUpperCase()}
            </p>
          </div>
        ) : null}
        <div className="action-stack">
          <button type="button" className="button-secondary" onClick={() => navigate("/questions")}>
            問題一覧へ
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate("/settings")}>
            設定を開く
          </button>
        </div>
      </aside>
    </section>
  );
}
