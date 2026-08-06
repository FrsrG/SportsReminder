import React, { useState } from 'react';
import { LEAGUES_FLAT } from '../leagueManager.js';
import CustomTeamModal from './CustomTeamModal.jsx';

export default function FavoritesModal({ 
  allTeams = [], 
  trackedTeams = [], 
  onToggleTracked, 
  selectedLeague = 'mls',
  selectedSport = 'soccer',
  onSaveCustomTeam 
}) {
  const [query, setQuery] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  const leagueData = LEAGUES_FLAT[selectedLeague];
  const leagueName = leagueData ? leagueData.name : 'League';
  const isIndividualSport = selectedLeague === 'pga';

  const filtered = allTeams.filter(t => {
    const nameMatch = (t.name || '').toLowerCase().includes(query.toLowerCase());
    const abbrMatch = (t.abbreviation || '').toLowerCase().includes(query.toLowerCase());
    return nameMatch || abbrMatch;
  });

  return (
    <>
      {!isIndividualSport && (
        <input 
          type="text" 
          className="search-input" 
          placeholder={`Search ${leagueName} teams...`} 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      <div className="modal-team-list" style={{ marginTop: '12px' }}>
        {isIndividualSport ? (
          <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
              {selectedLeague === 'ufc' ? '🥊' : '⛳'}
            </div>
            <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>
              {leagueName} Event Tracking Active
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              {selectedLeague === 'ufc' 
                ? 'UFC is an individual combat sport. All upcoming Fight Nights and PPV event cards are automatically tracked in your schedule!' 
                : 'PGA Tour is an individual golf tournament sport. All upcoming PGA Tournaments are automatically tracked in your schedule!'}
            </div>
          </div>
        ) : allTeams.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto', width: '20px', height: '20px', border: '2px solid rgba(74, 222, 128, 0.3)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            Fetching teams for {leagueName}...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No matching {leagueName} teams found for "{query}".</div>
        ) : (
          filtered.map(team => {
            const currentSlug = team.sportSlug || (leagueData ? leagueData.sportSlug : '');
            const teamWithSlug = { ...team, sportSlug: currentSlug };
            
            const isTracked = trackedTeams.some(t => 
              String(t.id) === String(teamWithSlug.id) && 
              (t.sportSlug && teamWithSlug.sportSlug ? t.sportSlug === teamWithSlug.sportSlug : true)
            );
            
            const starFill = isTracked ? 'currentColor' : 'none';
            const starClass = isTracked ? 'star-btn starred' : 'star-btn';
            const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
            
            return (
              <div key={`${teamWithSlug.sportSlug || 'team'}-${teamWithSlug.id}`} className="modal-team-item">
                <div className="team-info">
                  <img src={logoUrl} alt={team.abbreviation || team.name} className="team-logo" />
                  <span className="team-name">{team.name}</span>
                  {team.isCustom && <span className="custom-badge" style={{ marginLeft: '6px' }}>Custom</span>}
                </div>
                <button className={starClass} onClick={() => onToggleTracked(teamWithSlug)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={starFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>
              </div>
            );
          })
        )}

        {/* Add Custom Team Button at bottom of search list */}
        <div style={{ padding: '12px 0 4px 0', borderTop: '0.5px solid var(--border-color)', marginTop: '12px' }}>
          <button 
            type="button" 
            className="add-custom-team-pill-btn"
            onClick={() => setIsCustomModalOpen(true)}
          >
            <span className="plus-icon">＋</span> Add Custom Team Schedule
          </button>
        </div>
      </div>

      <CustomTeamModal 
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaveCustomTeam={onSaveCustomTeam}
        currentSport={selectedSport}
      />
    </>
  );
}
