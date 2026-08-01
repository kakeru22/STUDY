export type QuestionType = "binary" | "multiple";

export type QuestionChoice = {
  id: string;
  label: string;
};

export type QuestionDraft = {
  type: QuestionType;
  category: string;
  questionText: string;
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
    choices: BINARY_CHOICES,
    correctChoiceId: "a",
    explanation: "",
    tags: [],
    difficulty: 1,
    source: ""
  };
}
