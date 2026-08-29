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
import { SyncConflictModal } from "../components/SyncConflictModal";
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

type PendingSyncConflict = {
  localState: PersistedState;
  remoteState: PersistedState;
  remoteModifiedAt: string | null;
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

function normalizeComparableState(state: PersistedState) {
  return {
    questions: state.questions,
    progress: Object.fromEntries(Object.entries(state.progress).sort(([a], [b]) => a.localeCompare(b)))
  };
}

function statesDiffer(localState: PersistedState, remoteState: PersistedState) {
  return JSON.stringify(normalizeComparableState(localState)) !== JSON.stringify(normalizeComparableState(remoteState));
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

function mergeDriveState(
  baseState: PersistedState,
  driveState: Partial<PersistedState>,
  folderId: string,
  hasSnapshot: boolean,
  settingsPatch: Partial<AppSettings> = {}
): PersistedState {
  return {
    questions: driveState.questions ?? baseState.questions,
    progress: driveState.progress ?? baseState.progress,
    settings: {
      ...baseState.settings,
      ...settingsPatch,
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isLaunching, setIsLaunching] = useState(true);
  const [isTemporaryOfflineAccess, setIsTemporaryOfflineAccess] = useState(false);
  const [hasBootstrappedDriveSession, setHasBootstrappedDriveSession] = useState(false);
  const [pendingSyncConflict, setPendingSyncConflict] = useState<PendingSyncConflict | null>(null);
  const isFirstSave = useRef(true);
  const autoSyncTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  function openSyncConflict(localState: PersistedState, remoteState: PersistedState, remoteModifiedAt: string | null) {
    setPendingSyncConflict({ localState, remoteState, remoteModifiedAt });
    dispatch({
      type: "set-sync",
      payload: {
        mode: "conflict",
        isAuthorized: true,
        statusMessage: "ローカルとクラウドの内容が一致しません。どちらに合わせるか選んでください。"
      }
    });
  }

  async function runSync(snapshot = toPersistedState(stateRef.current), options?: { skipConflictCheck?: boolean }) {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive に同期しています..." } });

    try {
      if (!options?.skipConflictCheck) {
        const remoteStatus = await getDriveSnapshotStatus(snapshot.settings.driveFolderName);
        if (remoteStatus.hasSnapshot) {
          const remoteResult = await pullSnapshotFromDrive(snapshot.settings.driveFolderName);
          const remoteState = mergeDriveState(snapshot, remoteResult.state, remoteResult.folderId, remoteResult.hasSnapshot, {
            startupMode: snapshot.settings.startupMode,
            googleClientId: snapshot.settings.googleClientId,
            driveFolderName: snapshot.settings.driveFolderName
          });

          if (statesDiffer(snapshot, remoteState)) {
            openSyncConflict(snapshot, remoteState, remoteStatus.latestModifiedAt);
            return;
          }
        }
      }

      const folderId = await pushSnapshotToDrive(snapshot, snapshot.settings.driveFolderName);
      setPendingSyncConflict(null);
      setHasBootstrappedDriveSession(true);
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

  async function runLoadFromDrive(settingsPatch: Partial<AppSettings> = {}, options?: { skipConflictCheck?: boolean }) {
    dispatch({ type: "set-sync", payload: { mode: "syncing", statusMessage: "Drive から読み込んでいます..." } });

    try {
      const currentState = stateRef.current;
      const effectiveSettings = {
        ...currentState.settings,
        ...settingsPatch
      };
      const remoteStatus = await getDriveSnapshotStatus(effectiveSettings.driveFolderName);
      const result = await pullSnapshotFromDrive(effectiveSettings.driveFolderName);
      const remoteState = mergeDriveState(currentState, result.state, result.folderId, result.hasSnapshot, settingsPatch);

      if (!options?.skipConflictCheck && remoteStatus.hasSnapshot && statesDiffer(currentState, remoteState)) {
        openSyncConflict(currentState, remoteState, remoteStatus.latestModifiedAt);
        return;
      }

      setPendingSyncConflict(null);
      setHasBootstrappedDriveSession(true);
      dispatch({
        type: "replace-state",
        payload: remoteState
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

  async function resolveSyncConflict(target: "local" | "cloud") {
    if (!pendingSyncConflict) {
      return;
    }

    const conflict = pendingSyncConflict;
    setPendingSyncConflict(null);

    if (target === "local") {
      await runSync(conflict.localState, { skipConflictCheck: true });
      return;
    }

    setHasBootstrappedDriveSession(true);
    dispatch({
      type: "replace-state",
      payload: {
        ...conflict.remoteState,
        sync: {
          ...conflict.remoteState.sync,
          mode: navigator.onLine ? "online" : "offline",
          unsyncedCount: 0,
          isAuthorized: true,
          statusMessage: ""
        }
      }
    });
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
          const remoteStatus = await getDriveSnapshotStatus(baseState.settings.driveFolderName);
          const result = await pullSnapshotFromDrive(baseState.settings.driveFolderName);
          if (cancelled) {
            return;
          }

          const remoteState = mergeDriveState(baseState, result.state, result.folderId, result.hasSnapshot);

          if (remoteStatus.hasSnapshot && statesDiffer(baseState, remoteState)) {
            openSyncConflict(baseState, remoteState, remoteStatus.latestModifiedAt);
            dispatch({
              type: "hydrate",
              payload: {
                ...baseState,
                sync: {
                  ...baseState.sync,
                  mode: "conflict",
                  isAuthorized: true,
                  statusMessage: "ローカルとクラウドの内容が一致しません。どちらに合わせるか選んでください。"
                }
              }
            });
            return;
          }

          setPendingSyncConflict(null);
          setHasBootstrappedDriveSession(true);
          dispatch({
            type: "replace-state",
            payload: remoteState
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
    if (state.sync.mode !== nextMode && state.sync.mode !== "conflict") {
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
      pendingSyncConflict ||
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
    pendingSyncConflict,
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
          const nextSettings = { startupMode: "drive" as const };
          dispatch({ type: "update-settings", payload: nextSettings, trackDirty: false });
          await runLoadFromDrive(nextSettings);
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
        setPendingSyncConflict(null);
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

  return (
    <>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
      <SyncConflictModal
        conflict={pendingSyncConflict}
        onChooseCloud={() => {
          void resolveSyncConflict("cloud");
        }}
        onChooseLocal={() => {
          void resolveSyncConflict("local");
        }}
      />
    </>
  );
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("AppContext is not available.");
  }
  return value;
}
