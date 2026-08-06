import React, { useState } from 'react';
import { SPORTS_LIST } from './SportSelector.jsx';
import { SUPPORTED_LEAGUES } from '../leagueManager.js';
import { scrapeScheduleFromUrl } from '../utils/customScheduleScraper.js';

export default function ManageLeaguesModal({
  selectedSport = 'soccer',
  selectedLeague = 'mls',
  hiddenLeagues = [],
  onToggleHideLeague,
  customTeams = [],
  onUpdateCustomTeam,
  onDeleteCustomTeam
}) {
  const [activeSport, setActiveSport] = useState(selectedSport);
  const [editingTeamId, setEditingTeamId] = useState(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [isReScraping, setIsReScraping] = useState(false);
  const [editError, setEditError] = useState('');

  const builtInLeagues = SUPPORTED_LEAGUES[activeSport] || [];
  const currentSportCustomTeams = customTeams.filter(t => (t.sportCategory || 'soccer') === activeSport);

  const startEditing = (team) => {
    setEditingTeamId(team.id);
    setEditName(team.name || '');
    setEditLogo(team.logo || '');
    setEditUrl(team.scheduleUrl || '');
    setEditVenue(team.venue || '');
    setEditError('');
  };

  const cancelEditing = () => {
    setEditingTeamId(null);
    setEditError('');
  };

  const handleSaveEdit = async (team) => {
    setEditError('');
    if (!editName.trim()) {
      setEditError('Team name cannot be empty.');
      return;
    }

    let updatedGames = null;
    if (editUrl.trim() && editUrl.trim() !== (team.scheduleUrl || '')) {
      setIsReScraping(true);
      try {
        const scrapeRes = await scrapeScheduleFromUrl(editUrl.trim(), editName.trim());
        if (scrapeRes && scrapeRes.games) {
          updatedGames = scrapeRes.games;
        }
      } catch (err) {
        console.warn('Schedule re-scrape warning:', err);
      } finally {
        setIsReScraping(false);
      }
    }

    const updatedTeam = {
      ...team,
      name: editName.trim(),
      leagueName: editName.trim() + ' League',
      logo: editLogo.trim() || team.logo,
      scheduleUrl: editUrl.trim(),
      venue: editVenue.trim()
    };

    onUpdateCustomTeam(updatedTeam, updatedGames);
    setEditingTeamId(null);
  };

  return (
    <div className="manage-leagues-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sport Selector Bar */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
          Filter by Sport
        </label>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {SPORTS_LIST.map(s => {
            const isActive = s.id === activeSport;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setActiveSport(s.id); setEditingTeamId(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                  background: isActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Built-in Leagues */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
          🏆 Extension Built-in Leagues
        </div>

        {builtInLeagues.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No built-in leagues available for this sport.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {builtInLeagues.map(league => {
              const isHidden = hiddenLeagues.includes(league.id);
              return (
                <div 
                  key={league.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {league.logo ? (
                      <img src={league.logo} alt={league.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#3a3a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                        {league.name.substring(0, 2)}
                      </div>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                      {league.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isHidden ? '#ef4444' : 'var(--accent-green)' }}>
                      {isHidden ? 'Hidden' : 'Visible'}
                    </span>
                    <label className="ios-switch">
                      <input 
                        type="checkbox" 
                        checked={!isHidden} 
                        onChange={() => onToggleHideLeague(league.id, activeSport)} 
                      />
                      <span className="ios-slider"></span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Custom Added Leagues & Teams */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
          ⭐ Custom Added Leagues & Teams
        </div>

        {currentSportCustomTeams.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 0' }}>
            No custom teams/leagues added for this sport yet. Use "+ Add Team" on main popup to add non-ESPN teams!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentSportCustomTeams.map(team => {
              const isEditing = editingTeamId === team.id;
              return (
                <div 
                  key={team.id} 
                  style={{ 
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Summary Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={team.logo} alt={team.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{team.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{team.leagueName || 'Custom League'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => isEditing ? cancelEditing() : startEditing(team)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #3870b2',
                          background: isEditing ? 'rgba(56,112,178,0.3)' : 'rgba(56,112,178,0.15)',
                          color: '#60a5fa',
                          cursor: 'pointer'
                        }}
                      >
                        {isEditing ? 'Cancel' : '✏️ Edit'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete custom team "${team.name}" and its schedule?`)) {
                            onDeleteCustomTeam(team.id);
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #ef4444',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Panel */}
                  {isEditing && (
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {editError && (
                        <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>{editError}</div>
                      )}

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Team / League Name</label>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Logo / Image URL</label>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={editLogo}
                          onChange={(e) => setEditLogo(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Schedule / iCal URL</label>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Venue Name (Optional)</label>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={editVenue}
                          onChange={(e) => setEditVenue(e.target.value)}
                          placeholder="Arena Name"
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="cancel-team-btn"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="export-btn"
                          style={{ fontSize: '11px', padding: '4px 12px' }}
                          disabled={isReScraping}
                          onClick={() => handleSaveEdit(team)}
                        >
                          {isReScraping ? 'Syncing...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
