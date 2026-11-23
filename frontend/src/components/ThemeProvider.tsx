"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// System (default), Light and Dark, set as a class on <html>. next-themes keeps a
// copy of the choice under its own key, which its script reads before the page is drawn,
// so the first load never shows the wrong theme. The learner's choice itself is stored
// in copylekha.settings.

export const THEME_STORAGE_KEY = "copylekha.theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    storageKey={THEME_STORAGE_KEY}
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
