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
  hasDriveAccessToken,
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
  setStartupMode: (mode: AppSettings["startupMode"]) => void;
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
  | { type: "update-settings"; payload: Partial<AppSettings>; trackDirty?: boolean };

const initialState: AppState = {
  ...seedState,
  isHydrated: false
};

function toPersistedState(state: AppState): PersistedState {
  return {
    questions: state.questions,
    progress: state.progress,
    settings: state.settings,
    sync: state.sync
  };
}

function markDirty(sync: AppState["sync"], statusMessage = "ローカル変更を保存しました。") {
  return {
    ...sync,
    unsyncedCount: sync.unsyncedCount + 1,
    statusMessage
  };
}

function isAuthorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Google Drive 連携が未認証") ||
    message.includes("Google Client ID が未設定") ||
    message.includes("access_denied") ||
    message.includes("invalid_grant") ||
    message.includes("401")
  );
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
        sync: markDirty(state.sync, "重要設定を更新しました。")
      };
    }
    case "archive-question":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.payload.questionId ? { ...question, archived: true, updatedAt: new Date().toISOString() } : question
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
        sync: action.trackDirty === false ? state.sync : markDirty(state.sync, "設定を更新しました。")
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const isFirstSave = useRef(true);
  const autoSyncTimerRef = useRef<number | null>(null);
  const autoReconnectAttemptedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  async function runSync(snapshot = toPersistedState(stateRef.current)) {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive に同期しています。" } });

    try {
      const folderId = await pushSnapshotToDrive(snapshot, snapshot.settings.driveFolderName);
      dispatch({
        type: "replace-state",
        payload: {
          ...snapshot,
          settings: {
            ...snapshot.settings,
            driveFolderId: folderId
          },
          sync: {
            ...snapshot.sync,
            mode: navigator.onLine ? "online" : "offline",
            unsyncedCount: 0,
            lastSyncedAt: new Date().toISOString(),
            isAuthorized: true,
            statusMessage: ""
          }
        }
      });
    } catch (error) {
      if (isAuthorizationError(error)) {
        revokeDriveAccess();
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            isAuthorized: false,
            statusMessage: "Google の接続が切れました。もう一度接続してください。"
          }
        });
      } else {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            statusMessage: "同期できなかったため、オフラインモードに切り替えました。"
          }
        });
      }
      throw error;
    }
  }

  async function runLoadFromDrive() {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive から読み込んでいます。" } });

    try {
      const currentState = stateRef.current;
      const result = await pullSnapshotFromDrive(currentState.settings.driveFolderName);
      dispatch({
        type: "replace-state",
        payload: {
          questions: result.state.questions ?? currentState.questions,
          progress: result.state.progress ?? currentState.progress,
          settings: {
            ...currentState.settings,
            ...(result.state.settings ?? {}),
            driveFolderId: result.folderId
          },
          sync: {
            ...currentState.sync,
            mode: navigator.onLine ? "online" : "offline",
            lastSyncedAt: new Date().toISOString(),
            unsyncedCount: 0,
            isAuthorized: true,
            statusMessage: ""
          }
        }
      });
    } catch (error) {
      if (isAuthorizationError(error)) {
        revokeDriveAccess();
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            isAuthorized: false,
            statusMessage: "Google の接続が切れました。もう一度接続してください。"
          }
        });
      } else {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            statusMessage: "Drive を読み込めなかったため、オフラインモードに切り替えました。"
          }
        });
      }
      throw error;
    }
  }

  useEffect(() => {
    loadPersistedState().then((persisted) => {
      const canUseDriveSession = persisted.sync.isAuthorized && hasDriveAccessToken();
      dispatch({
        type: "hydrate",
        payload: {
          ...persisted,
          sync: {
            ...persisted.sync,
            isAuthorized: canUseDriveSession,
            mode: navigator.onLine ? (canUseDriveSession ? "online" : "offline") : "offline",
            statusMessage: canUseDriveSession ? "" : persisted.settings.startupMode === "drive" ? "Google に再接続してください。" : ""
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!state.isHydrated || autoReconnectAttemptedRef.current) {
      return;
    }

    const shouldReconnect =
      state.settings.startupMode === "drive" &&
      isOnline &&
      !state.sync.isAuthorized &&
      state.settings.googleClientId.trim().length > 0;

    if (!shouldReconnect) {
      return;
    }

    autoReconnectAttemptedRef.current = true;
    dispatch({
      type: "set-sync",
      payload: {
        mode: "syncing",
        statusMessage: "Google Drive に再接続しています。"
      }
    });

    void requestDriveAccessToken(state.settings.googleClientId, "")
      .then(() => {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "online",
            isAuthorized: true,
            statusMessage: ""
          }
        });
      })
      .catch(() => {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            isAuthorized: false,
            statusMessage: "Google Drive に再接続できませんでした。"
          }
        });
      });
  }, [isOnline, state.isHydrated, state.settings.googleClientId, state.settings.startupMode, state.sync.isAuthorized]);

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
    if (!state.isHydrated || state.sync.mode === "syncing") {
      return;
    }

    const nextMode: SyncMode = isOnline ? (state.sync.isAuthorized ? "online" : "offline") : "offline";
    if (state.sync.mode !== nextMode) {
      dispatch({
        type: "set-sync",
        payload: {
          mode: nextMode,
          statusMessage: nextMode === "offline" ? state.sync.statusMessage : ""
        }
      });
    }
  }, [isOnline, state.isHydrated, state.sync.isAuthorized, state.sync.mode, state.sync.statusMessage]);

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

  useEffect(() => {
    if (!state.isHydrated || !isOnline || !state.sync.isAuthorized || state.settings.startupMode !== "drive") {
      return;
    }

    if (state.sync.unsyncedCount <= 0 || state.sync.mode === "syncing") {
      return;
    }

    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(() => {
      autoSyncTimerRef.current = null;
      void runSync().catch(() => undefined);
    }, 1200);

    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [isOnline, state.isHydrated, state.settings.startupMode, state.sync.isAuthorized, state.sync.mode, state.sync.unsyncedCount]);

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
      setStartupMode(mode) {
        dispatch({ type: "update-settings", payload: { startupMode: mode }, trackDirty: false });
      },
      async authorizeGoogleDrive() {
        dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Google に接続しています。" } });
        try {
          await requestDriveAccessToken(state.settings.googleClientId);
          dispatch({ type: "update-settings", payload: { startupMode: "drive" }, trackDirty: false });
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              isAuthorized: true,
              statusMessage: ""
            }
          });
        } catch (error) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              isAuthorized: false,
              statusMessage: error instanceof Error ? error.message : "Google 接続に失敗しました。"
            }
          });
          throw error;
        }
      },
      async syncToDrive() {
        await runSync();
      },
      async loadFromDrive() {
        await runLoadFromDrive();
      },
      signOutDrive() {
        revokeDriveAccess();
        dispatch({ type: "update-settings", payload: { startupMode: "unset" }, trackDirty: false });
        dispatch({
          type: "set-sync",
          payload: {
            mode: navigator.onLine ? "online" : "offline",
            isAuthorized: false,
            statusMessage: "Google 連携を解除しました。"
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
