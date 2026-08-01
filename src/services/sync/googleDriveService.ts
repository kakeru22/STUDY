import type { PersistedState } from "../../types/app";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_SCRIPT_ID = "google-gsi-client";

type GoogleAuthSession = {
  accessToken: string | null;
};

const session: GoogleAuthSession = {
  accessToken: null
};

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
        reject(new Error("Google Identity Services の初期化がタイムアウトしました。"));
      }
    }, 100);
  });
}

export async function requestDriveAccessToken(clientId: string): Promise<string> {
  if (!clientId.trim()) {
    throw new Error("Google Client ID が未設定です。");
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google認証に失敗しました。"));
          return;
        }

        session.accessToken = response.access_token;
        resolve(response.access_token);
      }
    });

    tokenClient.requestAccessToken({ prompt: session.accessToken ? "" : "consent" });
  });
}

export function revokeDriveAccess() {
  if (!session.accessToken || !window.google?.accounts?.oauth2) {
    session.accessToken = null;
    return;
  }

  const token = session.accessToken;
  session.accessToken = null;
  window.google.accounts.oauth2.revoke(token, () => undefined);
}

function getAccessToken() {
  if (!session.accessToken) {
    throw new Error("Google Drive 連携が未認証です。");
  }
  return session.accessToken;
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

type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
};

async function findFolderByName(folderName: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`
  );
  const response = await driveFetch<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
  );
  return response.files[0] ?? null;
}

async function createFolder(folderName: string): Promise<DriveFile> {
  return driveFetch<DriveFile>("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder"
    })
  });
}

async function ensureFolder(folderName: string): Promise<DriveFile> {
  const existing = await findFolderByName(folderName);
  if (existing) {
    return existing;
  }
  return createFolder(folderName);
}

async function findFileInFolder(folderId: string, fileName: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`);
  const response = await driveFetch<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
  );
  return response.files[0] ?? null;
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

