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
import { calculateNextReviewDate } from "../services/review/reviewScheduler";
import { loadPersistedState, savePersistedState } from "../services/storage/appStateRepository";
import {
  getDriveSnapshotStatus,
  hasDriveAccessToken,
  hydrateDriveAccessFromStorage,
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
  isLaunching: boolean;
  isTemporaryOfflineAccess: boolean;
  addQuestion: (draft: QuestionDraft) => string;
  updateQuestion: (id: string, draft: QuestionDraft) => void;
  deleteQuestion: (id: string) => void;
  toggleStar: (questionId: string) => void;
  archiveQuestion: (questionId: string) => void;
  answerQuestion: (questionId: string, selectedChoiceId: string) => { correct: boolean; nextReviewAt: string };
  importSnapshot: (snapshot: PersistedState) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setStartupMode: (mode: AppSettings["startupMode"]) => void;
  enterOfflineMode: () => void;
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
  | { type: "delete-question"; payload: { id: string } }
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
    message.includes("Google Drive access is not authorized") ||
    message.includes("Google Drive") ||
    message.includes("Google Client ID") ||
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
        sync: markDirty(state.sync, "問題を追加しました。")
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
    case "delete-question": {
      const nextProgress = { ...state.progress };
      delete nextProgress[action.payload.id];

      return {
        ...state,
        questions: state.questions.filter((question) => question.id !== action.payload.id),
        progress: nextProgress,
        sync: markDirty(state.sync, "問題を削除しました。")
      };
    }
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
        sync: markDirty(state.sync, "スター設定を更新しました。")
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

function mergeDriveState(baseState: PersistedState, driveState: Partial<PersistedState>, folderId: string, hasSnapshot: boolean): PersistedState {
  return {
    questions: driveState.questions ?? baseState.questions,
    progress: driveState.progress ?? baseState.progress,
    settings: {
      ...baseState.settings,
      driveFolderId: folderId
    },
    sync: {
      ...baseState.sync,
      mode: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
      lastSyncedAt: new Date().toISOString(),
      unsyncedCount: hasSnapshot ? 0 : baseState.sync.unsyncedCount,
      isAuthorized: true,
      statusMessage: hasSnapshot ? "" : "Drive に既存データがないため、ローカルデータを使っています。"
    }
  };
}

function isRemoteNewerThanLocal(latestModifiedAt: string | null, lastSyncedAt: string | null) {
  if (!latestModifiedAt) {
    return false;
  }

  if (!lastSyncedAt) {
    return true;
  }

  return new Date(latestModifiedAt).getTime() > new Date(lastSyncedAt).getTime();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isLaunching, setIsLaunching] = useState(true);
  const [isTemporaryOfflineAccess, setIsTemporaryOfflineAccess] = useState(false);
  const [hasBootstrappedDriveSession, setHasBootstrappedDriveSession] = useState(false);
  const isFirstSave = useRef(true);
  const autoSyncTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  async function runSync(snapshot = toPersistedState(stateRef.current)) {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive に同期しています..." } });

    try {
      const remoteStatus = await getDriveSnapshotStatus(snapshot.settings.driveFolderName);
      const remoteIsNewer = isRemoteNewerThanLocal(remoteStatus.latestModifiedAt, snapshot.sync.lastSyncedAt);

      if (remoteStatus.hasSnapshot && remoteIsNewer && typeof window !== "undefined") {
        const confirmed = window.confirm("別の端末で更新されたデータがあります。この端末のデータでアップロードデータを上書きしますか？");
        if (!confirmed) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: "conflict",
              statusMessage: "Drive 側の更新を確認してください。"
            }
          });
          return;
        }
      }

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
        setHasBootstrappedDriveSession(false);
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            isAuthorized: false,
            statusMessage: "Google に再ログインしてください。"
          }
        });
      } else {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            statusMessage: "同期に失敗したため、オフラインモードへ切り替えました。"
          }
        });
      }
      throw error;
    }
  }

  async function runLoadFromDrive() {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive から読み込んでいます..." } });

    try {
      const currentState = stateRef.current;
      const remoteStatus = await getDriveSnapshotStatus(currentState.settings.driveFolderName);
      const remoteIsNewer = isRemoteNewerThanLocal(remoteStatus.latestModifiedAt, currentState.sync.lastSyncedAt);
      const shouldConfirmOverwriteLocal =
        remoteStatus.hasSnapshot && remoteIsNewer && currentState.sync.unsyncedCount > 0 && typeof window !== "undefined";

      if (shouldConfirmOverwriteLocal) {
        const confirmed = window.confirm("別の端末で更新されたデータがあります。アップロードデータでこの端末のデータを上書きしますか？");
        if (!confirmed) {
          dispatch({
            type: "set-sync",
            payload: {
              mode: "conflict",
              statusMessage: "この端末の変更を残しています。必要なら手動で同期してください。"
            }
          });
          return;
        }
      }

      const result = await pullSnapshotFromDrive(currentState.settings.driveFolderName);
      setHasBootstrappedDriveSession(true);
      dispatch({
        type: "replace-state",
        payload: mergeDriveState(currentState, result.state, result.folderId, result.hasSnapshot)
      });
    } catch (error) {
      if (isAuthorizationError(error)) {
        revokeDriveAccess();
        setHasBootstrappedDriveSession(false);
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            isAuthorized: false,
            statusMessage: "Google に再ログインしてください。"
          }
        });
      } else {
        dispatch({
          type: "set-sync",
          payload: {
            mode: "offline",
            statusMessage: "Drive の読み込みに失敗したため、ローカルデータを使います。"
          }
        });
      }
      throw error;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setHasBootstrappedDriveSession(false);
        const [persisted, canUseDriveSession] = await Promise.all([loadPersistedState(), hydrateDriveAccessFromStorage()]);
        if (cancelled) {
          return;
        }

        const shouldBootstrapFromDrive =
          typeof navigator !== "undefined" &&
          navigator.onLine &&
          persisted.settings.startupMode === "drive" &&
          canUseDriveSession;

        const baseState: PersistedState = {
          ...persisted,
          sync: {
            ...persisted.sync,
            isAuthorized: canUseDriveSession,
            mode: navigator.onLine ? (canUseDriveSession ? "online" : "offline") : "offline",
            statusMessage: canUseDriveSession ? "" : persisted.settings.startupMode === "drive" ? "Google に再ログインしてください。" : ""
          }
        };

        if (!shouldBootstrapFromDrive) {
          dispatch({ type: "hydrate", payload: baseState });
          return;
        }

        dispatch({
          type: "hydrate",
          payload: {
            ...baseState,
            sync: {
              ...baseState.sync,
              mode: "syncing",
              statusMessage: "Drive から最新データを確認しています。"
            }
          }
        });

        try {
          const result = await pullSnapshotFromDrive(baseState.settings.driveFolderName);
          if (cancelled) {
            return;
          }

          setHasBootstrappedDriveSession(true);
          dispatch({
            type: "replace-state",
            payload: mergeDriveState(baseState, result.state, result.folderId, result.hasSnapshot)
          });
        } catch (error) {
          if (cancelled) {
            return;
          }

          if (isAuthorizationError(error)) {
            revokeDriveAccess();
            setHasBootstrappedDriveSession(false);
            dispatch({
              type: "hydrate",
              payload: {
                ...baseState,
                sync: {
                  ...baseState.sync,
                  mode: "offline",
                  isAuthorized: false,
                  statusMessage: "Google に再ログインしてください。"
                }
              }
            });
          } else {
            dispatch({ type: "hydrate", payload: baseState });
            dispatch({
              type: "set-sync",
              payload: {
                mode: "offline",
                statusMessage: "Drive の確認に失敗したため、ローカルデータで起動しました。"
              }
            });
          }
        }
      } finally {
        if (!cancelled) {
          setIsLaunching(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
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

    if (
      !hasBootstrappedDriveSession ||
      state.sync.unsyncedCount <= 0 ||
      state.sync.mode === "syncing" ||
      state.sync.mode === "conflict" ||
      !hasDriveAccessToken()
    ) {
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
  }, [
    hasBootstrappedDriveSession,
    isOnline,
    state.isHydrated,
    state.settings.startupMode,
    state.sync.isAuthorized,
    state.sync.mode,
    state.sync.unsyncedCount
  ]);

  const value = useMemo<AppContextValue>(() => {
    return {
      state,
      isLaunching,
      isTemporaryOfflineAccess,
      addQuestion(draft) {
        const timestamp = new Date().toISOString();
        const id = `q_${Date.now()}`;
        dispatch({
          type: "add-question",
          payload: {
            ...draft,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
            archived: false
          }
        });
        return id;
      },
      updateQuestion(id, draft) {
        dispatch({ type: "update-question", payload: { id, draft } });
      },
      deleteQuestion(id) {
        dispatch({ type: "delete-question", payload: { id } });
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
      enterOfflineMode() {
        setIsTemporaryOfflineAccess(true);
      },
      async authorizeGoogleDrive() {
        setIsTemporaryOfflineAccess(false);
        dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Google にログインしています..." } });
        try {
          await requestDriveAccessToken(state.settings.googleClientId);
          dispatch({ type: "update-settings", payload: { startupMode: "drive" }, trackDirty: false });
          await runLoadFromDrive();
        } catch (error) {
          setHasBootstrappedDriveSession(false);
          dispatch({
            type: "set-sync",
            payload: {
              mode: navigator.onLine ? "online" : "offline",
              isAuthorized: false,
              statusMessage: error instanceof Error ? error.message : "Google ログインに失敗しました。"
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
        setIsTemporaryOfflineAccess(false);
        setHasBootstrappedDriveSession(false);
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
  }, [isLaunching, isTemporaryOfflineAccess, state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("AppContext is not available.");
  }
  return value;
}
