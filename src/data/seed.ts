import type { PersistedState, QuestionRecord } from "../types/app";
import type { QuestionProgress } from "../types/progress";

const now = new Date("2026-08-01T10:00:00+09:00").toISOString();

const questions: QuestionRecord[] = [
  {
    id: "q_english_001",
    type: "binary",
    category: "英語基礎",
    questionText: "apple は「りんご」である。",
    images: [],
    imageDataUrl: null,
    choices: [
      { id: "a", label: "〇" },
      { id: "b", label: "×" }
    ],
    correctChoiceId: "a",
    explanation: "apple = りんご",
    tags: ["英語", "単語", "基礎"],
    difficulty: 1,
    source: "英単語帳A",
    createdAt: now,
    updatedAt: now,
    archived: false
  },
  {
    id: "q_history_001",
    type: "multiple",
    category: "日本史",
    questionText: "鎌倉幕府の成立年として最も一般的に扱われるものを選べ。",
    images: [],
    imageDataUrl: null,
    choices: [
      { id: "a", label: "1180年" },
      { id: "b", label: "1185年" },
      { id: "c", label: "1192年" },
      { id: "d", label: "1200年" }
    ],
    correctChoiceId: "c",
    explanation: "学習方針によって1185年説もあるが、この問題では1192年を正答とする。",
    tags: ["日本史", "鎌倉"],
    difficulty: 2,
    source: "日本史ノート",
    createdAt: now,
    updatedAt: now,
    archived: false
  }
];

const progress: Record<string, QuestionProgress> = {
  q_english_001: {
    questionId: "q_english_001",
    attempts: 5,
    correctCount: 4,
    wrongCount: 1,
    correctStreak: 2,
    lastAnsweredAt: "2026-07-31T21:00:00+09:00",
    lastResult: "correct",
    nextReviewAt: "2026-08-01T09:00:00+09:00",
    isStarred: false
  },
  q_history_001: {
    questionId: "q_history_001",
    attempts: 8,
    correctCount: 4,
    wrongCount: 4,
    correctStreak: 0,
    lastAnsweredAt: "2026-07-30T21:00:00+09:00",
    lastResult: "wrong",
    nextReviewAt: "2026-08-01T09:00:00+09:00",
    isStarred: true
  }
};

export const seedState: PersistedState = {
  questions,
  progress,
  settings: {
    autoSync: false,
    googleClientId: "",
    driveFolderName: "StudyReviewApp",
    driveFolderId: null,
    startupMode: "unset"
  },
  sync: {
    mode: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
    unsyncedCount: 0,
    lastSyncedAt: null,
    isAuthorized: false,
    statusMessage: "ローカルモードで起動中"
  }
};
