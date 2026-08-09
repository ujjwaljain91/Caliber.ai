"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authStep: "LOGIN" | "REGISTER" | "OTP";
  pendingUser: { name?: string; email?: string; role?: string } | null;
  justLoggedIn: boolean;
  openAuthModal: (step?: "LOGIN" | "REGISTER") => void;
  closeAuthModal: () => void;
  setAuthStep: (step: "LOGIN" | "REGISTER" | "OTP") => void;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, role: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<boolean>;
  logout: () => void;
  clearJustLoggedIn: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DUMMY_USER: User = {
  id: "USR-8821",
  name: "Alex Morgan",
  email: "alex.morgan@caliber.ai",
  role: "Lead Hiring Manager",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<"LOGIN" | "REGISTER" | "OTP">("LOGIN");
  const [pendingUser, setPendingUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    // Check localStorage for saved session
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("caliber_user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.removeItem("caliber_user");
        }
      }
    }
  }, []);

  function openAuthModal(step: "LOGIN" | "REGISTER" = "LOGIN") {
    setAuthStep(step);
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setPendingUser(null);
  }

  async function login(email: string) {
    setPendingUser({
      name: email.split("@")[0].replace(".", " ") || "Alex Morgan",
      email: email,
      role: "Hiring Manager",
    });
    setAuthStep("OTP");
    return true;
  }

  async function register(name: string, email: string, _pass: string, role: string) {
    setPendingUser({ name, email, role });
    setAuthStep("OTP");
    return true;
  }

  async function verifyOTP(otp: string) {
    // Accept 123456 or any 6-digit code for dummy auth
    if (otp.length === 6) {
      const newUser: User = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: pendingUser?.name || DUMMY_USER.name,
        email: pendingUser?.email || DUMMY_USER.email,
        role: pendingUser?.role || DUMMY_USER.role,
      };
      setUser(newUser);
      localStorage.setItem("caliber_user", JSON.stringify(newUser));
      setJustLoggedIn(true);
      closeAuthModal();
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("caliber_user");
    setJustLoggedIn(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  function clearJustLoggedIn() {
    setJustLoggedIn(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authStep,
        pendingUser,
        justLoggedIn,
        openAuthModal,
        closeAuthModal,
        setAuthStep,
        login,
        register,
        verifyOTP,
        logout,
        clearJustLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
