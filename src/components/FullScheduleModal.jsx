import React, { useState } from 'react';
import FightCardExpander from './FightCardExpander.jsx';
import F1Nameplate from './F1Nameplate.jsx';
import { getGrandPrixCountryCode } from '../espnApi.js';

export default function FullScheduleModal({ allTrackedGames, reminderLeadTime, gameReminders = {}, onOpenAlarmModal }) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [expandedCards, setExpandedCards] = useState({});

  const now = new Date();

  const toggleExpand = (gameId) => {
    setExpandedCards(prev => ({ ...prev, [gameId]: !prev[gameId] }));
  };

  // Filter Upcoming vs Past games
  const upcomingGames = allTrackedGames.filter(g => {
    const isCompleted = g.completed || g.status === 'STATUS_FULL_TIME' || g.status === 'STATUS_FINAL';
    const matchEndTimeMs = new Date(g.date).getTime() + (2.5 * 60 * 60 * 1000);
    return !isCompleted && matchEndTimeMs >= now.getTime();
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastGames = allTrackedGames.filter(g => {
    const isCompleted = g.completed || g.status === 'STATUS_FULL_TIME' || g.status === 'STATUS_FINAL';
    const matchEndTimeMs = new Date(g.date).getTime() + (2.5 * 60 * 60 * 1000);
    return isCompleted || matchEndTimeMs < now.getTime();
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const displayGames = activeTab === 'upcoming' ? upcomingGames : pastGames;

  return (
    <div className="full-schedule-container">
      {/* Sleek Sub-Tabs */}
      <div className="modal-tabs" style={{ marginBottom: '12px' }}>
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          📅 Upcoming ({upcomingGames.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          🏁 Past Results ({pastGames.length})
        </button>
      </div>

      {/* Game List */}
      <div className="modal-game-list" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
        {displayGames.length === 0 ? (
          <div className="empty-state">
            {activeTab === 'upcoming' ? 'No upcoming games scheduled.' : 'No past game results available.'}
          </div>
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
              dayStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            }

            const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

            const activeAlarms = Array.isArray(gameReminders[game.id]) 
              ? gameReminders[game.id] 
              : (gameReminders[game.id] && gameReminders[game.id] !== 'off' ? [gameReminders[game.id]] : []);
            
            const activeCount = activeAlarms.length;
            const isOff = activeCount === 0;
            const isCardExpanded = !!expandedCards[game.id];

            // ========== F1 / RACING EVENT CARD ==========
            const isRacing = game.isRacing || game.sportSlug === 'racing/f1' || game.sportSlug === 'racing';

            if (isRacing) {
              const eventTitle = game.eventName || (game.homeTeam ? game.homeTeam.name : 'Grand Prix');
              const countryCode = game.countryCode || getGrandPrixCountryCode(eventTitle, game.venue);

              return (
                <div key={game.id} className="game-card f1-event-card" style={{ marginBottom: '8px' }}>
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
                    {activeTab === 'upcoming' ? (
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
                    ) : (
                      <div className="status-final-badge" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        🏁 FINAL
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ========== UFC EVENT CARD ==========
            if (game.isUFC) {
              return (
                <div key={game.id} style={{ marginBottom: '8px' }}>
                  <div className="ufc-event-card" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--list-radius)', borderBottom: 'none' }}>
                    <div className="ufc-card-top">
                      <div className="ufc-event-info">
                        <span className="ufc-event-name">{game.eventName || 'UFC Event'}</span>
                        <span className="ufc-event-date">{dayStr} • {timeStr}</span>
                        {game.headline && (
                          <span className="ufc-headline">{game.headline}</span>
                        )}
                        <span className="ufc-venue">{game.venue}</span>
                      </div>
                    </div>

                    <div className="ufc-card-actions">
                      <button
                        className="view-card-btn"
                        onClick={() => toggleExpand(game.id)}
                      >
                        <span>View Card</span>
                        <span className={`chevron-icon ${isCardExpanded ? 'open' : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </span>
                      </button>

                      {activeTab === 'upcoming' ? (
                        <div 
                          className={`game-action ${isOff ? 'off' : ''}`}
                          onClick={() => onOpenAlarmModal && onOpenAlarmModal(game)}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                          </svg>
                          <span>{isOff ? 'Off' : `${activeCount} Set`}</span>
                          {!isOff && <span className="bell-badge">{activeCount}</span>}
                        </div>
                      ) : (
                        <div className="game-action off" style={{ cursor: 'default' }}>
                          <span>FT</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <FightCardExpander eventId={game.id} isExpanded={isCardExpanded} />
                </div>
              );
            }

            // ========== REGULAR GAME CARD ==========
            return (
              <div key={game.id} className="game-card" style={{ marginBottom: '8px' }}>
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

                {activeTab === 'upcoming' ? (
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
                ) : (
                  <div className="game-action off" style={{ cursor: 'default', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                    <span>FT</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
