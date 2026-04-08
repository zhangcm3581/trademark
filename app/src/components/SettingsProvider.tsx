'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PublicSettings {
  showPrice: boolean;
}

const SettingsContext = createContext<PublicSettings>({ showPrice: true });

export function SettingsProvider({
  value,
  children,
}: {
  value: PublicSettings;
  children: ReactNode;
}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function usePublicSettings(): PublicSettings {
  return useContext(SettingsContext);
}
