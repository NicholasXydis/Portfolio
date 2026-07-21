import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  path?: string;
  locale?: Locale;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route,
    path = "/:locale/*",
    locale = "en",
    ...options
  }: RenderWithProvidersOptions = {},
) {
  const initialRoute = route ?? `/${locale}`;
  void i18n.changeLanguage(locale);

  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
    options,
  );
}
