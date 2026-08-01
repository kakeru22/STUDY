import { useState } from "react";
import {
  BINARY_CHOICES,
  createEmptyMultipleChoices,
  createInitialQuestionDraft,
  type QuestionDraft,
  type QuestionType
} from "../types/question";

type ValidationErrors = Partial<Record<keyof QuestionDraft | "choices", string>>;

type SubmitResult = { ok: true; value: QuestionDraft } | { ok: false };

export function useQuestionForm(initialValue?: QuestionDraft) {
  const [draft, setDraft] = useState<QuestionDraft>(initialValue ?? createInitialQuestionDraft());
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});

  function setField<K extends keyof QuestionDraft>(field: K, value: QuestionDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setType(type: QuestionType) {
    setDraft((current) => ({
      ...current,
      type,
      choices: type === "binary" ? BINARY_CHOICES : createEmptyMultipleChoices(4),
      correctChoiceId: "a"
    }));
    setErrors((current) => ({ ...current, choices: undefined, correctChoiceId: undefined }));
  }

  function updateChoice(choiceId: string, label: string) {
    setDraft((current) => ({
      ...current,
      choices: current.choices.map((choice) => (choice.id === choiceId ? { ...choice, label } : choice))
    }));
    setErrors((current) => ({ ...current, choices: undefined }));
  }

  function setCorrectChoice(choiceId: string) {
    setDraft((current) => ({ ...current, correctChoiceId: choiceId }));
    setErrors((current) => ({ ...current, correctChoiceId: undefined }));
  }

  function addChoice() {
    setDraft((current) => {
      if (current.type !== "multiple" || current.choices.length >= 6) {
        return current;
      }

      return {
        ...current,
        choices: [...current.choices, { id: String.fromCharCode(97 + current.choices.length), label: "" }]
      };
    });
  }

  function removeChoice(choiceId: string) {
    setDraft((current) => {
      if (current.type !== "multiple" || current.choices.length <= 2) {
        return current;
      }

      const remainingChoices = current.choices.filter((choice) => choice.id !== choiceId);
      const nextCorrectChoiceId =
        current.correctChoiceId === choiceId ? remainingChoices[0]?.id ?? "a" : current.correctChoiceId;

      return {
        ...current,
        choices: remainingChoices,
        correctChoiceId: nextCorrectChoiceId
      };
    });
  }

  function addTag(value?: string) {
    const normalized = (value ?? tagInput).trim();
    if (!normalized || draft.tags.includes(normalized)) {
      setTagInput("");
      return;
    }

    setDraft((current) => ({
      ...current,
      tags: [...current.tags, normalized]
    }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag)
    }));
  }

  function validate(value: QuestionDraft): ValidationErrors {
    const nextErrors: ValidationErrors = {};

    if (!value.category.trim()) {
      nextErrors.category = "カテゴリは必須です。";
    }

    if (!value.questionText.trim()) {
      nextErrors.questionText = "問題文は必須です。";
    }

    if (value.choices.some((choice) => !choice.label.trim())) {
      nextErrors.choices = "選択肢はすべて入力してください。";
    }

    if (!value.correctChoiceId) {
      nextErrors.correctChoiceId = "正解を選択してください。";
    }

    return nextErrors;
  }

  function submit(): SubmitResult {
    const nextErrors = validate(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return { ok: false };
    }

    return {
      ok: true,
      value: {
        ...draft,
        category: draft.category.trim(),
        questionText: draft.questionText.trim(),
        explanation: draft.explanation.trim(),
        source: draft.source.trim()
      }
    };
  }

  function reset(nextDraft = createInitialQuestionDraft()) {
    setDraft(nextDraft);
    setTagInput("");
    setErrors({});
  }

  return {
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
  };
}
