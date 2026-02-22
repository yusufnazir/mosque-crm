'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AppNameContextType {
  appName: string;
  setAppName: (name: string) => void;
  refreshAppName: () => Promise<void>;
}

const AppNameContext = createContext<AppNameContextType>({
  appName: 'MemberFlow',
  setAppName: () => {},
  refreshAppName: async () => {},
});

async function loadAppName(): Promise<string> {
  try {
    const response = await fetch('/api/configurations/APP_NAME');
    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        return data.value;
      }
    }
  } catch {
    // Keep default
  }
  return 'MemberFlow';
}

export function AppNameProvider({ children }: { children: React.ReactNode }) {
  const [appName, setAppNameState] = useState('MemberFlow');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadAppName().then(setAppNameState);
    }
  }, []);

  // Keep browser tab title in sync with app name
  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const refreshAppName = async () => {
    const name = await loadAppName();
    setAppNameState(name);
  };

  const setAppName = (name: string) => {
    setAppNameState(name);
  };

  return (
    <AppNameContext.Provider value={{ appName, setAppName, refreshAppName }}>
      {children}
    </AppNameContext.Provider>
  );
}

export function useAppName() {
  return useContext(AppNameContext);
}
