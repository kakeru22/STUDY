import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { AppIcon } from "../components/AppIcon";
import { SyncBadge } from "../components/SyncBadge";
import { useAppContext } from "../contexts/AppContext";
import { HomePage } from "../pages/HomePage";
import { QuestionCreatePage } from "../pages/QuestionCreatePage";
import { QuestionEditPage } from "../pages/QuestionEditPage";
import { QuestionListPage } from "../pages/QuestionListPage";
import { ReviewPage } from "../pages/ReviewPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SetupPage } from "../pages/SetupPage";
import { WelcomePage } from "../pages/WelcomePage";

const navItems = [
  { to: "/", icon: "home", ariaLabel: "ホーム" },
  { to: "/create", icon: "add", ariaLabel: "追加" },
  { to: "/questions", icon: "library", ariaLabel: "一覧" },
  { to: "/review", icon: "review", ariaLabel: "復習" },
  { to: "/settings", icon: "settings", ariaLabel: "設定" }
] as const;

function LoadingShell() {
  return (
    <div className="app-shell app-shell--loading">
      <AppHeader title="AnkiSoft" rightSlot={null} />
      <main className="page-content">
        <section className="panel loading-panel">
          <p className="section-title">Loading</p>
          <p>ローカルデータを読み込んでいます。</p>
        </section>
      </main>
    </div>
  );
}

function WelcomeShell() {
  const { state } = useAppContext();
  const target = state.settings.googleClientId.trim() ? "/welcome" : "/setup";

  return (
    <div className="app-shell app-shell--welcome">
      <AppHeader title="AnkiSoft" rightSlot={null} />
      <main className="page-content">
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="*" element={<Navigate to={target} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function MainShell() {
  const { state } = useAppContext();
  const location = useLocation();
  const isReviewFlow = location.pathname === "/review/session" || location.pathname === "/review/result";

  return (
    <div className={isReviewFlow ? "app-shell app-shell--immersive" : "app-shell"}>
      <AppHeader title="AnkiSoft" rightSlot={<SyncBadge state={state.sync} />} />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<QuestionCreatePage />} />
          <Route path="/questions" element={<QuestionListPage />} />
          <Route path="/questions/:id" element={<QuestionEditPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/session" element={<ReviewPage />} />
          <Route path="/review/result" element={<ReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/setup" element={<Navigate to="/" replace />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isReviewFlow ? (
        <nav className="bottom-nav" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "bottom-nav__link is-active" : "bottom-nav__link")}
              aria-label={item.ariaLabel}
              title={item.ariaLabel}
            >
              <AppIcon name={item.icon} className="bottom-nav__icon" />
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

export function AppRoutes() {
  const { state } = useAppContext();

  if (!state.isHydrated) {
    return <LoadingShell />;
  }

  if (state.settings.startupMode === "drive" && !state.sync.isAuthorized && state.sync.mode === "syncing") {
    return <LoadingShell />;
  }

  if ((!state.settings.googleClientId.trim() || !state.sync.isAuthorized) && state.settings.startupMode !== "offline") {
    return <WelcomeShell />;
  }

  return <MainShell />;
}
