
"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

type RoleSimulatorContextType = {
  simulatedRole: string | null;
  setSimulatedRole: (role: string | null) => void;
};

const RoleSimulatorContext = createContext<RoleSimulatorContextType | undefined>(undefined);

export const RoleSimulatorProvider = ({ children }: { children: ReactNode }) => {
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

  return (
    <RoleSimulatorContext.Provider value={{ simulatedRole, setSimulatedRole }}>
      {children}
    </RoleSimulatorContext.Provider>
  );
};

export const useRoleSimulator = () => {
  const context = useContext(RoleSimulatorContext);
  if (context === undefined) {
    throw new Error('useRoleSimulator must be used within a RoleSimulatorProvider');
  }
  return context;
};
