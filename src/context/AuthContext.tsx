import React, { createContext, useContext, useEffect, useState } from "react";
import { ROUTES } from "../constants/routes";

export const TEAM_TOKEN_KEY = "team_token";
export const ADMIN_TOKEN_KEY = "admin_token";

interface AuthContextValue {
  teamToken: string | null;
  teamName: string | null;
  teamPassword: string | null;
  adminToken: string | null;
  loginTeam: (token: string, name: string, password: string) => void;
  loginAdmin: (token: string) => void;
  logoutTeam: () => void;
  logoutAdmin: () => void;
  isTeamAuthenticated: boolean;
  isAdminAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [teamToken, setTeamToken] = useState<string | null>(() =>
    sessionStorage.getItem(TEAM_TOKEN_KEY)
  );
  const [teamName, setTeamName] = useState<string | null>(() =>
    sessionStorage.getItem("TEAM_NAME")
  );
  const [teamPassword, setTeamPassword] = useState<string | null>(() =>
    sessionStorage.getItem("TEAM_PASSWORD")
  );
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    sessionStorage.getItem(ADMIN_TOKEN_KEY)
  );

  useEffect(() => {
    const handleExpired = (event: Event) => {
      const custom = event as CustomEvent<{ type?: "team" | "admin" }>;
      const type = custom.detail?.type;
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      if (type === "team") {
        setTeamToken(null);
        setTeamName(null);
        setTeamPassword(null);
        window.location.href = `${base}${ROUTES.LOGIN}?role=TEAM`;
      } else if (type === "admin") {
        setAdminToken(null);
        window.location.href = `${base}${ROUTES.LOGIN}?role=ADMIN`;
      }
    };

    window.addEventListener("auth:token-expired", handleExpired);
    return () => window.removeEventListener("auth:token-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (!teamToken) {
      sessionStorage.removeItem(TEAM_TOKEN_KEY);
      sessionStorage.removeItem("TEAM_NAME");
      sessionStorage.removeItem("TEAM_PASSWORD");
      setTeamName(null);
      setTeamPassword(null);
    }
  }, [teamToken]);

  const loginTeam = (token: string, name: string, password: string) => {
    sessionStorage.setItem(TEAM_TOKEN_KEY, token);
    sessionStorage.setItem("TEAM_NAME", name);
    sessionStorage.setItem("TEAM_PASSWORD", password);
    setTeamToken(token);
    setTeamName(name);
    setTeamPassword(password);
  };

  const loginAdmin = (token: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminToken(token);
  };

  const logoutTeam = () => {
    sessionStorage.removeItem(TEAM_TOKEN_KEY);
    sessionStorage.removeItem("TEAM_NAME");
    sessionStorage.removeItem("TEAM_PASSWORD");
    setTeamToken(null);
    setTeamName(null);
    setTeamPassword(null);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        teamToken,
        teamName,
        teamPassword,
        adminToken,
        loginTeam,
        loginAdmin,
        logoutTeam,
        logoutAdmin,
        isTeamAuthenticated: Boolean(teamToken),
        isAdminAuthenticated: Boolean(adminToken),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
