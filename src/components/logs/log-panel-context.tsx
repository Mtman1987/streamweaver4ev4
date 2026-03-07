'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

interface LogPanelContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

const LogPanelContext = createContext<LogPanelContextType | undefined>(undefined);

export function LogPanelProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setVisible] = useState(false);

  const addLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <LogPanelContext.Provider value={{ logs, addLog, clearLogs, isVisible, setVisible }}>
      {children}
    </LogPanelContext.Provider>
  );
}

export function useLogPanel() {
  const context = useContext(LogPanelContext);
  if (!context) {
    throw new Error('useLogPanel must be used within LogPanelProvider');
  }
  return context;
}