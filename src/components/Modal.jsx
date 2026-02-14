// src/components/Modal.jsx
import React from "react";

export default function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="modalBack" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <div className="modalBody">{children}</div>
        <div className="modalActions">{actions}</div>
      </div>
    </div>
  );
}
