import React from 'react';

export default function Modal({ isOpen, title, onClose, isWide = false, children }) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target.classList.contains('modal-overlay')) onClose();
    }}>
      <div className={`modal-card ${isWide ? 'modal-card-wide' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
