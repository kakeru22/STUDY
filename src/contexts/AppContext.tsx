import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode
} from "react";
import { seedState } from "../data/seed";
import { loadPersistedState, savePersistedState } from "../services/storage/appStateRepository";
import { calculateNextReviewDate } from "../services/review/reviewScheduler";
import {
  pullSnapshotFromDrive,
  pushSnapshotToDrive,
  requestDriveAccessToken,
  revokeDriveAccess
} from "../services/sync/googleDriveService";
import type { AppState, PersistedState, QuestionRecord } from "../types/app";
import type { QuestionDraft } from "../types/question";
import type { AppSettings } from "../types/settings";
import type { SyncMode } from "../types/sync";

type AppContextValue = {
  state: AppState;
  addQuestion: (draft: QuestionDraft) => void;
  updateQuestion: (id: string, draft: QuestionDraft) => void;
  toggleStar: (questionId: string) => void;
  archiveQuestion: (questionId: string) => void;
  answerQuestion: (questionId: string, selectedChoiceId: string) => { correct: boolean; nextReviewAt: string };
  importSnapshot: (snapshot: PersistedState) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  authorizeGoogleDrive: () => Promise<void>;
  syncToDrive: () => Promise<void>;
  loadFromDrive: () => Promise<void>;
  signOutDrive: () => void;
  exportSnapshot: () => PersistedState;
};

type Action =
  | { type: "hydrate"; payload: PersistedState }
  | { type: "set-sync"; payload: Partial<AppState["sync"]> }
  | { type: "add-question"; payload: QuestionRecord }
  | { type: "update-question"; payload: { id: string; draft: QuestionDraft } }
  | { type: "toggle-star"; payload: { questionId: string } }
  | { type: "archive-question"; payload: { questionId: string } }
  | { type: "answer-question"; payload: { questionId: string; selectedChoiceId: string; answeredAt: string } }
  | { type: "replace-state"; payload: PersistedState }
  | { type: "update-settings"; payload: Partial<AppSettings> };

const initialState: AppState = {
  ...seedState,
  isHydrated: false
};

function markDirty(sync: AppState["sync"], statusMessage = "ローカル変更を保存しました。") {
  return {
    ...sync,
    unsyncedCount: sync.unsyncedCount + 1,
    statusMessage
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...action.payload,
        isHydrated: true
      };
    case "set-sync":
      return {
        ...state,
        sync: {
          ...state.sync,
          ...action.payload
        }
      };
    case "add-question":
      return {
        ...state,
        questions: [action.payload, ...state.questions],
        sync: markDirty(state.sync, "問題を保存しました。")
      };
    case "update-question":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.payload.id
            ? {
                ...question,
                ...action.payload.draft,
                updatedAt: new Date().toISOString()
              }
            : question
        ),
        sync: markDirty(state.sync, "問題を更新しました。")
      };
    case "toggle-star": {
      const current = state.progress[action.payload.questionId] ?? {
        questionId: action.payload.questionId,
        attempts: 0,
        correctCount: 0,
        wrongCount: 0,
        correctStreak: 0,
        lastAnsweredAt: null,
        lastResult: null,
        nextReviewAt: null,
        isStarred: false
      };
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.questionId]: {
            ...current,
            isStarred: !current.isStarred
          }
        },
        sync: markDirty(state.sync, "お気に入りを更新しました。")
      };
    }
    case "archive-question":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.payload.questionId
            ? { ...question, archived: true, updatedAt: new Date().toISOString() }
            : question
        ),
        sync: markDirty(state.sync, "問題をアーカイブしました。")
      };
    case "answer-question": {
      const question = state.questions.find((item) => item.id === action.payload.questionId);
      if (!question) {
        return state;
      }

      const previous = state.progress[action.payload.questionId] ?? {
        questionId: action.payload.questionId,
        attempts: 0,
        correctCount: 0,
        wrongCount: 0,
        correctStreak: 0,
        lastAnsweredAt: null,
        lastResult: null,
        nextReviewAt: null,
        isStarred: false
      };
      const correct = question.correctChoiceId === action.payload.selectedChoiceId;
      const correctStreak = correct ? previous.correctStreak + 1 : 0;
      const nextReviewAt = calculateNextReviewDate(correctStreak, correct ? "correct" : "wrong", new Date(action.payload.answeredAt));

      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.questionId]: {
            ...previous,
            attempts: previous.attempts + 1,
            correctCount: previous.correctCount + (correct ? 1 : 0),
            wrongCount: previous.wrongCount + (correct ? 0 : 1),
            correctStreak,
            lastAnsweredAt: action.payload.answeredAt,
            lastResult: correct ? "correct" : "wrong",
            nextReviewAt
          }
        },
        sync: markDirty(state.sync, correct ? "正解を記録しました。" : "不正解を記録しました。")
      };
    }
    case "replace-state":
      return {
        ...action.payload,
        isHydrated: true
      };
    case "update-settings":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        },
        sync: markDirty(state.sync, "設定を更新しました。")
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

function toPersistedState(state: AppState): PersistedState {
  return {
    questions: state.questions,
    progress: state.progress,
    settings: state.settings,
    sync: state.sync
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isFirstSave = useRef(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    loadPersistedState().then((persisted) => {
      dispatch({
        type: "hydrate",
        payload: {
          ...persisted,
          sync: {
            ...persisted.sync,
            mode: navigator.onLine ? (persisted.sync.isAuthorized ? "online" : persisted.sync.mode) : "offline"
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }

    const nextMode: SyncMode = isOnline ? (state.sync.isAuthorized ? "online" : "online") : "offline";
    if (state.sync.mode !== nextMode) {
      dispatch({
        type: "set-sync",
        payload: {
          mode: nextMode,
          statusMessage: isOnline ? "オンラインです。同期できます。" : "オフラインモードで起動中"
        }
      });
    }
  }, [isOnline, state.isHydrated, state.sync.isAuthorized, state.sync.mode]);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }

    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }

    void savePersistedState(toPersistedState(state));
  }, [state]);

  const value = useMemo<AppContextValue>(() => {
    return {
      state,
      addQuestion(draft) {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "add-question",
          payload: {
            ...draft,
            id: `q_${Date.now()}`,
            createdAt: timestamp,
            updatedAt: timestamp,
            archived: false
          }
        });
      },
      updateQuestion(id, draft) {
        dispatch({ type: "update-question", payload: { id, draft } });
      },
      toggleStar(questionId) {
        dispatch({ type: "toggle-star", payload: { questionId } });
      },
      archiveQuestion(questionId) {
        dispatch({ type: "archive-question", payload: { questionId } });
      },
      answerQuestion(questionId, selectedChoiceId) {
        const question = state.questions.find((item) => item.id === questionId);
        if (!question) {
          throw new Error("Question not found.");
        }
        const correct = question.correctChoiceId === selectedChoiceId;
        const previous = state.progress[questionId];
        const correctStreak = correct ? (previous?.correctStreak ?? 0) + 1 : 0;
        const answeredAt = new Date().toISOString();
        const nextReviewAt = calculateNextReviewDate(correctStreak, correct ? "correct" : "wrong", new Date(answeredAt));
        dispatch({ type: "answer-question", payload: { questionId, selectedChoiceId, answeredAt } });
        return { correct, nextReviewAt };
      },
      importSnapshot(snapshot) {
        dispatch({ type: "replace-state", payload: snapshot });
      },
      updateSettings(patch) {
        dispatch({ type: "update-settings", payload: patch });
      },
      async authorizeGoogleDrive() {
        dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Google認証を開始します。" } });
        try {
          await requestDriveAccessToken(state.settings.googleClientId);
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              isAuthorized: true,
              statusMessage: "Google Drive 連携を認証しました。"
            }
          });
        } catch (error) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              statusMessage: error instanceof Error ? error.message : "Google認証に失敗しました。"
            }
          });
          throw error;
        }
      },
      async syncToDrive() {
        dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive に保存しています。" } });
        try {
          const folderId = await pushSnapshotToDrive(toPersistedState(state), state.settings.driveFolderName);
          dispatch({
            type: "replace-state",
            payload: {
              ...toPersistedState(state),
              settings: {
                ...state.settings,
                driveFolderId: folderId
              },
              sync: {
                ...state.sync,
                mode: navigator.onLine ? "online" : "offline",
                unsyncedCount: 0,
                lastSyncedAt: new Date().toISOString(),
                isAuthorized: true,
                statusMessage: "Driveへ同期しました。"
              }
            }
          });
        } catch (error) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              statusMessage: error instanceof Error ? error.message : "Drive同期に失敗しました。"
            }
          });
          throw error;
        }
      },
      async loadFromDrive() {
        dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive から読み込んでいます。" } });
        try {
          const result = await pullSnapshotFromDrive(state.settings.driveFolderName);
          dispatch({
            type: "replace-state",
            payload: {
              questions: result.state.questions ?? state.questions,
              progress: result.state.progress ?? state.progress,
              settings: {
                ...state.settings,
                ...(result.state.settings ?? {}),
                driveFolderId: result.folderId
              },
              sync: {
                ...state.sync,
                mode: navigator.onLine ? "online" : "offline",
                lastSyncedAt: new Date().toISOString(),
                unsyncedCount: 0,
                isAuthorized: true,
                statusMessage: "Driveから読み込みました。"
              }
            }
          });
        } catch (error) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              statusMessage: error instanceof Error ? error.message : "Drive読込に失敗しました。"
            }
          });
          throw error;
        }
      },
      signOutDrive() {
        revokeDriveAccess();
        dispatch({
          type: "set-sync",
          payload: {
            isAuthorized: false,
            statusMessage: "Drive連携を解除しました。"
          }
        });
      },
      exportSnapshot() {
        return toPersistedState(state);
      }
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("AppContext is not available.");
  }
  return value;
}
