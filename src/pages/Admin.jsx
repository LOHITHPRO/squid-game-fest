import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";

export default function Admin() {
  const uid = auth.currentUser?.uid;
  const [me, setMe] = useState(null);
  const [eventState, setEventState] = useState(null);
  const [people, setPeople] = useState([]);

  useEffect(() => {
    const unsubMe = onSnapshot(doc(db, "participants", uid), (snap) => setMe(snap.data() || null));
    const unsubState = onSnapshot(doc(db, "eventState", "current"), (snap) => setEventState(snap.data() || null));
    const q = query(collection(db, "participants"), orderBy("totalScore", "desc"));
    const unsubPeople = onSnapshot(q, (snap) => setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => {
      unsubMe();
      unsubState();
      unsubPeople();
    };
  }, [uid]);

  if (!me) return <div className="center">Loading...</div>;
  if (!me.isAdmin) return <div className="center">Access denied (not admin).</div>;
  if (!eventState) return <div className="center">Loading state...</div>;

  const setActiveForm = async (n) => {
    await updateDoc(doc(db, "eventState", "current"), { round: 1, activeForm: n });
  };

  const enableRound2 = async (v) => {
    await updateDoc(doc(db, "eventState", "current"), { round2Enabled: v });
  };

  const enableRound4 = async (v) => {
    await updateDoc(doc(db, "eventState", "current"), { round4Enabled: v });
  };

  const setScore = async (participantId, newScore) => {
    const score = Number(newScore);
    if (Number.isNaN(score)) return;
    await updateDoc(doc(db, "participants", participantId), { totalScore: score });
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="badge">Admin</div>
          <div className="muted">{me.email}</div>
        </div>
        <button className="btn2" onClick={() => signOut(auth)}>Logout</button>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Round 1 Control</h2>
          <p className="muted">Show Form 1→4 during Green Light. Red Light = you close the form manually in Google.</p>
          <div className="row">
            <button className="btn" onClick={() => setActiveForm(0)}>Waiting (No Form)</button>
            <button className="btn" onClick={() => setActiveForm(1)}>Green: Form 1</button>
            <button className="btn" onClick={() => setActiveForm(2)}>Green: Form 2</button>
            <button className="btn" onClick={() => setActiveForm(3)}>Green: Form 3</button>
            <button className="btn" onClick={() => setActiveForm(4)}>Green: Form 4</button>
          </div>
          <div className="muted">Current activeForm: {eventState.activeForm}</div>
        </div>

        <div className="card">
          <h2>Round Toggles</h2>
          <div className="row">
            <button className="btn" onClick={() => enableRound2(true)}>Enable Round 2</button>
            <button className="btn danger" onClick={() => enableRound2(false)}>Disable Round 2</button>
          </div>
          <div className="row">
            <button className="btn" onClick={() => enableRound4(true)}>Enable Round 4</button>
            <button className="btn danger" onClick={() => enableRound4(false)}>Disable Round 4</button>
          </div>
          <div className="muted">
            Round2Enabled: {String(eventState.round2Enabled)} | Round4Enabled: {String(eventState.round4Enabled)}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h2>Leaderboard (Admin Editable)</h2>
          <p className="muted">You can manually set total score here after Google Forms / HackerRank results.</p>

          <div className="table">
            <div className="thead">
              <div>Email</div>
              <div>Score</div>
              <div>Round2 Shape</div>
              <div>Glass Step</div>
              <div>Update</div>
            </div>

            {people.map((p) => (
              <ScoreRow key={p.id} p={p} onSetScore={setScore} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ p, onSetScore }) {
  const [val, setVal] = useState(p.totalScore ?? 0);

  return (
    <div className="trow">
      <div className="cell">{p.email}</div>
      <div className="cell">
        <input
          className="scoreInput"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </div>
      <div className="cell">{p.shapeLocked ? p.selectedShape : "-"}</div>
      <div className="cell">{p.glassStep ?? 0}/5</div>
      <div className="cell">
        <button className="btn2" onClick={() => onSetScore(p.id, val)}>Save</button>
      </div>
    </div>
  );
}
