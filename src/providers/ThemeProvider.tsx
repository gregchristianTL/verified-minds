"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 *
 */
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 *
 * @param root0
 * @param root0.children
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
