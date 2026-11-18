import { Navigate, Route, Routes } from "react-router";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { LandingPage } from "@/routes/LandingPage";
import { LitePage } from "@/routes/LitePage";
import { NotFoundPage } from "@/routes/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={localizedPath(DEFAULT_LOCALE)} replace />}
      />
      <Route path="/:locale">
        <Route element={<LocaleLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="lite" element={<LitePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
