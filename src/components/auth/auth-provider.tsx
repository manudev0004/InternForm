"use client";

import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { useRouter } from "next/navigation";

// Define the auth context type
interface AuthContextType {
  user: { email: string; role: string } | null;
  login: (email: string, role: string) => void;
  logout: () => void;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

// AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for user data in local storage on component mount
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
          if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              switch (parsedUser.role) {
                  case 'admin':
                      router.push('/admin');
                      break;
                  case 'intern':
                      router.push('/intern');
                      break;
                  case 'guest':
                      router.push('/guest');
                      break;
                  default:
                      break;
              }
          }
    }
  }, [router]);

  const login = (email: string, role: string) => {
    const userData = { email, role };
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
      switch (role) {
          case 'admin':
              router.push('/admin');
              break;
          case 'intern':
              router.push('/intern');
              break;
          case 'guest':
              router.push('/guest');
              break;
          default:
              break;
      }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook to use AuthContext safely
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
