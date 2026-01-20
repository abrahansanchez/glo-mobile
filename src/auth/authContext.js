import { createContext, useEffect, useState } from "react";
import { getToken, saveToken, clearToken } from "./tokenStorage";
import api from "../config/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        setAuthenticated(true);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const token = response.data.token;
    await saveToken(token);
    setAuthenticated(true);
  };

  const logout = async () => {
    await clearToken();
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
