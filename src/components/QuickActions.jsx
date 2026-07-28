import React from 'react';

export default function QuickActions({ onCalendar, onFavorites, onExportSchedule }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2>QUICK ACTIONS</h2>
      </div>
      <div className="quick-actions-grid">
        <button className="action-card btn-3d-blue" onClick={onCalendar}>
          <div className="action-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#e2e8f0" stroke="#475569"></rect>
              <rect x="3" y="4" width="18" height="5" fill="#ef4444" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6" stroke="#1e293b" strokeWidth="2.5"></line>
              <line x1="8" y1="2" x2="8" y2="6" stroke="#1e293b" strokeWidth="2.5"></line>
              <circle cx="8" cy="13" r="1.5" fill="#3b82f6"></circle>
              <circle cx="12" cy="13" r="1.5" fill="#3b82f6"></circle>
              <circle cx="16" cy="13" r="1.5" fill="#3b82f6"></circle>
              <circle cx="8" cy="17" r="1.5" fill="#3b82f6"></circle>
              <circle cx="12" cy="17" r="1.5" fill="#22c55e"></circle>
              <circle cx="16" cy="17" r="1.5" fill="#3b82f6"></circle>
            </svg>
          </div>
          <span>Calendar</span>
        </button>
        <button className="action-card btn-3d-blue" onClick={onFavorites}>
          <div className="action-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <span>Favorites</span>
        </button>
        <button className="action-card btn-3d-blue" onClick={onExportSchedule}>
          <div className="action-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#94a3b8" stroke="#334155" strokeWidth="1.5">
              <path d="M4 2h14l4 4v16H4V2z" fill="#cbd5e1"></path>
              <rect x="7" y="2" width="10" height="7" fill="#f8fafc" stroke="#475569"></rect>
              <rect x="13" y="3" width="3" height="5" fill="#334155"></rect>
              <rect x="6" y="13" width="12" height="9" fill="#e2e8f0" stroke="#475569"></rect>
              <rect x="8" y="15" width="8" height="5" fill="#94a3b8"></rect>
            </svg>
          </div>
          <span>Export Schedule</span>
        </button>
      </div>
    </section>
  );
}
