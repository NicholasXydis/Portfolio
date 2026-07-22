import { Navigate, Route, Routes } from "react-router-dom";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { HomePage } from "@/routes/HomePage";
import { ProjectDetailPage } from "@/routes/ProjectDetailPage";
import { NotFoundPage } from "@/routes/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={localizedPath(DEFAULT_LOCALE)} replace />}
      />
      <Route path="/:locale" element={<LocaleLayout />}>
        <Route index element={<HomePage />} />
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
