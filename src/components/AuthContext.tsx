"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface AuthUser {
  id: string;
  type: string;
  businessId: string;
  permissions: string[];
  name?: string;
  email?: string;
  role?: string;
  hiddenSidebarItems?: string[];
  sidebarOrder?: Record<string, string[]>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const fetchUser = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/user/me");
      const data = await res.json();
      if (res.ok) {
        setUser({
          ...data,
          type: data.role,
          permissions: data.allowedPaths || [],
          hiddenSidebarItems: data.hiddenSidebarItems || [],
          sidebarOrder: data.sidebarOrder || null
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("AuthContext Fetch Error:", err);
      setError("Failed to fetch user session");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Re-fetch user silently on navigation to catch permission changes instantly
  useEffect(() => {
    if (user) {
        fetchUser(true);
    }
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
