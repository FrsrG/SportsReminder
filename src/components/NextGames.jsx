import React from 'react';

const TIMING_SEQUENCE = ['15m', '30m', '45m', '1h', 'off'];

export default function NextGames({ games, onViewFullSchedule, reminderLeadTime, gameReminders = {}, onToggleGameReminder, limit = 5 }) {
  const displayGames = limit ? (games ? games.slice(0, limit) : []) : (games || []);

  return (
    <section className="section">
      <div className="section-header flex-between">
        <h2>NEXT GAMES</h2>
        {onViewFullSchedule && (
          <a href="#" className="link-text text-green" onClick={(e) => { e.preventDefault(); onViewFullSchedule(); }}>
            View Full Schedule 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        )}
      </div>
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
            
            // Per-game reminder setting (defaults to overall reminderLeadTime if not set)
            const currentSetting = gameReminders[game.id] !== undefined ? gameReminders[game.id] : reminderLeadTime;
            const isOff = currentSetting === 'off';

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
                  onClick={() => onToggleGameReminder && onToggleGameReminder(game.id, currentSetting)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title={isOff ? "Reminder Off (Click to set)" : `Reminder set for ${currentSetting} before match (Click to cycle)`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>{isOff ? 'Off' : currentSetting}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
