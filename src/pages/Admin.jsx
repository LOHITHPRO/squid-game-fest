// src/pages/Admin.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { Page, GlassCard, Banner, Btn, Pill } from "../components/UX";

export default function Admin() {
  const uid = auth.currentUser?.uid;

  const [me, setMe] = useState(null);
  const [eventState, setEventState] = useState(null);
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!uid) return;

    const unsubMe = onSnapshot(doc(db, "participants", uid), (snap) => {
      setMe(snap.data() || null);
    });

    const unsubState = onSnapshot(doc(db, "eventState", "current"), (snap) => {
      setEventState(snap.data() || null);
    });

    const q = query(collection(db, "participants"), orderBy("totalScore", "desc"));
    const unsubPeople = onSnapshot(q, (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubMe();
      unsubState();
      unsubPeople();
    };
  }, [uid]);

  const stage = useMemo(() => eventState?.stage ?? 1, [eventState]);

  if (!me || !eventState) return <div className="centerTxt">Loading admin...</div>;
  if (!me.isAdmin) return <div className="centerTxt">Access denied. Not admin.</div>;

  const setActiveForm = async (n) => updateDoc(doc(db, "eventState", "current"), { activeForm: n });
  const setStage = async (n) => updateDoc(doc(db, "eventState", "current"), { stage: n });
  const enableRound2 = async (v) => updateDoc(doc(db, "eventState", "current"), { round2Enabled: v });
  const enableRound4 = async (v) => updateDoc(doc(db, "eventState", "current"), { round4Enabled: v });

  const toggleRound2Completed = async (participantId, currentVal) => {
    await updateDoc(doc(db, "participants", participantId), { round2Completed: !currentVal });
  };

  const setScore = async (participantId, scoreVal) => {
    const score = Number(scoreVal);
    if (Number.isNaN(score)) return alert("Score must be a number");
    await updateDoc(doc(db, "participants", participantId), { totalScore: score });
  };

  return (
    <Page
      title="Admin Control Room"
      subtitle="Stage controls what players can see. Mark Round 2 completion to unlock Round 4 eligibility."
      right={
        <>
          <Pill tone="pink">ADMIN</Pill>
          <Pill tone="green">{me.email}</Pill>
          <Btn variant="ghost" onClick={() => signOut(auth)}>Logout</Btn>
        </>
      }
    >
      <div className="grid2">
        <GlassCard
          title="Round 1 Control — Red/Green Light"
          subtitle="Green Light shows a form link. Red Light hides it (you also close the form manually)."
        >
          {eventState.activeForm === 0 ? (
            <Banner mode="red" title="🔴 RED LIGHT" detail="No form link visible." />
          ) : (
            <Banner
              mode="green"
              title={`🟢 GREEN LIGHT — FORM ${eventState.activeForm}`}
              detail="Players can open the current form link."
            />
          )}

          <div className="row">
            <Btn variant="risk" onClick={() => setActiveForm(0)}>Red Light (Hide)</Btn>
            <Btn onClick={() => setActiveForm(1)}>Form 1</Btn>
            <Btn onClick={() => setActiveForm(2)}>Form 2</Btn>
            <Btn onClick={() => setActiveForm(3)}>Form 3</Btn>
            <Btn onClick={() => setActiveForm(4)}>Form 4</Btn>
          </div>

          <div style={{ marginTop: 12 }}>
            <Banner mode="idle" title="Reminder" detail="Closing forms is manual (Google Forms settings). This only hides/shows the link." />
          </div>
        </GlassCard>

        <GlassCard
          title="Stage + Pause Controls"
          subtitle="Stage hides entire rounds. Pause only blocks actions inside the current stage."
        >
          <Banner
            mode="lock"
            title={`Current Stage: ${stage}`}
            detail={
              stage === 1
                ? "Players see ONLY Round 1."
                : stage === 2
                ? "Players see ONLY Round 2."
                : "Players see ONLY Round 4 (eligible players only)."
            }
          />

          <div className="row">
            <Btn onClick={() => setStage(1)}>Stage 1</Btn>
            <Btn onClick={() => setStage(2)}>Stage 2</Btn>
            <Btn onClick={() => setStage(4)}>Stage 4</Btn>
          </div>

          <div style={{ marginTop: 14 }}>
            <Banner mode="idle" title="Pause / Resume" detail="Pause to freeze access without resetting progress." />

            <div className="row">
              <Btn variant="safe" onClick={() => enableRound2(true)}>Enable Round 2</Btn>
              <Btn variant="risk" onClick={() => enableRound2(false)}>Pause Round 2</Btn>
              <Pill tone="green">R2: {String(!!eventState.round2Enabled)}</Pill>
            </div>

            <div className="row">
              <Btn variant="safe" onClick={() => enableRound4(true)}>Enable Round 4</Btn>
              <Btn variant="risk" onClick={() => enableRound4(false)}>Pause Round 4</Btn>
              <Pill tone="green">R4: {String(!!eventState.round4Enabled)}</Pill>
            </div>
          </div>
        </GlassCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <GlassCard
          title="Leaderboard + Round 2 Verification"
          subtitle="Toggle Round 2 completed for each participant, then switch stage to 4."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {people.map((p) => (
              <LeaderRow
                key={p.id}
                p={p}
                onToggleR2={() => toggleRound2Completed(p.id, !!p.round2Completed)}
                onSaveScore={(v) => setScore(p.id, v)}
              />
            ))}
          </div>
        </GlassCard>
      </div>
    </Page>
  );
}

function LeaderRow({ p, onToggleR2, onSaveScore }) {
  const [val, setVal] = useState(p.totalScore ?? 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 0.9fr 0.8fr 0.8fr",
        gap: 10,
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 12,
        background: "rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>
        {p.email || p.id}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
          Shape: {p.shapeLocked ? String(p.selectedShape).toUpperCase() : "-"} • Bridge: {(p.glassStep ?? 0)}/5
        </div>
      </div>

      <Btn variant="ghost" onClick={onToggleR2}>
        R2: {p.round2Completed ? "✅ Done" : "❌ Pending"}
      </Btn>

      <input value={val} onChange={(e) => setVal(e.target.value)} />

      <Btn variant="safe" onClick={() => onSaveScore(val)}>Save</Btn>
    </div>
  );
}
