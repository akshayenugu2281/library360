import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type AuthResult, type Member, type RegistrationInput, type RegistrationResult } from "../api/client";
import { transferGuestSavedBooksToAccount } from "../lib/savedBooks";

export type Role = "ADMIN" | "LIBRARIAN" | "FACULTY" | "STUDENT";
export type MemberType = "STUDENT" | "FACULTY";

export interface User {
  id: number;
  email: string;
  fullName: string;
  roles: Role[];
  memberId?: number;
  memberCode?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, accountType: Role) => Promise<void>;
  signup: (input: RegistrationInput) => Promise<RegistrationResult>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const VALID_ROLES: Role[] = ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT"];

function readStoredUser(): User | null {
  try {
    const saved = localStorage.getItem("l360_user");
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<User>;
    if (typeof parsed.id !== "number" || typeof parsed.email !== "string" || !Array.isArray(parsed.roles)) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : parsed.email,
      roles: parsed.roles.filter((role): role is Role => typeof role === "string" && VALID_ROLES.includes(role as Role)),
      memberId: typeof parsed.memberId === "number" ? parsed.memberId : undefined,
      memberCode: typeof parsed.memberCode === "string" ? parsed.memberCode : undefined,
    };
  } catch {
    try { localStorage.removeItem("l360_user"); } catch { /* Storage may be disabled. */ }
    return null;
  }
}

function userFromAuth(result: AuthResult): User {
  const authorities = Array.isArray(result.user?.authorities) ? result.user.authorities : [];
  const roles = authorities
    .filter((authority) => authority.startsWith("ROLE_"))
    .map((authority) => authority.slice("ROLE_".length))
    .filter((role): role is Role => VALID_ROLES.includes(role as Role));
  return {
    id: result.user.id,
    email: result.user.email,
    fullName: result.user.name || result.user.fullName || result.user.email,
    roles,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem("l360_token"); } catch { return null; }
  });

  const applyAuth = useCallback(async (result: AuthResult) => {
    localStorage.setItem("l360_token", result.accessToken);
    setToken(result.accessToken);
    let nextUser = userFromAuth(result);
    try {
      const member: Member = await api.request<Member>("/members/me");
      nextUser = { ...nextUser, memberId: member.id, memberCode: member.memberCode };
    } catch (error) {
      // Staff accounts do not have a member record; only ignore that expected case.
      if (nextUser.roles.includes("STUDENT") || nextUser.roles.includes("FACULTY")) {
        throw error;
      }
    }
    setUser(nextUser);
    localStorage.setItem("l360_user", JSON.stringify(nextUser));
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("l360_token");
    localStorage.removeItem("l360_user");
  }, []);

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const result = (event as CustomEvent<AuthResult>).detail;
      if (result?.accessToken) setToken(result.accessToken);
    };
    window.addEventListener("l360:token-refreshed", onRefresh);
    window.addEventListener("l360:session-expired", clearSession);
    return () => {
      window.removeEventListener("l360:token-refreshed", onRefresh);
      window.removeEventListener("l360:session-expired", clearSession);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string, accountType: Role) => {
    const result = await api.login(email, password, accountType);
    try {
      await applyAuth(result);
      const signedInUser = readStoredUser();
      if (signedInUser) {
        try { transferGuestSavedBooksToAccount(signedInUser.id); } catch { /* Sign-in should succeed even when reading-list storage is restricted. */ }
      }
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [applyAuth, clearSession]);

  const signup = useCallback(async (input: RegistrationInput) => {
    // New registrations must wait for admin/librarian verification; never auto-login a pending account.
    return api.registerAccount(input);
  }, []);

  const logout = useCallback(() => {
    // Clear local access immediately even if the network is unavailable.
    clearSession();
    void api.logout().catch(() => undefined);
  }, [clearSession]);

  const hasRole = useCallback((role: Role) => user?.roles.includes(role) ?? false, [user]);
  const value = useMemo(() => ({
    user,
    token,
    login,
    signup,
    logout,
    isAuthenticated: Boolean(user && token),
    hasRole,
  }), [user, token, login, signup, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
