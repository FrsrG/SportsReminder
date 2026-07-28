import React, { useState } from 'react';

export default function GameAlarmModal({ 
  game, 
  activeAlarms = [], 
  onToggleAlarm,
  isStartupReminderEnabled = false,
  onToggleStartupReminder,
  customLeadMins = [],
  onAddCustomLeadMin
}) {
  const [isManaging, setIsManaging] = useState(false);
  const [customMinsInput, setCustomMinsInput] = useState('');
  const [customUnit, setCustomUnit] = useState('mins'); // 'mins' | 'hours'
  const [managerError, setManagerError] = useState('');

  if (!game) return null;

  const matchDate = new Date(game.date);
  const matchMs = matchDate.getTime();
  const nowMs = Date.now();
  const matchTimeStr = matchDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  let dayStr = '';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (matchDate.toDateString() === today.toDateString()) {
    dayStr = 'Today';
  } else if (matchDate.toDateString() === tomorrow.toDateString()) {
    dayStr = 'Tomorrow';
  } else {
    dayStr = matchDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Preset 5-min intervals up to 120 mins (2 hours)
  const defaultMinSlots = [];
  for (let mins = 120; mins >= 5; mins -= 5) {
    defaultMinSlots.push(mins);
  }

  // Combine default slots + custom lead mins, deduplicated and sorted descending
  const allMinValues = Array.from(new Set([...defaultMinSlots, ...customLeadMins]))
    .sort((a, b) => b - a);

  // Generate slot objects
  const slots = [];
  allMinValues.forEach(mins => {
    const slotMs = matchMs - (mins * 60 * 1000);
    // Only include future slots before match start
    if (slotMs > nowMs) {
      const slotDate = new Date(slotMs);
      const slotClockStr = slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const isoKey = slotDate.toISOString();

      let leadLabel = `${mins} minutes before match`;
      if (mins === 60) leadLabel = '1 hour before match';
      else if (mins === 120) leadLabel = '2 hours before match';
      else if (mins > 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        leadLabel = m > 0 ? `${h}h ${m}m before match` : `${h} hours before match`;
      }

      slots.push({
        mins,
        slotMs,
        clockStr: slotClockStr,
        leadLabel,
        isoKey
      });
    }
  });

  const isAlarmActive = (slotIso) => {
    if (!activeAlarms) return false;
    if (Array.isArray(activeAlarms)) {
      return activeAlarms.some(a => {
        if (a === slotIso) return true;
        const aMs = new Date(a).getTime();
        const sMs = new Date(slotIso).getTime();
        return Math.abs(aMs - sMs) < 2000;
      });
    }
    return false;
  };

  const handleAddCustomTime = (e) => {
    e.preventDefault();
    setManagerError('');
    
    const val = parseInt(customMinsInput, 10);
    if (isNaN(val) || val <= 0) {
      setManagerError('Please enter a valid positive number.');
      return;
    }

    const totalMins = customUnit === 'hours' ? val * 60 : val;
    const slotMs = matchMs - (totalMins * 60 * 1000);

    if (slotMs <= nowMs) {
      setManagerError('Selected reminder time is in the past!');
      return;
    }

    if (onAddCustomLeadMin) {
      onAddCustomLeadMin(game.id, totalMins);
    }
    setCustomMinsInput('');
  };

  return (
    <div className="game-alarm-modal-container">
      {/* Header with Manage Toggle */}
      <div className="alarm-modal-header flex-between" style={{ paddingBottom: '10px', marginBottom: '12px' }}>
        <div style={{ textAlign: 'left' }}>
          <div className="alarm-modal-teams">
            {game.awayTeam.name} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>@</span> {game.homeTeam.name}
          </div>
          <div className="alarm-modal-time">
            {matchTimeStr} &bull; <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{dayStr}</span>
          </div>
        </div>

        <button 
          className="tab-btn" 
          onClick={() => setIsManaging(!isManaging)}
          style={{ 
            padding: '6px 12px', 
            fontSize: '11px', 
            background: isManaging ? 'linear-gradient(180deg, #3870b2 0%, #204c82 100%)' : 'rgba(255,255,255,0.1)',
            border: '1px solid #3d628c',
            color: '#ffffff'
          }}
        >
          {isManaging ? 'Done' : '⚙️ Manage'}
        </button>
      </div>

      {/* Manager Panel View */}
      {isManaging ? (
        <div className="alarm-manager-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Section 1: Add Custom Reminder Time */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', display: 'block', marginBottom: '8px' }}>
              ➕ Add Custom Reminder Time
            </label>
            <form onSubmit={handleAddCustomTime} style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="number" 
                placeholder="e.g. 90"
                className="search-input"
                style={{ width: '80px', padding: '6px 10px', fontSize: '13px' }}
                value={customMinsInput}
                onChange={(e) => setCustomMinsInput(e.target.value)}
              />
              <select 
                className="team-select" 
                style={{ width: '90px', padding: '6px' }}
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              >
                <option value="mins">mins</option>
                <option value="hours">hours</option>
              </select>
              <button 
                type="submit" 
                className="export-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Add
              </button>
            </form>
            {managerError && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px', fontWeight: '600' }}>
                {managerError}
              </div>
            )}
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Adds a new reminder button prior to kickoff/puck drop.
            </div>
          </div>

          {/* Section 2: Browser Startup Notification Checkbox */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', cursor: 'pointer' }}>
                Remind me every time I launch my browser
              </label>
              <label className="ios-switch" style={{ flexShrink: 0, marginLeft: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={isStartupReminderEnabled} 
                  onChange={(e) => onToggleStartupReminder && onToggleStartupReminder(game.id, e.target.checked)} 
                />
                <span className="ios-slider"></span>
              </label>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Triggers a desktop alert with exact time remaining until game start whenever you open your browser on match day.
            </div>
          </div>

          <button 
            className="add-team-btn" 
            onClick={() => setIsManaging(false)}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            Return to Reminders List
          </button>
        </div>
      ) : (
        /* Regular Alarm Intervals List */
        <div className="alarm-list">
          {slots.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Match is starting soon or in progress. No future reminder intervals available.
            </div>
          ) : (
            slots.map((slot) => {
              const active = isAlarmActive(slot.isoKey);
              return (
                <div key={slot.isoKey} className="alarm-item-row">
                  <div className="alarm-time-group">
                    <span className="alarm-clock-text">{slot.clockStr}</span>
                    <span className="alarm-lead-text">{slot.leadLabel}</span>
                  </div>
                  <label className="ios-switch">
                    <input 
                      type="checkbox" 
                      checked={active} 
                      onChange={() => onToggleAlarm && onToggleAlarm(game.id, slot.isoKey, slot.mins)} 
                    />
                    <span className="ios-slider"></span>
                  </label>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
