import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, User } from "../services/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedRegistration: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedRegistration, setHasCompletedRegistration] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        const response = await authApi.getUser();
        setUser(response.user);
        setHasCompletedRegistration(response.hasCompletedRegistration);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    await AsyncStorage.setItem("auth_token", token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user");
      setUser(null);
      setHasCompletedRegistration(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getUser();
      setUser(response.user);
      setHasCompletedRegistration(response.hasCompletedRegistration);
    } catch (error) {
      console.error("Refresh user failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasCompletedRegistration,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
