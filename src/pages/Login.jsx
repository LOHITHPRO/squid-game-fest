import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import config from "../eventConfig.json";

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [eventPass, setEventPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");

    const eMail = normalizeEmail(email);
    const venuePass = (eventPass || "").trim();

    if (!eMail) return setErr("Enter your email.");
    if (!venuePass) return setErr("Enter the event password.");

    // ✅ extra gate: must match the configured event password
    if (venuePass !== import.meta.env.VITE_EVENT_PASSWORD) {
      return setErr("Wrong event password.");
    }

    setLoading(true);
    try {
      // We use the common event password as the Firebase auth password too:
      // - If user already exists -> sign in
      // - Else -> create account
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, eMail, venuePass);
      } catch (signInErr) {
        // Create account on first login (no public signup UI; still controlled by event password gate)
        cred = await createUserWithEmailAndPassword(auth, eMail, venuePass);
      }

      const uid = cred.user.uid;
      const isAdmin = config.adminEmails.map(normalizeEmail).includes(eMail);

      // create/update participant profile
      const ref = doc(db, "participants", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: eMail,
          createdAt: serverTimestamp(),
          isAdmin,
          totalScore: 0,
          round2Qualified: false,

          // Round 2
          selectedShape: null,
          shapeLocked: false,

          // Round 4
          glassStep: 0,
          glassChoices: [] // array of { step, choice: "safe"|"risky", link }
        });
      } else if (isAdmin && snap.data()?.isAdmin !== true) {
        // If you add someone to adminEmails later
        await setDoc(ref, { isAdmin: true }, { merge: true });
      }

      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (ex) {
      setErr(ex?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">{config.eventName}</h1>
        <p className="muted">Login using your personal email + event password (given at venue).</p>

        <form onSubmit={handleLogin} className="form">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />

          <label>Event Password</label>
          <input value={eventPass} onChange={(e) => setEventPass(e.target.value)} type="password" placeholder="Given at venue" />

          {err && <div className="error">{err}</div>}

          <button className="btn" disabled={loading}>
            {loading ? "Please wait..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
