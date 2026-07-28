import React, { useState, useEffect } from 'react';
import { SPORTS_LIST } from './SportSelector.jsx';
import { SUPPORTED_LEAGUES, LEAGUES_FLAT } from '../leagueManager.js';
import { fetchLeagueScoreboardForMonth, extractScoreString } from '../espnApi.js';

function getGameResultInfo(game, trackedTeams = []) {
  if (!game) return { isCompleted: false };

  const isCompleted = game.completed || game.status === 'STATUS_FULL_TIME' || game.status === 'STATUS_FINAL';
  
  const hStr = extractScoreString(game.homeScore);
  const aStr = extractScoreString(game.awayScore);
  const hasScores = hStr !== '' && aStr !== '';

  if (!isCompleted || !hasScores) {
    return {
      isCompleted: false,
      scoreText: ''
    };
  }

  const homeScoreNum = parseInt(hStr, 10);
  const awayScoreNum = parseInt(aStr, 10);

  const isTrackedHome = trackedTeams.some(t => String(t.id) === String(game.homeTeam.id));
  const isTrackedAway = trackedTeams.some(t => String(t.id) === String(game.awayTeam.id));

  let isWin = false;
  let isLoss = false;
  let isDraw = false;

  if (homeScoreNum === awayScoreNum) {
    isDraw = true;
  } else if (isTrackedHome && !isTrackedAway) {
    isWin = homeScoreNum > awayScoreNum;
    isLoss = homeScoreNum < awayScoreNum;
  } else if (isTrackedAway && !isTrackedHome) {
    isWin = awayScoreNum > homeScoreNum;
    isLoss = awayScoreNum < homeScoreNum;
  } else {
    isWin = homeScoreNum > awayScoreNum;
    isLoss = homeScoreNum < awayScoreNum;
  }

  return {
    isCompleted: true,
    scoreText: `${aStr} - ${hStr}`,
    isWin,
    isLoss,
    isDraw
  };
}

export default function CalendarModal({ 
  allTrackedGames = [], 
  trackedTeams = [],
  selectedSport = 'soccer', 
  selectedLeague = 'mls',
  gameReminders = {},
  onOpenAlarmModal
}) {
  const realToday = new Date();
  
  const [viewMode, setViewMode] = useState('tracked'); // 'tracked' | 'league'
  const [calYear, setCalYear] = useState(realToday.getFullYear());
  const [calMonth, setCalMonth] = useState(realToday.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(realToday.getDate());
  
  // League View States
  const [calSport, setCalSport] = useState(selectedSport);
  const [calLeague, setCalLeague] = useState(selectedLeague);
  const [leagueGames, setLeagueGames] = useState([]);
  const [loadingLeague, setLoadingLeague] = useState(false);

  // Sync initial sport/league props
  useEffect(() => {
    setCalSport(selectedSport);
    setCalLeague(selectedLeague);
  }, [selectedSport, selectedLeague]);

  // Load league games when in 'league' mode and month/year/league changes
  useEffect(() => {
    let isMounted = true;
    if (viewMode !== 'league') return;

    async function loadMonthlyLeagueData() {
      const activeLeagueData = LEAGUES_FLAT[calLeague] || LEAGUES_FLAT.mls;
      if (!activeLeagueData) return;

      setLoadingLeague(true);
      try {
        const games = await fetchLeagueScoreboardForMonth(activeLeagueData.sportSlug, calYear, calMonth);
        if (isMounted) {
          setLeagueGames(games || []);
        }
      } catch (err) {
        console.error('Error fetching monthly league games:', err);
      } finally {
        if (isMounted) setLoadingLeague(false);
      }
    }

    loadMonthlyLeagueData();
    return () => { isMounted = false; };
  }, [viewMode, calLeague, calYear, calMonth]);

  const handleSportChange = (newSportId) => {
    setCalSport(newSportId);
    const leaguesForSport = SUPPORTED_LEAGUES[newSportId] || SUPPORTED_LEAGUES.soccer;
    if (leaguesForSport && leaguesForSport.length > 0) {
      setCalLeague(leaguesForSport[0].id);
    }
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    setCalYear(realToday.getFullYear());
    setCalMonth(realToday.getMonth());
    setSelectedDay(realToday.getDate());
  };

  // Determine games source
  const sourceGames = viewMode === 'tracked' ? allTrackedGames : leagueGames;

  // Calendar Math
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Map games by day of the target month
  const gamesByDayMap = {};
  sourceGames.forEach(g => {
    if (!g || !g.date) return;
    const d = new Date(g.date);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const dayNum = d.getDate();
      if (!gamesByDayMap[dayNum]) gamesByDayMap[dayNum] = [];
      gamesByDayMap[dayNum].push(g);
    }
  });

  // Selected date games
  const selectedDateGames = gamesByDayMap[selectedDay] || [];
  const selectedDateObj = new Date(calYear, calMonth, selectedDay);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const availableLeagues = SUPPORTED_LEAGUES[calSport] || SUPPORTED_LEAGUES.soccer;

  return (
    <div className="calendar-modal-container">
      {/* Mode Sub-Tabs */}
      <div className="modal-tabs" style={{ marginBottom: '10px' }}>
        <button 
          className={`tab-btn ${viewMode === 'tracked' ? 'active' : ''}`}
          onClick={() => setViewMode('tracked')}
        >
          ⭐ Tracked Teams
        </button>
        <button 
          className={`tab-btn ${viewMode === 'league' ? 'active' : ''}`}
          onClick={() => setViewMode('league')}
        >
          🏆 League View
        </button>
      </div>

      {/* Sport & League Selectors in League Mode */}
      {viewMode === 'league' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
              Sport
            </label>
            <select 
              value={calSport} 
              onChange={(e) => handleSportChange(e.target.value)} 
              className="team-select"
            >
              {SPORTS_LIST.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
              League
            </label>
            <select 
              value={calLeague} 
              onChange={(e) => setCalLeague(e.target.value)} 
              className="team-select"
            >
              {availableLeagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Month Navigator Header */}
      <div className="calendar-nav-bar flex-between" style={{ marginBottom: '10px' }}>
        <button className="icon-btn" onClick={handlePrevMonth} title="Previous Month" style={{ width: '32px', height: '32px' }}>
          &lt;
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {monthNames[calMonth]} {calYear}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="tab-btn" 
            onClick={handleJumpToToday}
            style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.1)' }}
          >
            Today
          </button>
          <button className="icon-btn" onClick={handleNextMonth} title="Next Month" style={{ width: '32px', height: '32px' }}>
            &gt;
          </button>
        </div>
      </div>

      {/* 7-Column Calendar Grid */}
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}

        {/* Empty Padding Cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty"></div>
        ))}

        {/* Day Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const isToday = calYear === realToday.getFullYear() && calMonth === realToday.getMonth() && dayNum === realToday.getDate();
          const isSelected = selectedDay === dayNum;
          const dayGames = gamesByDayMap[dayNum] || [];
          const hasGames = dayGames.length > 0;
          const primaryGame = dayGames[0];
          const extraCount = dayGames.length - 1;
          const resultInfo = primaryGame ? getGameResultInfo(primaryGame, trackedTeams) : null;

          return (
            <div 
              key={dayNum} 
              className={`calendar-cell ${isToday ? 'current-day' : ''} ${isSelected ? 'selected-day' : ''} ${hasGames ? 'has-games' : ''}`}
              onClick={() => setSelectedDay(dayNum)}
            >
              <div className="cell-top-bar">
                <span className="cell-day-num">{dayNum}</span>
                {extraCount > 0 && (
                  <span className="mini-more-badge">+{extraCount}</span>
                )}
              </div>

              {hasGames && primaryGame && (
                <div className="mini-game-card">
                  <div className="mini-logos-row">
                    <img src={primaryGame.awayTeam.logo} alt={primaryGame.awayTeam.abbreviation} className="mini-logo" />
                    <span className="mini-vs">@</span>
                    <img src={primaryGame.homeTeam.logo} alt={primaryGame.homeTeam.abbreviation} className="mini-logo" />
                  </div>
                  
                  {resultInfo && resultInfo.isCompleted ? (
                    <div className={`mini-score ${resultInfo.isWin ? 'mini-win' : (resultInfo.isLoss ? 'mini-loss' : '')}`}>
                      {resultInfo.scoreText}
                    </div>
                  ) : (
                    <div className="mini-time">
                      {new Date(primaryGame.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Match Details Panel */}
      <div className="calendar-details-panel" style={{ marginTop: '12px' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            📅 {selectedDateFormatted}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-green)' }}>
            {selectedDateGames.length} match(es)
          </span>
        </div>

        <div className="modal-game-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
          {loadingLeague && viewMode === 'league' ? (
            <div className="empty-state">Loading monthly matches...</div>
          ) : selectedDateGames.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0', fontSize: '12px' }}>
              No matches scheduled for {selectedDateFormatted}.
            </div>
          ) : (
            selectedDateGames.map(game => {
              const gameDate = new Date(game.date);
              const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              
              const activeAlarms = Array.isArray(gameReminders[game.id]) 
                ? gameReminders[game.id] 
                : (gameReminders[game.id] && gameReminders[game.id] !== 'off' ? [gameReminders[game.id]] : []);
              const activeCount = activeAlarms.length;
              const isOff = activeCount === 0;
              const resInfo = getGameResultInfo(game, trackedTeams);

              return (
                <div key={game.id} className="game-card" style={{ marginBottom: '6px', padding: '8px 12px' }}>
                  <div className="game-teams">
                    <div className="team-col">
                      <img src={game.awayTeam.logo} alt={game.awayTeam.abbreviation} className="team-logo" style={{ width: '22px', height: '22px' }} />
                      <span className="team-abbr" style={{ fontSize: '10px' }}>{game.awayTeam.abbreviation}</span>
                    </div>
                    <span className="vs-text">@</span>
                    <div className="team-col">
                      <img src={game.homeTeam.logo} alt={game.homeTeam.abbreviation} className="team-logo" style={{ width: '22px', height: '22px' }} />
                      <span className="team-abbr" style={{ fontSize: '10px' }}>{game.homeTeam.abbreviation}</span>
                    </div>
                  </div>

                  <div className="game-divider"></div>

                  <div className="game-info">
                    {resInfo.isCompleted ? (
                      <span className={`game-time ${resInfo.isWin ? 'text-green' : (resInfo.isLoss ? 'text-loss' : '')}`} style={{ fontSize: '13px', fontWeight: '800' }}>
                        {resInfo.scoreText} (FT)
                      </span>
                    ) : (
                      <span className="game-time" style={{ fontSize: '12px' }}>{timeStr}</span>
                    )}
                    <span className="game-arena" style={{ fontSize: '9px' }}>{game.venue}</span>
                  </div>

                  <div 
                    className={`game-action ${isOff ? 'off' : ''}`}
                    onClick={() => onOpenAlarmModal && onOpenAlarmModal(game)}
                    style={{ cursor: 'pointer', userSelect: 'none', padding: '4px 8px', fontSize: '10px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={isOff ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span>{isOff ? 'Off' : `${activeCount}`}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
