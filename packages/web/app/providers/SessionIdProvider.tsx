import React, { createContext, ReactNode, useContext } from 'react';

const SessionIdContext = createContext<string | null>(null);

interface SessionIdProviderProps {
  value: string;
  children: ReactNode;
}

export const SessionIdProvider: React.FC<SessionIdProviderProps> = ({
  value,
  children,
}) => {
  return (
    <SessionIdContext.Provider value={value}>
      {children}
    </SessionIdContext.Provider>
  );
};

export const useSessionId = (): string => {
  const context = useContext(SessionIdContext);
  if (context === null) {
    throw new Error('useSessionId must be used within a SessionIdProvider');
  }
  return context;
};
