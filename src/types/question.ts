export type QuestionType = "binary" | "multiple";

export type QuestionChoice = {
  id: string;
  label: string;
};

export type QuestionImage = {
  id: string;
  dataUrl: string;
};

export type QuestionDraft = {
  type: QuestionType;
  category: string;
  questionText: string;
  images: QuestionImage[];
  imageDataUrl?: string | null;
  choices: QuestionChoice[];
  correctChoiceId: string;
  explanation: string;
  tags: string[];
  difficulty: number;
  source: string;
};

export const BINARY_CHOICES: QuestionChoice[] = [
  { id: "a", label: "〇" },
  { id: "b", label: "×" }
];

export function createEmptyMultipleChoices(count = 4): QuestionChoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String.fromCharCode(97 + index),
    label: ""
  }));
}

export function createInitialQuestionDraft(): QuestionDraft {
  return {
    type: "binary",
    category: "",
    questionText: "",
    images: [],
    imageDataUrl: null,
    choices: BINARY_CHOICES,
    correctChoiceId: "a",
    explanation: "",
    tags: [],
    difficulty: 1,
    source: ""
  };
}

export function getQuestionImages(question: Partial<Pick<QuestionDraft, "images" | "imageDataUrl">>): QuestionImage[] {
  if (Array.isArray(question.images) && question.images.length > 0) {
    return question.images;
  }

  if (question.imageDataUrl) {
    return [{ id: "legacy-image", dataUrl: question.imageDataUrl }];
  }

  return [];
}

export function normalizeQuestionDraft(question?: Partial<QuestionDraft> | null): QuestionDraft {
  const base = createInitialQuestionDraft();
  if (!question) {
    return base;
  }

  const merged: QuestionDraft = {
    ...base,
    ...question,
    images: Array.isArray(question.images) ? question.images : [],
    imageDataUrl: question.imageDataUrl ?? null,
    choices: question.choices ?? base.choices,
    tags: question.tags ?? base.tags
  };

  return {
    ...merged,
    images: getQuestionImages(merged),
    imageDataUrl: null
  };
}
