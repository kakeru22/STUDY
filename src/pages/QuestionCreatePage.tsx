import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
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
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Question Form</p>
          <h2>問題追加</h2>
        </div>
        <div className="page-heading__meta">
          <span>Local Save</span>
          <strong>{lastSaved ? "保存済み" : "編集中"}</strong>
        </div>
      </div>

      <div className="page-shell">
        <QuestionForm mode="create" onSubmit={handleSubmit} onSubmitAndExit={handleSubmitAndExit} onSaveDraft={handleSaveDraft} />

        <aside className="page-side-column">
          <section className="panel save-preview page-side-panel">
            <div className="page-side-panel__heading icon-heading">
              <span className="icon-heading__mark"><AppIcon name="check" className="inline-icon" /></span>
              <div>
                <p className="section-title">State</p>
                <strong>保存状態</strong>
              </div>
            </div>
            <p className="page-side-panel__lead">{message}</p>
            {lastSaved ? (
              <div className="mini-stat-grid">
                <div className="mini-stat">
                  <span>形式</span>
                  <strong>{lastSaved.type === "binary" ? "〇×" : "N択"}</strong>
                </div>
                <div className="mini-stat">
                  <span>タグ</span>
                  <strong>{lastSaved.tags.length || 0}</strong>
                </div>
                <div className="mini-stat">
                  <span>カテゴリ</span>
                  <strong>{lastSaved.category}</strong>
                </div>
                <div className="mini-stat">
                  <span>正解</span>
                  <strong>{lastSaved.correctChoiceId.toUpperCase()}</strong>
                </div>
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
          </section>
        </aside>
      </div>
    </section>
  );
}
