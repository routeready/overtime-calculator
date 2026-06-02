import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { api } from "./api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Ask from "./pages/Ask";
import Admin from "./pages/Admin";
import Billing from "./pages/Billing";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    api.get("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/ask" replace />;
  return children;
}

function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post("/auth/logout");
    setUser(null);
    navigate("/login");
  }

  if (!user) return null;

  return (
    <nav style={{
      background: "var(--brand)",
      color: "#fff",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      height: 52,
      gap: 24,
    }}>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.02em" }}>
        ⛏ Mining Bible
      </span>
      <Link to="/ask" style={{ color: "#cbd5e1", fontSize: 14 }}>Ask</Link>
      <Link to="/billing" style={{ color: "#cbd5e1", fontSize: 14 }}>Billing</Link>
      {user.role === "admin" && (
        <Link to="/admin" style={{ color: "#cbd5e1", fontSize: 14 }}>Admin</Link>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{user.email}</span>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid #475569",
            color: "#cbd5e1",
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ask" element={<RequireAuth><Ask /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/" element={<Navigate to="/ask" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
