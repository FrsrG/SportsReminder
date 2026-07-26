import React, { useState, useEffect } from 'react';
import { generateICS, downloadICSFile } from '../icsGenerator.js';
import { fetchTeamScheduleForSport, LEAGUES_FLAT, SUPPORTED_LEAGUES, loadLeagueTeams } from '../leagueManager.js';
import { extractGamesForTeams } from '../espnApi.js';
import { SPORTS_LIST } from './SportSelector.jsx';

export default function ExportModal({ allTeams = [], trackedTeams = [], apiData, selectedSport = 'soccer', selectedLeague = 'mls' }) {
  const [activeTab, setActiveTab] = useState('tracked'); // 'tracked' | 'all'
  const [exportingTeamId, setExportingTeamId] = useState(null);
  
  // Dropdown states for "All Teams" tab
  const [exportSport, setExportSport] = useState(selectedSport);
  const [exportLeague, setExportLeague] = useState(selectedLeague);
  const [leagueTeams, setLeagueTeams] = useState(allTeams);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Sync initial prop values when modal opens or props change
  useEffect(() => {
    setExportSport(selectedSport);
    setExportLeague(selectedLeague);
  }, [selectedSport, selectedLeague]);

  // Load teams whenever exportLeague changes
  useEffect(() => {
    let isMounted = true;
    async function loadTeams() {
      const currentLeagueData = LEAGUES_FLAT[exportLeague] || LEAGUES_FLAT.mls;
      if (!currentLeagueData) return;
      
      setLoadingTeams(true);
      try {
        const teams = await loadLeagueTeams(currentLeagueData.sportSlug);
        if (isMounted) {
          setLeagueTeams(teams || []);
        }
      } catch (err) {
        console.error('Error loading teams for export modal:', err);
      } finally {
        if (isMounted) setLoadingTeams(false);
      }
    }
    loadTeams();
    return () => { isMounted = false; };
  }, [exportLeague]);

  const handleSportChange = (newSportId) => {
    setExportSport(newSportId);
    const leaguesForSport = SUPPORTED_LEAGUES[newSportId] || SUPPORTED_LEAGUES.soccer;
    if (leaguesForSport && leaguesForSport.length > 0) {
      setExportLeague(leaguesForSport[0].id);
    }
  };

  const availableLeagues = SUPPORTED_LEAGUES[exportSport] || SUPPORTED_LEAGUES.soccer;
  const currentLeagueData = LEAGUES_FLAT[exportLeague] || LEAGUES_FLAT.mls;
  const defaultSportSlug = currentLeagueData ? currentLeagueData.sportSlug : 'soccer/usa.1';

  const isIndividualSport = exportLeague === 'ufc' || exportLeague === 'pga';
  const displayTeams = activeTab === 'tracked' ? trackedTeams : leagueTeams;
  
  const handleExport = async (team) => {
    setExportingTeamId(team.id);
    try {
      const sportSlug = team.sportSlug || defaultSportSlug;

      // 1. Fetch team's full season schedule
      let fullScheduleGames = await fetchTeamScheduleForSport(sportSlug, team.id);
      
      // 2. Also check scoreboard games
      let scoreboardGames = extractGamesForTeams(apiData, [team]);
      
      // 3. Combine games and remove duplicates
      const gamesMap = new Map();
      scoreboardGames.forEach(g => { if (g && g.id) gamesMap.set(g.id, g); });
      fullScheduleGames.forEach(g => { if (g && g.id) gamesMap.set(g.id, g); });
      
      const allGames = Array.from(gamesMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (allGames.length === 0) {
        alert(`No scheduled games found for ${team.name}.`);
        setExportingTeamId(null);
        return;
      }
      
      const icsString = generateICS(team.name, allGames);
      const filename = `${team.name.replace(/\s+/g, '_')}_Schedule.ics`;
      downloadICSFile(filename, icsString);
    } catch (err) {
      console.error('Error exporting schedule:', err);
      alert(`Failed to export schedule for ${team.name}. Please try again.`);
    } finally {
      setExportingTeamId(null);
    }
  };
  
  return (
    <>
      <div className="modal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracked')}
        >
          Tracked Teams ({trackedTeams.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Teams
        </button>
      </div>

      {/* Sport and League Selectors inside All Teams tab */}
      {activeTab === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', marginBottom: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              Sport
            </label>
            <select
              value={exportSport}
              onChange={(e) => handleSportChange(e.target.value)}
              className="team-select"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {SPORTS_LIST.map(sport => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              League
            </label>
            <select
              value={exportLeague}
              onChange={(e) => setExportLeague(e.target.value)}
              className="team-select"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {availableLeagues.map(league => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <div className="modal-team-list" style={{ marginTop: '8px' }}>
        {activeTab === 'all' && isIndividualSport ? (
          <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
              {exportLeague === 'ufc' ? '🥊' : '⛳'}
            </div>
            <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>
              {currentLeagueData?.name || 'Individual Sport'} Events
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              {exportLeague === 'ufc' 
                ? 'UFC events do not feature team rosters. Full fight cards are available directly in your Schedule tab.' 
                : 'PGA Tournaments do not feature team rosters. Full tournament schedules are available directly in your Schedule tab.'}
            </div>
          </div>
        ) : loadingTeams && activeTab === 'all' ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            Loading teams for {currentLeagueData?.name || 'league'}...
          </div>
        ) : displayTeams.length === 0 ? (
          <div className="empty-state">No teams found in this category.</div>
        ) : (
          displayTeams.map(team => {
            const isExporting = exportingTeamId === team.id;
            const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
            return (
              <div key={team.id} className="modal-team-item">
                <div className="team-info">
                  <img src={logoUrl} alt={team.abbreviation || team.name} className="team-logo" />
                  <span className="team-name">{team.name}</span>
                </div>
                <button 
                  className="export-btn" 
                  onClick={() => handleExport(team)}
                  disabled={isExporting}
                  style={{ opacity: isExporting ? 0.7 : 1, cursor: isExporting ? 'wait' : 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  {isExporting ? 'Exporting...' : 'Export .ics'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
