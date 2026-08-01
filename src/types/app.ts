import type { QuestionProgress } from "./progress";
import type { QuestionDraft } from "./question";
import type { AppSettings } from "./settings";
import type { SyncState } from "./sync";

export type QuestionRecord = QuestionDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type PersistedState = {
  questions: QuestionRecord[];
  progress: Record<string, QuestionProgress>;
  settings: AppSettings;
  sync: SyncState;
};

export type AppState = PersistedState & {
  isHydrated: boolean;
};

