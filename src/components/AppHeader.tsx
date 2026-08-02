import type { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  rightSlot?: ReactNode;
};

export function AppHeader({ title, rightSlot }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand" aria-label={title}>
        <h1>{title}</h1>
      </div>
      {rightSlot ? <div className="app-header__slot">{rightSlot}</div> : null}
    </header>
  );
}
