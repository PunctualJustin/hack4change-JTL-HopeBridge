// src/contexts/AuthContext.tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { getUser } from '../api/user.ts'
import type { User } from '../api/user.ts'

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // In a real app, this state would be managed more robustly (e.g., using local storage or a backend call)
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = async (username:string, password:string) => {
    await getUser(username,password).then(setUser).catch(console.error);
    navigate('/dashboard', { replace: true }); 
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
