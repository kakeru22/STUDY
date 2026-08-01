import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { StatusBanner } from "../components/StatusBanner";
import { SyncBadge } from "../components/SyncBadge";
import { useAppContext } from "../contexts/AppContext";
import { HomePage } from "../pages/HomePage";
import { QuestionCreatePage } from "../pages/QuestionCreatePage";
import { QuestionEditPage } from "../pages/QuestionEditPage";
import { QuestionListPage } from "../pages/QuestionListPage";
import { ReviewPage } from "../pages/ReviewPage";
import { SettingsPage } from "../pages/SettingsPage";

const navItems = [
  { to: "/", label: "⌂", ariaLabel: "ホーム" },
  { to: "/create", label: "+", ariaLabel: "追加" },
  { to: "/questions", label: "≣", ariaLabel: "一覧" },
  { to: "/review", label: "◉", ariaLabel: "復習" },
  { to: "/settings", label: "⚙", ariaLabel: "設定" }
];

export function AppRoutes() {
  const { state } = useAppContext();
  const location = useLocation();
  const isReviewFlow = location.pathname === "/review/session" || location.pathname === "/review/result";

  if (!state.isHydrated) {
    return (
      <div className="app-shell">
        <AppHeader title="Study Review" rightSlot={<SyncBadge state={state.sync} />} />
        <main className="page-content">
          <section className="panel">
            <p className="section-title">Loading</p>
            <p>ローカルデータを読み込んでいます。</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={isReviewFlow ? "app-shell app-shell--immersive" : "app-shell"}>
      <AppHeader title="Study Review" rightSlot={<SyncBadge state={state.sync} />} />
      {!isReviewFlow ? <StatusBanner state={state.sync} /> : null}
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
              <span className="bottom-nav__icon" aria-hidden="true">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
