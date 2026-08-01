import type { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  rightSlot?: ReactNode;
};

export function AppHeader({ title, rightSlot }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Study</p>
        <h1>{title}</h1>
      </div>
      {rightSlot}
    </header>
  );
}
