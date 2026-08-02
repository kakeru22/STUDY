export type AppSettings = {
  autoSync: boolean;
  googleClientId: string;
  driveFolderName: string;
  driveFolderId: string | null;
  startupMode: "unset" | "offline" | "drive";
};
