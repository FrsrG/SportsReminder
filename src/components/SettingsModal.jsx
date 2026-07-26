import React from 'react';

export default function SettingsModal({ reminderLeadTime, onLeadTimeChange, onClearTrackedTeams }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Game Reminder Timing
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
