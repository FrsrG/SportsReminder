import React from 'react';

export default function SettingsModal({ 
  reminderLeadTime, 
  onLeadTimeChange, 
  startupNotificationEnabled = false,
  onStartupNotificationChange,
  onClearTrackedTeams 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Startup Desktop Notification Setting */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
            Send desktop notification every time I launch my browser
          </label>
          <label className="ios-switch" style={{ flexShrink: 0, marginLeft: '10px' }}>
            <input 
              type="checkbox" 
              checked={startupNotificationEnabled} 
              onChange={(e) => onStartupNotificationChange && onStartupNotificationChange(e.target.checked)} 
            />
            <span className="ios-slider"></span>
          </label>
        </div>
        <div className="settings-fineprint" style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Notifies you every time you launch your browser on a game day of a tracked team.
        </div>
      </div>

      {/* Default Reminder Lead Time */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Default Game Reminder Timing
        </label>
        <select 
          className="team-select" 
          style={{ width: '100%' }}
          value={reminderLeadTime}
          onChange={(e) => onLeadTimeChange(e.target.value)}
        >
          <option value="15m">15 minutes before match</option>
          <option value="30m">30 minutes before match</option>
          <option value="1h">1 hour before match</option>
          <option value="2h">2 hours before match</option>
        </select>
      </div>

      {/* Data & Cache */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Data & Cache
        </label>
        <button 
          className="cancel-team-btn" 
          style={{ width: '100%', color: '#ef4444', borderColor: '#ef4444' }}
          onClick={onClearTrackedTeams}
        >
          Clear Tracked Teams
        </button>
      </div>
    </div>
  );
}
