// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import config from "../eventConfig.json";
import { Page, GlassCard, Banner, Btn, Pill } from "../components/UX";

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

    if (venuePass !== import.meta.env.VITE_EVENT_PASSWORD) {
      return setErr("Wrong event password.");
    }

    const adminEmails = (config.adminEmails || []).map(normalizeEmail);
    const participantEmails =
      (config.participantEmails || config.allowedEmails || []).map(normalizeEmail);
    const allowedEmails = new Set([...adminEmails, ...participantEmails]);

    if (!allowedEmails.has(eMail)) {
      return setErr("This email is not registered for this event.");
    }

    setLoading(true);
    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, eMail, venuePass);
      } catch {
        cred = await createUserWithEmailAndPassword(auth, eMail, venuePass);
      }

      const uid = cred.user.uid;
      const isAdmin =
        (config.adminEmails || []).map(normalizeEmail).includes(eMail);

      const ref = doc(db, "participants", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          email: eMail,
          createdAt: serverTimestamp(),
          isAdmin: !!isAdmin,

          totalScore: 0,

          // round gating
          round2Completed: false,

          // round 2
          selectedShape: null,
          shapeLocked: false,

          // round 4
          glassStep: 0,
          glassChoices: [],
        });
      }

      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (ex) {
      setErr(ex?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title={config.eventName}
      subtitle="Login with your personal email + the event password given at the venue."
      right={
        <>
          <Pill tone="pink">Code • Think • Survive</Pill>
          <Pill tone="green">Squid Theme</Pill>
        </>
      }
    >
      <div className="grid2">
        <GlassCard
          title="Player Entry"
          subtitle="Use one email per participant/team. Keep this tab open during the event."
        >
          <Banner
            mode="idle"
            title="Rules"
            detail="Green Light shows a form link. Red Light closes it. Shape is one-time lock. No second chances."
          />

          <form onSubmit={handleLogin} className="field" style={{ marginTop: 14 }}>
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
            />

            <label>Event Password</label>
            <input
              value={eventPass}
              onChange={(e) => setEventPass(e.target.value)}
              type="password"
              placeholder="Given at venue"
            />

            {err ? <div className="err">{err}</div> : null}

            <div className="row">
              <Btn disabled={loading}>
                {loading ? "Entering..." : "Enter the Game"}
              </Btn>
              <Btn
                type="button"
                variant="ghost"
                onClick={() => {
                  setEmail("");
                  setEventPass("");
                  setErr("");
                }}
              >
                Clear
              </Btn>
            </div>
          </form>
        </GlassCard>

        <GlassCard title="Event Info" subtitle="What happens after you login">
          <Banner mode="green" title="Round 1" detail="You will see one active Google Form when admin starts Green Light." />
          <div style={{ height: 10 }} />
          <Banner mode="lock" title="Round 2" detail="Hidden until admin switches stage to Round 2." />
          <div style={{ height: 10 }} />
          <Banner mode="lock" title="Round 3" detail="Hidden until admin switches stage to Round 3 + you are marked completed for Round 2." />
        </GlassCard>
      </div>
    </Page>
  );
}
