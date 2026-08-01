import type { FormEvent } from "react";
import { useQuestionForm } from "../../hooks/useQuestionForm";
import { createInitialQuestionDraft, type QuestionDraft } from "../../types/question";

type QuestionFormProps = {
  mode: "create" | "edit";
  initialValue?: QuestionDraft;
  onSubmit: (draft: QuestionDraft) => Promise<void> | void;
  onSubmitAndExit?: (draft: QuestionDraft) => Promise<void> | void;
  onSaveDraft?: (draft: QuestionDraft) => Promise<void> | void;
};

const suggestedTags = ["英語", "単語", "基礎", "日本史", "鎌倉"];

export function QuestionForm({ mode, initialValue, onSubmit, onSubmitAndExit, onSaveDraft }: QuestionFormProps) {
  const {
    draft,
    tagInput,
    errors,
    setField,
    setType,
    updateChoice,
    setCorrectChoice,
    addChoice,
    removeChoice,
    setTagInput,
    addTag,
    removeTag,
    submit,
    reset
  } = useQuestionForm(initialValue);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitWith(onSubmit);
  }

  async function submitWith(callback: (draft: QuestionDraft) => Promise<void> | void) {
    const result = submit();

    if (!result.ok) {
      return;
    }

    await callback(result.value);

    if (mode === "create") {
      const nextDraft = createInitialQuestionDraft();
      nextDraft.category = result.value.category;
      nextDraft.tags = result.value.tags;
      nextDraft.difficulty = result.value.difficulty;
      nextDraft.source = result.value.source;
      reset(nextDraft);
    }
  }

  function handleSaveDraft() {
    if (!onSaveDraft) {
      return;
    }

    onSaveDraft(draft);
  }

  return (
    <form className="panel form-layout" onSubmit={handleSubmit}>
      <div className="toggle-row">
        <button
          type="button"
          className={draft.type === "binary" ? "toggle-chip is-active" : "toggle-chip"}
          onClick={() => setType("binary")}
        >
          〇×
        </button>
        <button
          type="button"
          className={draft.type === "multiple" ? "toggle-chip is-active" : "toggle-chip"}
          onClick={() => setType("multiple")}
        >
          N択
        </button>
      </div>

      <label className="field">
        <span>カテゴリ *</span>
        <input
          type="text"
          value={draft.category}
          onChange={(event) => setField("category", event.target.value)}
          placeholder="英語基礎"
        />
        {errors.category ? <small className="field-error">{errors.category}</small> : null}
      </label>

      <label className="field">
        <span>問題文 *</span>
        <textarea
          rows={4}
          value={draft.questionText}
          onChange={(event) => setField("questionText", event.target.value)}
          placeholder="apple は「りんご」である。"
        />
        {errors.questionText ? <small className="field-error">{errors.questionText}</small> : null}
      </label>

      <div className="choice-panel field">
        <div className="choice-panel__header">
          <span>選択肢 *</span>
          {draft.type === "multiple" ? <small>{draft.choices.length} / 6</small> : <small>〇×は自動入力</small>}
        </div>
        {draft.choices.map((choice, index) => (
          <div key={choice.id} className="choice-item">
            <span>{String.fromCharCode(65 + index)}</span>
            <input
              type="text"
              value={choice.label}
              readOnly={draft.type === "binary"}
              onChange={(event) => updateChoice(choice.id, event.target.value)}
              placeholder="選択肢を入力"
            />
            {draft.type === "multiple" ? (
              <button
                type="button"
                className="icon-button"
                onClick={() => removeChoice(choice.id)}
                disabled={draft.choices.length <= 2}
                aria-label={`選択肢 ${index + 1} を削除`}
              >
                削除
              </button>
            ) : null}
          </div>
        ))}
        {draft.type === "multiple" ? (
          <button
            type="button"
            className="button-secondary inline-action"
            onClick={addChoice}
            disabled={draft.choices.length >= 6}
          >
            選択肢を追加
          </button>
        ) : null}
        {errors.choices ? <small className="field-error">{errors.choices}</small> : null}
      </div>

      <fieldset className="answer-picker">
        <legend>正解 *</legend>
        <div className="answer-picker__options">
          {draft.choices.map((choice, index) => (
            <label key={choice.id} className="answer-option">
              <input
                type="radio"
                name="correctChoiceId"
                checked={draft.correctChoiceId === choice.id}
                onChange={() => setCorrectChoice(choice.id)}
              />
              <span>
                {String.fromCharCode(65 + index)}. {choice.label || "未入力"}
              </span>
            </label>
          ))}
        </div>
        {errors.correctChoiceId ? <small className="field-error">{errors.correctChoiceId}</small> : null}
      </fieldset>

      <label className="field">
        <span>解説</span>
        <textarea
          rows={4}
          value={draft.explanation}
          onChange={(event) => setField("explanation", event.target.value)}
          placeholder="覚え方や補足を書く"
        />
      </label>

      <div className="field">
        <span>タグ</span>
        <div className="tag-input-row">
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="タグを追加"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
          />
          <button type="button" className="button-secondary inline-action" onClick={() => addTag()}>
            追加
          </button>
        </div>
        <div className="tag-list">
          {draft.tags.map((tag) => (
            <button key={tag} type="button" className="tag tag-button" onClick={() => removeTag(tag)}>
              {tag} ×
            </button>
          ))}
        </div>
        <div className="chip-row">
          {suggestedTags
            .filter((tag) => !draft.tags.includes(tag))
            .map((tag) => (
              <button key={tag} type="button" className="filter-chip" onClick={() => addTag(tag)}>
                {tag}
              </button>
            ))}
        </div>
      </div>

      <div className="split-fields">
        <label className="field">
          <span>難易度</span>
          <select
            value={draft.difficulty}
            onChange={(event) => setField("difficulty", Number(event.target.value))}
            className="select-input"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>

        <label className="field">
          <span>出典</span>
          <input
            type="text"
            value={draft.source}
            onChange={(event) => setField("source", event.target.value)}
            placeholder="参考書・ノート名"
          />
        </label>
      </div>

      <div className="action-stack form-actions">
        <button type="submit">{mode === "create" ? "保存して続ける" : "更新する"}</button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            if (onSubmitAndExit) {
              void submitWith(onSubmitAndExit);
            }
          }}
        >
          保存して一覧へ
        </button>
        <button type="button" className="button-secondary" onClick={handleSaveDraft}>
          下書き保存
        </button>
      </div>
    </form>
  );
}
