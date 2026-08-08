import type { PersistedState } from "../../types/app";
import { deleteValue, getValue, setValue } from "../storage/indexedDbClient";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
            }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_SCRIPT_ID = "google-gsi-client";
const DRIVE_AUTH_SESSION_KEY = "drive-auth-session";
const EXPIRY_BUFFER_MS = 60_000;
const SNAPSHOT_FOLDER_NAME = "_snapshots";
const SNAPSHOT_FILE_PREFIX = "snapshot-";
const SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const SNAPSHOT_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

type GoogleAuthSession = {
  accessToken: string | null;
  expiresAt: number | null;
};

type PersistedDriveAuthSession = {
  accessToken: string;
  expiresAt: number;
};

type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
};

const session: GoogleAuthSession = {
  accessToken: null,
  expiresAt: null
};

function isSessionValid(accessToken: string | null, expiresAt: number | null) {
  return Boolean(accessToken && expiresAt && expiresAt > Date.now() + EXPIRY_BUFFER_MS);
}

async function persistSession() {
  if (!isSessionValid(session.accessToken, session.expiresAt)) {
    await deleteValue(DRIVE_AUTH_SESSION_KEY);
    return;
  }

  await setValue<PersistedDriveAuthSession>(DRIVE_AUTH_SESSION_KEY, {
    accessToken: session.accessToken!,
    expiresAt: session.expiresAt!
  });
}

async function clearPersistedSession() {
  session.accessToken = null;
  session.expiresAt = null;
  await deleteValue(DRIVE_AUTH_SESSION_KEY);
}

export async function hydrateDriveAccessFromStorage() {
  const stored = await getValue<PersistedDriveAuthSession>(DRIVE_AUTH_SESSION_KEY);

  if (!stored || !isSessionValid(stored.accessToken, stored.expiresAt)) {
    await clearPersistedSession();
    return false;
  }

  session.accessToken = stored.accessToken;
  session.expiresAt = stored.expiresAt;
  return true;
}

export function hasDriveAccessToken() {
  return isSessionValid(session.accessToken, session.expiresAt);
}

async function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  if (document.getElementById(GOOGLE_SCRIPT_ID)) {
    await waitForGoogle();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services の読み込みに失敗しました。"));
    document.head.appendChild(script);
  });

  await waitForGoogle();
}

function waitForGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 10000) {
        window.clearInterval(timer);
        reject(new Error("Google Identity Services の起動がタイムアウトしました。"));
      }
    }, 100);
  });
}

export async function requestDriveAccessToken(clientId: string, prompt: "" | "consent" = "consent"): Promise<string> {
  if (!clientId.trim()) {
    throw new Error("Google Client ID が未設定です。");
  }

  if (hasDriveAccessToken()) {
    return session.accessToken!;
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google ログインに失敗しました。"));
          return;
        }

        session.accessToken = response.access_token;
        session.expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
        await persistSession();
        resolve(response.access_token);
      }
    });

    tokenClient.requestAccessToken({ prompt: session.accessToken ? "" : prompt });
  });
}

export function revokeDriveAccess() {
  const token = session.accessToken;
  void clearPersistedSession();

  if (!token || !window.google?.accounts?.oauth2) {
    return;
  }

  window.google.accounts.oauth2.revoke(token, () => undefined);
}

function getAccessToken() {
  if (!hasDriveAccessToken()) {
    session.accessToken = null;
    session.expiresAt = null;
    void deleteValue(DRIVE_AUTH_SESSION_KEY);
    throw new Error("Google Drive 連携が未認証です。");
  }

  return session.accessToken!;
}

async function driveFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive API error: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

async function findFolderByName(folderName: string, parentId?: string): Promise<DriveFile | null> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false${parentClause}`
  );
  const response = await driveFetch<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
  );
  return response.files[0] ?? null;
}

async function createFolder(folderName: string, parentId?: string): Promise<DriveFile> {
  return driveFetch<DriveFile>("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined
    })
  });
}

async function ensureFolder(folderName: string, parentId?: string): Promise<DriveFile> {
  const existing = await findFolderByName(folderName, parentId);
  if (existing) {
    return existing;
  }
  return createFolder(folderName, parentId);
}

async function findFileInFolder(folderId: string, fileName: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`);
  const response = await driveFetch<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
  );
  return response.files[0] ?? null;
}

async function listFilesInFolder(folderId: string, namePrefix?: string): Promise<DriveFile[]> {
  const prefixClause = namePrefix ? ` and name contains '${namePrefix.replace(/'/g, "\\'")}'` : "";
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false${prefixClause}`);
  const response = await driveFetch<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`
  );
  return response.files;
}

async function deleteDriveFile(fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive delete error: ${response.status} ${text}`);
  }
}

async function uploadJsonFile(folderId: string, fileName: string, payload: unknown) {
  const existing = await findFileInFolder(folderId, fileName);
  const metadata = {
    name: fileName,
    mimeType: "application/json",
    parents: existing ? undefined : [folderId]
  };

  const boundary = "studyreviewappboundary";
  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(payload, null, 2),
    `--${boundary}--`
  ].join("\r\n");

  const baseUrl = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const method = existing ? "PATCH" : "POST";

  return driveFetch<DriveFile>(baseUrl, {
    method,
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
}

async function createSnapshotIfNeeded(rootFolderId: string, state: PersistedState) {
  const snapshotFolder = await ensureFolder(SNAPSHOT_FOLDER_NAME, rootFolderId);
  const existingSnapshots = await listFilesInFolder(snapshotFolder.id, SNAPSHOT_FILE_PREFIX);

  const latestSnapshot = existingSnapshots[0];
  const latestSnapshotAt = latestSnapshot?.modifiedTime ? new Date(latestSnapshot.modifiedTime).getTime() : 0;
  const shouldCreateSnapshot = !latestSnapshotAt || Date.now() - latestSnapshotAt >= SNAPSHOT_MIN_INTERVAL_MS;

  if (shouldCreateSnapshot) {
    const snapshotName = `${SNAPSHOT_FILE_PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await uploadJsonFile(snapshotFolder.id, snapshotName, state);
  }

  const retentionThreshold = Date.now() - SNAPSHOT_RETENTION_MS;
  const expiredSnapshots = existingSnapshots.filter((file) => {
    if (!file.modifiedTime) {
      return false;
    }
    return new Date(file.modifiedTime).getTime() < retentionThreshold;
  });

  if (expiredSnapshots.length > 0) {
    await Promise.all(expiredSnapshots.map((file) => deleteDriveFile(file.id)));
  }
}

async function downloadJsonFile<T>(folderId: string, fileName: string): Promise<T | null> {
  const file = await findFileInFolder(folderId, fileName);
  if (!file) {
    return null;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    throw new Error(`Drive download error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function pushSnapshotToDrive(state: PersistedState, folderName: string) {
  const folder = await ensureFolder(folderName);

  await Promise.all([
    uploadJsonFile(folder.id, "questions.json", state.questions),
    uploadJsonFile(folder.id, "progress.json", state.progress),
    uploadJsonFile(folder.id, "settings.json", state.settings)
  ]);

  await createSnapshotIfNeeded(folder.id, state);

  return folder.id;
}

export async function pullSnapshotFromDrive(folderName: string): Promise<{
  folderId: string;
  state: Partial<PersistedState>;
}> {
  const folder = await ensureFolder(folderName);

  const [questions, progress, settings] = await Promise.all([
    downloadJsonFile<PersistedState["questions"]>(folder.id, "questions.json"),
    downloadJsonFile<PersistedState["progress"]>(folder.id, "progress.json"),
    downloadJsonFile<PersistedState["settings"]>(folder.id, "settings.json")
  ]);

  return {
    folderId: folder.id,
    state: {
      questions: questions ?? undefined,
      progress: progress ?? undefined,
      settings: settings ?? undefined
    }
  };
}
