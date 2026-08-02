import type { ReactNode } from "react";

type AppIconName =
  | "home"
  | "add"
  | "library"
  | "review"
  | "settings"
  | "drive"
  | "offline"
  | "search"
  | "tag"
  | "image"
  | "text"
  | "check"
  | "note"
  | "chart"
  | "folder"
  | "clock"
  | "star"
  | "archive"
  | "close";

type AppIconProps = {
  name: AppIconName;
  className?: string;
};

const iconPaths: Record<AppIconName, ReactNode> = {
  home: <path d="M3 11.5L12 4l9 7.5M6.5 10.5V20h11v-9.5" />,
  add: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  library: (
    <>
      <path d="M5 6.5h14" />
      <path d="M5 12h14" />
      <path d="M5 17.5h14" />
    </>
  ),
  review: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h8" />
      <path d="M16 7h4" />
      <circle cx="14" cy="7" r="2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  drive: (
    <>
      <path d="M9 4h6l5 8-3 5H7l-3-5 5-8z" />
      <path d="M9 4l5 8" />
      <path d="M4 12h16" />
    </>
  ),
  offline: (
    <>
      <path d="M4.5 8.5A10 10 0 0 1 19.5 8.5" />
      <path d="M7.5 11.5a6 6 0 0 1 9 0" />
      <path d="M10.5 14.5a2 2 0 0 1 3 0" />
      <path d="M5 5l14 14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  tag: (
    <>
      <path d="M11 4H5v6l8 8 6-6-8-8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20 15l-4.5-4.5L8 18" />
    </>
  ),
  text: (
    <>
      <path d="M5 7h14" />
      <path d="M8 7v10" />
      <path d="M16 7v10" />
      <path d="M10 17h4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12l2.3 2.4L15.5 9.8" />
    </>
  ),
  note: (
    <>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  chart: (
    <>
      <path d="M5 18V9" />
      <path d="M12 18V6" />
      <path d="M19 18v-4" />
    </>
  ),
  folder: (
    <>
      <path d="M4 8h6l2 2h8v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 8V6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </>
  ),
  star: <path d="M12 4.8l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 10l5-.7z" />,
  archive: (
    <>
      <rect x="4" y="5" width="16" height="4" rx="1" />
      <path d="M6 9h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M10 13h4" />
    </>
  ),
  close: (
    <>
      <path d="M7 7l10 10" />
      <path d="M17 7L7 17" />
    </>
  )
};

export function AppIcon({ name, className }: AppIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}
