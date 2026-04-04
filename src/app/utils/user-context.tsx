/**
 * Helper context pour gérer l'utilisateur actuel et simplifier le logging des actions
 */
import React from "react";
import { api } from "./api";

interface UserContextType {
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
  logAction: (type: string, description: string, details?: string) => Promise<void>;
}

const UserContext = React.createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);

  const logAction = React.useCallback(
    async (type: string, description: string, details?: string) => {
      if (!currentUser) return;
      
      await api.logAction({
        type,
        description,
        details,
        userId: currentUser.id,
        userName: currentUser.nom,
      });
    },
    [currentUser]
  );

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, logAction }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
