// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import config from "../eventConfig.json";
import { Page, GlassCard, Banner, Btn, Pill, ShapeButton, StepBar } from "../components/UX";

function openInNewTab(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Dashboard() {
  const uid = auth.currentUser?.uid;

  const [eventState, setEventState] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!uid) return;

    const unsub1 = onSnapshot(doc(db, "eventState", "current"), (snap) => {
      setEventState(snap.data() || null);
    });

    const unsub2 = onSnapshot(doc(db, "participants", uid), (snap) => {
      setMe(snap.data() || null);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  const stage = useMemo(() => eventState?.stage ?? 1, [eventState]);

  const activeFormIndex = useMemo(() => {
    const af = eventState?.activeForm ?? 0;
    return af - 1; // 0 => -1 means red light
  }, [eventState]);

  const pickShape = async (shapeKey) => {
    if (!me || me.shapeLocked) return;
    const link = config.round2Shapes?.[shapeKey];
    if (!link) return alert("Missing shape link in eventConfig.json");

    await updateDoc(doc(db, "participants", uid), {
      selectedShape: shapeKey,
      shapeLocked: true,
    });

    openInNewTab(link);
  };

  const pickGlass = async (choice) => {
    if (!me) return;

    const step = me.glassStep || 0;
    if (step >= 5) return;

    const linkArr = choice === "safe" ? config.round3.safe : config.round3.risky;
    const link = linkArr?.[step];
    if (!link) return alert("Missing round3 link in eventConfig.json");

    const newChoices = Array.isArray(me.glassChoices) ? [...me.glassChoices] : [];
    newChoices.push({ step: step + 1, choice, link });

    await updateDoc(doc(db, "participants", uid), {
      glassStep: step + 1,
      glassChoices: newChoices,
    });

    openInNewTab(link);
  };

  if (!eventState || !me) return <div className="centerTxt">Loading...</div>;

  return (
    <Page
      title="Player Dashboard"
      subtitle="Only the current round is visible. Choices can lock permanently."
      right={
        <>
          <Pill tone="green">{me.email}</Pill>
          <Btn variant="ghost" onClick={() => signOut(auth)}>Logout</Btn>
        </>
      }
    >
      {/* STAGE 1: Round 1 only */}
      {stage === 1 && (
        <div className="grid2">
          <GlassCard
            title="Round 1 — Red Light / Green Light"
            subtitle="Green Light shows one Google Form link. Red Light means the form is closed."
          >
            {activeFormIndex < 0 ? (
              <Banner mode="red" title="🔴 RED LIGHT" detail="Forms are closed. Wait for Green Light." />
            ) : (
              <>
                <Banner mode="green" title="🟢 GREEN LIGHT" detail={`Form ${activeFormIndex + 1} is live now.`} />
                <div className="row">
                  <Btn onClick={() => openInNewTab(config.round1Forms[activeFormIndex])}>
                    Open Form {activeFormIndex + 1}
                  </Btn>
                  <Pill tone="pink">One submission only</Pill>
                </div>
              </>
            )}
          </GlassCard>

          <GlassCard title="Locked Rounds" subtitle="Next rounds unlock when admin switches stage.">
            <Banner mode="lock" title="Round 2" detail="Hidden until Stage 2." />
            <div style={{ height: 10 }} />
            <Banner mode="lock" title="Round 3" detail="Hidden until Stage 3 and you complete Round 2." />
          </GlassCard>
        </div>
      )}

      {/* STAGE 2: Round 2 only */}
      {stage === 2 && (
        <div className="grid2">
          <GlassCard title="Round 2 — Dalgona Debug" subtitle="Pick one shape. No coming back.">
            {!eventState.round2Enabled ? (
              <Banner mode="idle" title="Waiting" detail="Admin has not enabled Round 2 yet." />
            ) : me.shapeLocked ? (
              <>
                <Banner mode="lock" title="🔒 Shape Locked" detail={`You chose: ${String(me.selectedShape).toUpperCase()}`} />
                <div className="row">
                  <Btn onClick={() => openInNewTab(config.round2Shapes[me.selectedShape])}>
                    Continue to Challenge
                  </Btn>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Banner
                    mode={me.round2Completed ? "green" : "idle"}
                    title={me.round2Completed ? "✅ Completed" : "Verification Pending"}
                    detail={me.round2Completed ? "Wait for Stage 3 to begin." : "After finishing, wait for admin to mark completion."}
                  />
                </div>
              </>
            ) : (
              <>
                <Banner mode="idle" title="Choose carefully" detail="Once you click a shape, it locks permanently." />
                <div className="shapeGrid" style={{ marginTop: 12 }}>
                  {["circle", "triangle", "star", "umbrella"].map((k) => (
                    <ShapeButton
                      key={k}
                      name={k.toUpperCase()}
                      onClick={() => pickShape(k)}
                      disabled={false}
                    />
                  ))}
                </div>
              </>
            )}
          </GlassCard>

          <GlassCard title="Round 3 Status" subtitle="Unlock condition">
            <Banner
              mode={me.round2Completed ? "green" : "lock"}
              title={me.round2Completed ? "Eligible for Round 3" : "Locked"}
              detail={me.round2Completed ? "Wait for admin to switch stage to 3." : "Complete Round 2 and get verified by admin."}
            />
          </GlassCard>
        </div>
      )}

      {/* STAGE 3: Round 3 only */}
      {stage === 3 && (
        <div className="grid2">
          <GlassCard title="Round 3 — Glass Bridge" subtitle="5 steps. Choose Tail 1 or Tail 2 — questions are random.">
            {!me.round2Completed ? (
              <Banner mode="red" title="Not eligible" detail="You must complete Round 2 first (admin verification required)." />
            ) : !eventState.round3Enabled ? (
              <Banner mode="idle" title="Waiting" detail="Admin has not enabled Round 3 yet." />
            ) : (
              <>
                <StepBar current={me.glassStep || 0} total={5} />

                {(me.glassStep || 0) >= 5 ? (
                  <Banner mode="green" title="✅ Completed" detail="You have crossed all 5 steps." />
                ) : (
                  <>
                    <Banner mode="idle" title="Make your choice" detail="Pick Tail 1 or Tail 2. Questions are random." />
                    <div className="row">
                      <Btn onClick={() => pickGlass("safe")}>Tail 1</Btn>
                      <Btn onClick={() => pickGlass("risky")}>Tail 2</Btn>
                    </div>
                  </>
                )}
              </>
            )}
          </GlassCard>

          <GlassCard title="Your Bridge History" subtitle="Locked record">
            {Array.isArray(me.glassChoices) && me.glassChoices.length ? (
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                {me.glassChoices.map((c) => (
                  <div
                    key={c.step}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      Step {c.step}: <b>{c.choice === "safe" ? "Tail 1" : "Tail 2"}</b>
                    </div>
                    <a href={c.link} target="_blank" rel="noreferrer">
                      open
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="centerTxt">No choices yet.</div>
            )}
          </GlassCard>
        </div>
      )}
    </Page>
  );
}
