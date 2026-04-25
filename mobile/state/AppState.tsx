import { createContext, useContext, useState } from 'react';

type AppState = {
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  isFirstTime: boolean;
  setIsFirstTime: (v: boolean) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfileId, setSelectedProfileId] = useState('standard');
  const [isFirstTime, setIsFirstTime] = useState(false);
  return (
    <Ctx.Provider value={{ selectedProfileId, setSelectedProfileId, isFirstTime, setIsFirstTime }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
