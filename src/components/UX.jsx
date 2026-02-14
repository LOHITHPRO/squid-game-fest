// src/components/UX.jsx
import React from "react";
import { motion } from "framer-motion";

export function FXBackground() {
  return (
    <>
      <div className="bgFX" />
      <div className="gridFX" />
      <div className="noiseFX" />
    </>
  );
}

export function Page({ title, subtitle, right, children }) {
  return (
    <div className="shell">
      <div className="topBar">
        <div>
          <div className="brand">SQUID GAME</div>
          <div className="h1">{title}</div>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
        <div className="right">{right}</div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.33, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function GlassCard({ title, subtitle, children }) {
  return (
    <motion.div
      className="cardG"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {(title || subtitle) && (
        <div className="head">
          {title ? <div className="title">{title}</div> : null}
          {subtitle ? <div className="subtitle">{subtitle}</div> : null}
        </div>
      )}
      <div className="body">{children}</div>
    </motion.div>
  );
}

export function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "green"
      ? "pill pill-green"
      : tone === "pink"
      ? "pill pill-pink"
      : tone === "red"
      ? "pill pill-red"
      : "pill";
  return <span className={cls}>{children}</span>;
}

export function Banner({ mode = "idle", title, detail }) {
  const cls =
    mode === "green"
      ? "banner bGreen"
      : mode === "red"
      ? "banner bRed"
      : mode === "lock"
      ? "banner bLock"
      : "banner bIdle";
  return (
    <div className={cls}>
      <div className="bannerTitle">{title}</div>
      {detail ? <div className="bannerDetail">{detail}</div> : null}
    </div>
  );
}

export function Btn({ children, variant = "primary", ...props }) {
  const cls =
    variant === "safe"
      ? "btnX btnSafe"
      : variant === "risk"
      ? "btnX btnRisk"
      : variant === "ghost"
      ? "btnX btnGhost"
      : "btnX";
  return (
    <motion.button
      className={cls}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      {...props}
    >
      <span className="btnText">{children}</span>
      <span className="btnSheen" />
    </motion.button>
  );
}

export function ShapeButton({ name, onClick, disabled }) {
  return (
    <motion.button
      className="shapeCard"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -3, rotateX: 3, rotateY: -3 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="shapeTop">
        <div className="shapeGlyph">{name.slice(0, 1)}</div>
        <div className="shapeChip">{disabled ? "LOCKED" : "ONE CHOICE"}</div>
      </div>
      <div className="shapeName">{name}</div>
      <div className="shapeHint">
        {disabled ? "Choice is locked." : "Pick once. You cannot return back."}
      </div>
      <div className="shapeGlow" />
    </motion.button>
  );
}

export function StepBar({ current = 0, total = 5 }) {
  return (
    <div className="stepRow">
      <div className="stepText">
        Progress: <b>Step {current}</b> / {total}
      </div>
      <div className="stepBar">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current;
          const next = i === current;
          return (
            <div
              key={i}
              className={`stepNode ${done ? "done" : ""} ${next ? "next" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
