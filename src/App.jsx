// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import { FXBackground } from "./components/UX";

function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return <div className="centerTxt">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AdminOnly({ children }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const u = auth.currentUser;
      if (!u) {
        setAllowed(false);
        setReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "participants", u.uid));
        setAllowed(!!snap.data()?.isAdmin);
      } catch {
        setAllowed(false);
      } finally {
        setReady(true);
      }
    };
    run();
  }, []);

  if (!ready) return <div className="centerTxt">Loading...</div>;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <FXBackground />
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />

        <Route
          path="/admin"
          element={
            <Protected>
              <AdminOnly>
                <Admin />
              </AdminOnly>
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
