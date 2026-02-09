import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import config from "../eventConfig.json";

function openInNewTab(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Dashboard() {
  const uid = auth.currentUser?.uid;
  const [eventState, setEventState] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, "eventState", "current"), (snap) => {
      setEventState(snap.exists() ? snap.data() : null);
    });
    const unsub2 = onSnapshot(doc(db, "participants", uid), (snap) => {
      setMe(snap.exists() ? snap.data() : null);
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  const round = eventState?.round || 1;

  const activeFormIndex = useMemo(() => {
    const af = eventState?.activeForm || 0; // 0..4
    return af - 1; // -1 means none
  }, [eventState]);

  const handlePickShape = async (shapeKey) => {
    if (!me) return;
    if (me.shapeLocked) return;

    const link = config.round2Shapes[shapeKey];
    if (!link) return alert("Shape link missing in config.");

    // lock first, then redirect
    await updateDoc(doc(db, "participants", uid), {
      selectedShape: shapeKey,
      shapeLocked: true
    });

    openInNewTab(link);
  };

  const handleGlassChoice = async (choice) => {
    if (!me) return;
    const step = me.glassStep || 0; // 0..5
    if (step >= 5) return;

    const linkArr = choice === "safe" ? config.round4.safe : config.round4.risky;
    const link = linkArr[step];
    if (!link) return alert("Missing Round 4 link for this step in config.");

    const newChoices = Array.isArray(me.glassChoices) ? [...me.glassChoices] : [];
    newChoices.push({ step: step + 1, choice, link });

    await updateDoc(doc(db, "participants", uid), {
      glassStep: step + 1,
      glassChoices: newChoices
    });

    openInNewTab(link);
  };

  if (!eventState || !me) return <div className="center">Loading dashboard...</div>;

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="badge">Participant</div>
          <div className="muted">{me.email}</div>
        </div>
        <button className="btn2" onClick={() => signOut(auth)}>Logout</button>
      </div>

      <div className="grid">
        {/* ROUND 1 */}
        <div className="card">
          <h2>Round 1 — Red Light, Green Light</h2>
          <p className="muted">Only one form appears per Green Light. Red Light = organizers close the form manually.</p>

          {round !== 1 ? (
            <div className="muted">Round 1 is over / not active right now.</div>
          ) : (
            <>
              {activeFormIndex < 0 ? (
                <div className="status red">WAITING FOR GREEN LIGHT</div>
              ) : (
                <>
                  <div className="status green">GREEN LIGHT — FORM {activeFormIndex + 1}</div>
                  <button
                    className="btn"
                    onClick={() => openInNewTab(config.round1Forms[activeFormIndex])}
                  >
                    Open Google Form {activeFormIndex + 1}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* ROUND 2 */}
        <div className="card">
          <h2>Round 2 — Dalgona Debug</h2>
          <p className="muted">Pick one shape. No coming back. It locks permanently.</p>

          {!eventState.round2Enabled ? (
            <div className="muted">Round 2 is not enabled yet.</div>
          ) : me.shapeLocked ? (
            <div>
              <div className="status green">LOCKED: {String(me.selectedShape).toUpperCase()}</div>
              <button
                className="btn"
                onClick={() => openInNewTab(config.round2Shapes[me.selectedShape])}
              >
                Continue to your challenge
              </button>
            </div>
          ) : (
            <div className="shapes">
              {["circle", "triangle", "star", "umbrella"].map((k) => (
                <button key={k} className="shape" onClick={() => handlePickShape(k)}>
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ROUND 4 */}
        <div className="card">
          <h2>Round 4 — Glass Bridge</h2>
          <p className="muted">5 steps. Choose before you see the question. Choice is saved and locked.</p>

          {!eventState.round4Enabled ? (
            <div className="muted">Round 4 is not enabled yet.</div>
          ) : (
            <>
              <div className="muted">Progress: Step {me.glassStep || 0} / 5</div>

              {(me.glassStep || 0) >= 5 ? (
                <div className="status green">BRIDGE COMPLETED</div>
              ) : (
                <div className="bridge">
                  <button className="btn" onClick={() => handleGlassChoice("safe")}>
                    🟩 Safe (Easy)
                  </button>
                  <button className="btn danger" onClick={() => handleGlassChoice("risky")}>
                    🟥 Risky (Hard)
                  </button>
                </div>
              )}

              {Array.isArray(me.glassChoices) && me.glassChoices.length > 0 && (
                <div className="choices">
                  <h3>Your choices</h3>
                  <ul>
                    {me.glassChoices.map((c) => (
                      <li key={c.step}>
                        Step {c.step}: {c.choice.toUpperCase()} —{" "}
                        <a href={c.link} target="_blank" rel="noreferrer">open</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
