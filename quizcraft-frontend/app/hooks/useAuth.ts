import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";

export interface AuthUser {
  id: number;
  email: string;
  role: "admin" | "coordinator" | "participant";
}

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("quizcraft_user");
    const storedToken = localStorage.getItem("quizcraft_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("quizcraft_token");
    localStorage.removeItem("quizcraft_user");
    setUser(null);
    setToken(null);
    navigate("/auth/login");
  };

  return {
    user,
    token,
    loading,
    isLoggedIn: !!user && !!token,
    logout,
  };
}
