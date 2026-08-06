import React, { useState, useEffect } from 'react';
import { fetchUFCEventBouts, fetchFighterLast5 } from '../espnApi.js';

/**
 * Inline expandable fight card for UFC events.
 * Shows all bouts with fighter headshots, weight classes, and last-5 record strips.
 */
export default function FightCardExpander({ eventId, isExpanded, trackedTeams = [] }) {
  const [bouts, setBouts] = useState(null); // null = not loaded, [] = loaded empty
  const [fighterRecords, setFighterRecords] = useState({}); // { [athleteId]: ['W','L',...] }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded || bouts !== null) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const boutData = await fetchUFCEventBouts(eventId);
        if (cancelled) return;
        setBouts(boutData);

        // Fetch fighter records in parallel
        const allFighterIds = [];
        boutData.forEach(b => {
          if (b.fighter1.id) allFighterIds.push(b.fighter1.id);
          if (b.fighter2.id) allFighterIds.push(b.fighter2.id);
        });

        const uniqueIds = [...new Set(allFighterIds)];
        const recordPromises = uniqueIds.map(async (id) => {
          const last5 = await fetchFighterLast5(id);
          return { id, last5 };
        });

        const results = await Promise.all(recordPromises);
        if (cancelled) return;

        const recordMap = {};
        results.forEach(r => { recordMap[r.id] = r.last5; });
        setFighterRecords(recordMap);
      } catch (err) {
        console.error('Error loading fight card:', err);
        if (!cancelled) setBouts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isExpanded, eventId]);

  const defaultHeadshot = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="%2348484a"><circle cx="28" cy="28" r="28"/><circle cx="28" cy="22" r="10" fill="%23636366"/><ellipse cx="28" cy="42" rx="14" ry="10" fill="%23636366"/></svg>';

  const isFighterTracked = (fighter) => {
    if (!fighter) return false;
    return trackedTeams.some(tt => 
      String(tt.id) === String(fighter.id) ||
      (tt.name && fighter.name && tt.name.toLowerCase().trim() === fighter.name.toLowerCase().trim())
    );
  };

  const renderRecordStrip = (fighterId) => {
    const records = fighterRecords[fighterId] || [];
    const squares = [];
    for (let i = 0; i < 5; i++) {
      const result = records[i] || null;
      let className = 'record-square';
      let label = '—';
      if (result === 'W') { className += ' win'; label = 'W'; }
      else if (result === 'L') { className += ' loss'; label = 'L'; }
      else if (result === 'D') { className += ' draw'; label = 'D'; }
      else if (result === 'NC') { className += ' draw'; label = 'NC'; }
      squares.push(
        <div key={i} className={className}>{label}</div>
      );
    }
    return <div className="fighter-record-strip">{squares}</div>;
  };

  return (
    <div className={`fight-card-expander ${isExpanded ? 'expanded' : ''}`}>
      <div className="fight-card-inner">
        {loading && (
          <div className="fight-card-spinner" />
        )}

        {!loading && bouts && bouts.length === 0 && (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            Fight card details not yet available.
          </div>
        )}

        {!loading && bouts && bouts.length > 0 && (
          bouts.map((bout) => {
            const isF1Tracked = isFighterTracked(bout.fighter1);
            const isF2Tracked = isFighterTracked(bout.fighter2);
            const hasTrackedFighter = isF1Tracked || isF2Tracked;

            return (
              <div 
                key={bout.id} 
                className="fight-matchup"
                style={hasTrackedFighter ? {
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  margin: '6px 0'
                } : {}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="weight-class-label">{bout.weightClass}</span>
                  {hasTrackedFighter && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#eab308', background: 'rgba(234,179,8,0.2)', padding: '2px 6px', borderRadius: '10px' }}>
                      ⭐ Tracked Fighter
                    </span>
                  )}
                </div>

                <div className="fight-matchup-fighters">
                  {/* Fighter 1 */}
                  <div className="fighter-col">
                    <img
                      src={bout.fighter1.id ? `https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/${bout.fighter1.id}.png` : (bout.fighter1.headshot || defaultHeadshot)}
                      alt={bout.fighter1.name}
                      className="fighter-circle"
                      style={isF1Tracked ? { border: '2px solid #eab308', boxShadow: '0 0 8px rgba(234, 179, 8, 0.6)' } : {}}
                      onError={(e) => { e.target.src = defaultHeadshot; }}
                    />
                    <span className="fighter-name" style={isF1Tracked ? { color: '#fef08a', fontWeight: 700 } : {}}>{bout.fighter1.name}</span>
                    {bout.fighter1.record && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {bout.fighter1.record}
                      </span>
                    )}
                    {renderRecordStrip(bout.fighter1.id)}
                  </div>

                  {/* VS */}
                  <span className="fight-vs-text">vs</span>

                  {/* Fighter 2 */}
                  <div className="fighter-col">
                    <img
                      src={bout.fighter2.id ? `https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/${bout.fighter2.id}.png` : (bout.fighter2.headshot || defaultHeadshot)}
                      alt={bout.fighter2.name}
                      className="fighter-circle"
                      style={isF2Tracked ? { border: '2px solid #eab308', boxShadow: '0 0 8px rgba(234, 179, 8, 0.6)' } : {}}
                      onError={(e) => { e.target.src = defaultHeadshot; }}
                    />
                    <span className="fighter-name" style={isF2Tracked ? { color: '#fef08a', fontWeight: 700 } : {}}>{bout.fighter2.name}</span>
                    {bout.fighter2.record && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {bout.fighter2.record}
                      </span>
                    )}
                    {renderRecordStrip(bout.fighter2.id)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
