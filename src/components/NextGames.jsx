import React, { useState } from 'react';
import FightCardExpander from './FightCardExpander.jsx';
import F1Nameplate from './F1Nameplate.jsx';
import UFCNameplate from './UFCNameplate.jsx';
import { getGrandPrixCountryCode } from '../espnApi.js';

export default function NextGames({ games, trackedTeams = [], onViewFullSchedule, reminderLeadTime, gameReminders = {}, onOpenAlarmModal, limit = 5 }) {
  const displayGames = limit ? (games ? games.slice(0, limit) : []) : (games || []);
  const [expandedCards, setExpandedCards] = useState({});

  const toggleExpand = (gameId) => {
    setExpandedCards(prev => ({ ...prev, [gameId]: !prev[gameId] }));
  };

  return (
    <section className="section">
      <div className="section-header flex-between">
        <h2>NEXT GAMES</h2>
        {onViewFullSchedule && (
          <a href="#" className="link-text" onClick={(e) => { e.preventDefault(); onViewFullSchedule(); }}>
            View Full Schedule 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        )}
      </div>
      <div className="games-list-wrapper">
        <div className="games-list">
          {!games ? (
            <div className="empty-state">Loading schedule...</div>
          ) : games.length === 0 ? (
            <div className="empty-state">No upcoming games for tracked teams.</div>
          ) : (
            displayGames.map((game, index) => {
              const gameDate = new Date(game.date);
              let dayStr = '';
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              if (gameDate.toDateString() === today.toDateString()) {
                dayStr = 'Today';
              } else if (gameDate.toDateString() === tomorrow.toDateString()) {
                dayStr = 'Tomorrow';
              } else {
                dayStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              }
              
              const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              
              // Get active alarms array for this game
              const activeAlarms = Array.isArray(gameReminders[game.id]) 
                ? gameReminders[game.id] 
                : (gameReminders[game.id] && gameReminders[game.id] !== 'off' ? [gameReminders[game.id]] : []);
              
              const activeCount = activeAlarms.length;
              const isOff = activeCount === 0;
              const isCardExpanded = !!expandedCards[game.id];

              // Check if any fighter on card is tracked
              const hasTrackedFighter = game.isUFC && trackedTeams.some(tt => {
                if (!tt || !tt.name) return false;
                const normTTName = tt.name.toLowerCase().trim();
                const lastName = normTTName.split(' ').pop();
                const headline = (game.headline || '').toLowerCase();
                const eventName = (game.eventName || '').toLowerCase();
                const homeName = (game.homeTeam?.name || '').toLowerCase();
                const awayName = (game.awayTeam?.name || '').toLowerCase();

                return (
                  headline.includes(normTTName) ||
                  eventName.includes(normTTName) ||
                  (lastName.length > 2 && (headline.includes(lastName) || eventName.includes(lastName))) ||
                  homeName.includes(normTTName) ||
                  awayName.includes(normTTName) ||
                  String(game.homeTeam?.id) === String(tt.id) ||
                  String(game.awayTeam?.id) === String(tt.id)
                );
              });

              // ========== F1 / RACING EVENT CARD ==========
              const isRacing = game.isRacing || game.sportSlug === 'racing/f1' || game.sportSlug === 'racing';

              if (isRacing) {
                const eventTitle = game.eventName || (game.homeTeam ? game.homeTeam.name : 'Grand Prix');
                const countryCode = game.countryCode || getGrandPrixCountryCode(eventTitle, game.venue);

                return (
                  <div key={game.id} className={`game-card f1-event-card ${index === 0 ? 'next-game' : ''}`}>
                    <F1Nameplate eventName={eventTitle} countryCode={countryCode} />

                    <div className="f1-event-info" style={{ flex: 1, minWidth: 0, paddingLeft: '10px' }}>
                      <div className="f1-event-name" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {eventTitle}
                      </div>
                      <div className="f1-event-meta" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <span className="game-day" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dayStr}</span> • <span className="game-time">{timeStr}</span>
                      </div>
                      <div className="game-arena" style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {game.venue}
                      </div>
                    </div>

                    <div className="f1-card-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {game.status === 'STATUS_IN_PROGRESS' || game.status === 'in' ? (
                        <div className="status-live-badge" style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', animation: 'pulse 2s infinite' }}>
                          ● LIVE
                        </div>
                      ) : game.completed || game.status === 'STATUS_FINAL' ? (
                        <div className="status-final-badge" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          🏁 FINAL
                        </div>
                      ) : (
                        <div 
                          className={`game-action ${isOff ? 'off' : ''}`}
                          onClick={() => onOpenAlarmModal && onOpenAlarmModal(game)}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          title={isOff ? "Reminder Off (Click to set alarms)" : `${activeCount} Alarm(s) Active (Click to edit)`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                          </svg>
                          <span>{isOff ? 'Off' : `${activeCount} Set`}</span>
                          {!isOff && <span className="bell-badge">{activeCount}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // ========== UFC EVENT CARD ==========
              if (game.isUFC) {
                const eventTitle = game.eventName || 'UFC Event';

                return (
                  <div key={game.id} style={{ marginBottom: '8px' }}>
                    <div 
                      className={`game-card ufc-event-card ${index === 0 ? 'next-game' : ''}`}
                      style={hasTrackedFighter ? { border: '1px solid rgba(234, 179, 8, 0.6)', background: 'rgba(234, 179, 8, 0.08)' } : {}}
                    >
                      <UFCNameplate eventName={eventTitle} />

                      <div className="ufc-event-info" style={{ flex: 1, minWidth: 0, paddingLeft: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="ufc-event-name" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {eventTitle}
                          </span>
                          {hasTrackedFighter && (
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#eab308', background: 'rgba(234,179,8,0.2)', padding: '2px 6px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                              ⭐ Tracked
                            </span>
                          )}
                        </div>

                        <div className="ufc-event-meta" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span className="game-day" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dayStr}</span> • <span className="game-time">{timeStr}</span>
                        </div>

                        {game.headline && (
                          <div className="ufc-headline" style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--accent-green)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {game.headline}
                          </div>
                        )}

                        <div className="game-arena" style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                          {game.venue}
                        </div>
                      </div>

                      <div className="ufc-card-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="view-card-btn"
                          onClick={() => toggleExpand(game.id)}
                          style={{ fontSize: '11px', padding: '5px 8px' }}
                        >
                          <span>Card</span>
                          <span className={`chevron-icon ${isCardExpanded ? 'open' : ''}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </span>
                        </button>

                        <div 
                          className={`game-action ${isOff ? 'off' : ''}`}
                          onClick={() => onOpenAlarmModal && onOpenAlarmModal(game)}
                          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                          title={isOff ? "Reminder Off (Click to set alarms)" : `${activeCount} Alarm(s) Active (Click to edit)`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                          </svg>
                          {!isOff && <span className="bell-badge" style={{ fontSize: '9px' }}>{activeCount}</span>}
                        </div>
                      </div>
                    </div>

                    <FightCardExpander eventId={game.id} isExpanded={isCardExpanded} trackedTeams={trackedTeams} />
                  </div>
                );
              }

              // ========== REGULAR GAME CARD ==========
              return (
                <div key={game.id} className={`game-card ${index === 0 ? 'next-game' : ''}`}>
                  <div className="game-teams">
                    <div className="team-col">
                      <img src={game.awayTeam.logo} alt={game.awayTeam.abbreviation} className="team-logo" />
                      <span className="team-abbr">{game.awayTeam.abbreviation}</span>
                    </div>
                    <span className="vs-text">@</span>
                    <div className="team-col">
                      <img src={game.homeTeam.logo} alt={game.homeTeam.abbreviation} className="team-logo" />
                      <span className="team-abbr">{game.homeTeam.abbreviation}</span>
                    </div>
                  </div>
                  
                  <div className="game-divider"></div>
                  
                  <div className="game-info">
                    <span className="game-day">{dayStr}</span>
                    <span className="game-time">{timeStr}</span>
                    <span className="game-arena">{game.venue}</span>
                  </div>
                  
                  <div 
                    className={`game-action ${isOff ? 'off' : ''}`}
                    onClick={() => onOpenAlarmModal && onOpenAlarmModal(game)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title={isOff ? "Reminder Off (Click to set alarms)" : `${activeCount} Alarm(s) Active (Click to edit)`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span>{isOff ? 'Off' : `${activeCount} Set`}</span>
                    {!isOff && <span className="bell-badge">{activeCount}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
