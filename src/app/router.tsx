import { NavLink, Route, Routes } from "react-router-dom";
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
  { to: "/", label: "ホーム" },
  { to: "/create", label: "追加" },
  { to: "/questions", label: "一覧" },
  { to: "/review", label: "復習" },
  { to: "/settings", label: "設定" }
];

export function AppRoutes() {
  const { state } = useAppContext();

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
    <div className="app-shell">
      <AppHeader title="Study Review" rightSlot={<SyncBadge state={state.sync} />} />
      <StatusBanner state={state.sync} />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<QuestionCreatePage />} />
          <Route path="/questions" element={<QuestionListPage />} />
          <Route path="/questions/:id" element={<QuestionEditPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Main Navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "bottom-nav__link is-active" : "bottom-nav__link")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
