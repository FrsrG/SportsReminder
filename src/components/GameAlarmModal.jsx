import React from 'react';

export default function GameAlarmModal({ game, activeAlarms = [], onToggleAlarm }) {
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

  // Calculate 5-minute interval alarm slots starting up to 2 hours (120 mins) prior to match
  // Filters out any times prior to current local time (nowMs)
  const slots = [];
  const maxMinsBefore = 120; // 2 hours

  for (let mins = maxMinsBefore; mins >= 5; mins -= 5) {
    const slotMs = matchMs - (mins * 60 * 1000);
    // Only include if slot time is in the future
    if (slotMs > nowMs) {
      const slotDate = new Date(slotMs);
      const slotClockStr = slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const isoKey = slotDate.toISOString();
      
      let leadLabel = `${mins} minutes before match`;
      if (mins === 60) leadLabel = '1 hour before match';
      else if (mins === 120) leadLabel = '2 hours before match';
      else if (mins > 60) leadLabel = `1h ${mins - 60}m before match`;

      slots.push({
        mins,
        slotMs,
        clockStr: slotClockStr,
        leadLabel,
        isoKey
      });
    }
  }

  // Helper to check if an alarm slot is active
  const isAlarmActive = (slotIso) => {
    if (!activeAlarms) return false;
    if (Array.isArray(activeAlarms)) {
      return activeAlarms.some(a => {
        if (a === slotIso) return true;
        // Compare timestamps in ms to account for ISO formatting variations
        const aMs = new Date(a).getTime();
        const sMs = new Date(slotIso).getTime();
        return Math.abs(aMs - sMs) < 2000;
      });
    }
    return false;
  };

  return (
    <div className="game-alarm-modal-container">
      <div className="alarm-modal-header">
        <div className="alarm-modal-teams">
          {game.awayTeam.name} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>@</span> {game.homeTeam.name}
        </div>
        <div className="alarm-modal-time">
          {matchTimeStr}
        </div>
        <div className="alarm-modal-subtext">
          {dayStr} &bull; {game.venue || 'Stadium'}
        </div>
      </div>

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
    </div>
  );
}
