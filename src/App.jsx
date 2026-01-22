import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import SchedulerPage from "./pages/SchedulerPage.jsx";

function getToken() {
  return localStorage.getItem("jwt") || "";
}

function RequireAuth({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const token = getToken();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? "/app" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <SchedulerPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
