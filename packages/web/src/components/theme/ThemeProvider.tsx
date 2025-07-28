import React from 'react';

interface ThemeProviderProps {
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
} 