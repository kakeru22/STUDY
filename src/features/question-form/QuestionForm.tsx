import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AppIcon } from "../../components/AppIcon";
import { useQuestionForm } from "../../hooks/useQuestionForm";
import { createInitialQuestionDraft, type QuestionDraft, type QuestionImage } from "../../types/question";

type QuestionFormProps = {
  mode: "create" | "edit";
  initialValue?: QuestionDraft;
  onSubmit: (draft: QuestionDraft) => Promise<void> | void;
  onSubmitAndExit?: (draft: QuestionDraft) => Promise<void> | void;
  onSaveDraft?: (draft: QuestionDraft) => Promise<void> | void;
};

const suggestedTags = ["スター", "頻出", "暗記", "基本", "要復習"];

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

async function fileToCompressedDataUrl(file: File) {
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("画像の展開に失敗しました。"));
    element.src = originalDataUrl;
  });

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const scale = Math.min(1, MAX_IMAGE_WIDTH / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("画像処理の準備に失敗しました。");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function QuestionForm({ mode, initialValue, onSubmit, onSubmitAndExit, onSaveDraft }: QuestionFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{
    type: "error";
    title: string;
    messages: string[];
  } | null>(null);
  const { draft, tagInput, errors, setField, setType, updateChoice, setCorrectChoice, addChoice, removeChoice, setTagInput, addTag, removeTag, submit, reset } =
    useQuestionForm(initialValue);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      const remaining = Math.max(0, MAX_IMAGE_COUNT - draft.images.length);
      const targets = files.slice(0, remaining);

      if (targets.length === 0) {
        setNotice({
          type: "error",
          title: "画像を追加できません",
          messages: [`画像は最大${MAX_IMAGE_COUNT}枚までです。`]
        });
        event.target.value = "";
        return;
      }

      const compressed = await Promise.all(
        targets.map(async (file, index) => {
          const dataUrl = await fileToCompressedDataUrl(file);
          return {
            id: `${Date.now()}-${index}`,
            dataUrl
          } satisfies QuestionImage;
        })
      );
      setField("images", [...draft.images, ...compressed]);
      setField("imageDataUrl", null);
      setNotice(null);
    } catch (error) {
      setNotice({
        type: "error",
        title: "画像の追加に失敗しました",
        messages: [error instanceof Error ? error.message : "画像処理中にエラーが発生しました。"]
      });
    }

    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitWith(onSubmit);
  }

  async function submitWith(callback: (draft: QuestionDraft) => Promise<void> | void) {
    const result = submit();

    if (!result.ok) {
      setNotice({
        type: "error",
        title: "入力内容を確認してください",
        messages: Object.values(result.errors).filter((value): value is string => Boolean(value))
      });
      return;
    }

    await callback(result.value);
    setNotice(null);

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
      {notice ? (
        <div className={`form-toast form-toast--${notice.type}`} role="alert" aria-live="assertive">
          <div className="form-toast__content">
            <strong>{notice.title}</strong>
            <ul className="form-toast__list">
              {notice.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
          <button type="button" className="form-toast__close" onClick={() => setNotice(null)} aria-label="閉じる">
            ×
          </button>
        </div>
      ) : null}

      <section className="form-block form-block--compact">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="check" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Type</p>
            <strong>問題タイプ</strong>
          </div>
        </div>
        <div className="toggle-row">
          <button
            type="button"
            className={draft.type === "binary" ? "toggle-chip is-active" : "toggle-chip"}
            onClick={() => setType("binary")}
          >
            ○×
          </button>
          <button
            type="button"
            className={draft.type === "multiple" ? "toggle-chip is-active" : "toggle-chip"}
            onClick={() => setType("multiple")}
          >
            N択
          </button>
        </div>
      </section>

      <section className="form-block">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="text" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Content</p>
            <strong>基本情報</strong>
          </div>
        </div>

        <label className="field">
          <span>カテゴリ *</span>
          <input
            type="text"
            value={draft.category}
            onChange={(event) => setField("category", event.target.value)}
            placeholder="建築計画 / 英単語 / 法規"
          />
          {errors.category ? <small className="field-error">{errors.category}</small> : null}
        </label>

        <label className="field">
          <span>問題文 *</span>
          <textarea
            rows={4}
            value={draft.questionText}
            onChange={(event) => setField("questionText", event.target.value)}
            placeholder="問題文を入力"
          />
          {errors.questionText ? <small className="field-error">{errors.questionText}</small> : null}
        </label>
      </section>

      <section className="form-block">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="image" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Image</p>
            <strong>画像</strong>
          </div>
        </div>

        <div className="field">
          <div className="image-upload-panel">
            {draft.images.length > 0 ? (
              <div className="image-upload-grid">
                {draft.images.map((image, index) => (
                  <div key={image.id} className="image-upload-preview">
                    <img src={image.dataUrl} alt={`問題画像 ${index + 1}`} className="question-image" />
                    <button
                      type="button"
                      className="button-secondary image-remove-button"
                      onClick={() => setField("images", draft.images.filter((item) => item.id !== image.id))}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="image-upload-placeholder">画像なし</div>
            )}

            <div className="image-upload-actions">
              <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}>
                画像を追加
              </button>
              {draft.images.length > 0 ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setField("images", []);
                    setField("imageDataUrl", null);
                  }}
                >
                  すべて削除
                </button>
              ) : null}
              <small className="field-hint">
                {draft.images.length} / {MAX_IMAGE_COUNT} 枚
              </small>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageChange} />
          </div>
        </div>
      </section>

      <section className="form-block">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="library" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Choices</p>
            <strong>選択肢</strong>
          </div>
        </div>

        <div className="choice-panel field">
          <div className="choice-panel__header">
            <span>選択肢一覧 *</span>
            <small>{draft.type === "multiple" ? `${draft.choices.length} / 6` : "○×は固定です"}</small>
          </div>
          {draft.choices.map((choice, index) => (
            <div key={choice.id} className="choice-item">
              <span className="choice-item__index">{String.fromCharCode(65 + index)}</span>
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
                  className="button-secondary icon-button"
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
            <button type="button" className="button-secondary inline-action" onClick={addChoice} disabled={draft.choices.length >= 6}>
              選択肢を追加
            </button>
          ) : null}
          {errors.choices ? <small className="field-error">{errors.choices}</small> : null}
        </div>
      </section>

      <section className="form-block">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="star" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Answer</p>
            <strong>正解</strong>
          </div>
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
      </section>

      <section className="form-block">
        <div className="field-title">
          <span className="field-title__icon">
            <AppIcon name="tag" className="inline-icon" />
          </span>
          <div>
            <p className="section-title">Tags & Notes</p>
            <strong>補足情報</strong>
          </div>
        </div>

        <label className="field">
          <span>解説</span>
          <textarea
            rows={4}
            value={draft.explanation}
            onChange={(event) => setField("explanation", event.target.value)}
            placeholder="解説や補足"
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
            <select value={draft.difficulty} onChange={(event) => setField("difficulty", Number(event.target.value))} className="select-input">
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>

          <label className="field">
            <span>出典</span>
            <input type="text" value={draft.source} onChange={(event) => setField("source", event.target.value)} placeholder="参考書 / ノート / 講義名" />
          </label>
        </div>
      </section>

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
