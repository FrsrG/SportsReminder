import React, { useState } from 'react';
import { LEAGUES_FLAT } from '../leagueManager.js';
import CustomTeamModal from './CustomTeamModal.jsx';
import { UFC_WEIGHT_CLASSES } from '../data/ufcActiveFighters.js';

export default function FavoritesModal({ 
  allTeams = [], 
  trackedTeams = [], 
  onToggleTracked, 
  selectedLeague = 'mls',
  selectedSport = 'soccer',
  onSaveCustomTeam 
}) {
  const [query, setQuery] = useState('');
  const [selectedWeightClass, setSelectedWeightClass] = useState('All');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  const leagueData = LEAGUES_FLAT[selectedLeague];
  const leagueName = leagueData ? leagueData.name : 'League';
  const isUFC = selectedLeague === 'ufc' || selectedSport === 'mma';
  const isPGA = selectedLeague === 'pga' || selectedSport === 'golf';

  const filtered = allTeams.filter(t => {
    const nameMatch = (t.name || '').toLowerCase().includes(query.toLowerCase());
    const abbrMatch = (t.abbreviation || '').toLowerCase().includes(query.toLowerCase());
    const weightMatch = !isUFC || selectedWeightClass === 'All' || t.weightClass === selectedWeightClass;
    return (nameMatch || abbrMatch) && weightMatch;
  });

  return (
    <>
      {isUFC && (
        <div className="ufc-weight-class-tabs" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', scrollbarWidth: 'none' }}>
          {UFC_WEIGHT_CLASSES.map(wc => (
            <button
              key={wc}
              type="button"
              className={`weight-tab-btn ${selectedWeightClass === wc ? 'active' : ''}`}
              onClick={() => setSelectedWeightClass(wc)}
              style={{
                fontSize: '11px',
                fontWeight: selectedWeightClass === wc ? '700' : '500',
                padding: '5px 10px',
                borderRadius: '16px',
                border: selectedWeightClass === wc ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                background: selectedWeightClass === wc ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-tertiary)',
                color: selectedWeightClass === wc ? 'var(--accent-green)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {wc}
            </button>
          ))}
        </div>
      )}

      {!isPGA && (
        <input 
          type="text" 
          className="search-input" 
          placeholder={isUFC ? "Search active UFC fighters..." : `Search ${leagueName} teams...`} 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      <div className="modal-team-list" style={{ marginTop: '12px', maxHeight: '280px', overflowY: 'auto' }}>
        {isPGA ? (
          <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⛳</div>
            <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>
              PGA Tour Event Tracking Active
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              PGA Tour is an individual golf tournament sport. All upcoming PGA Tournaments are automatically tracked in your schedule!
            </div>
          </div>
        ) : allTeams.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto', width: '20px', height: '20px', border: '2px solid rgba(74, 222, 128, 0.3)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            Fetching {isUFC ? 'active fighters' : 'teams'} for {leagueName}...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No matching {isUFC ? 'fighters' : 'teams'} found for "{query}".</div>
        ) : (
          filtered.map(team => {
            const currentSlug = team.sportSlug || (leagueData ? leagueData.sportSlug : '');
            const teamWithSlug = { ...team, sportSlug: currentSlug };
            
            const isTracked = trackedTeams.some(t => 
              String(t.id) === String(teamWithSlug.id) && 
              (
                t.sportSlug === teamWithSlug.sportSlug ||
                (t.sportSlug && teamWithSlug.sportSlug && t.sportSlug.startsWith('mma') && teamWithSlug.sportSlug.startsWith('mma')) ||
                (t.sportSlug && teamWithSlug.sportSlug && t.sportSlug.startsWith('racing') && teamWithSlug.sportSlug.startsWith('racing'))
              )
            );
            
            const starFill = isTracked ? 'currentColor' : 'none';
            const starClass = isTracked ? 'star-btn starred' : 'star-btn';
            const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
            
            return (
              <div key={`${teamWithSlug.sportSlug || 'team'}-${teamWithSlug.id}`} className="modal-team-item">
                <div className="team-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={logoUrl} 
                    alt={team.name} 
                    className="team-logo" 
                    style={isUFC ? { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' } : {}}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="18" fill="%232c2c2e"/><path d="M18 9C14.6863 9 12 11.6863 12 15C12 18.3137 14.6863 21 18 21C21.3137 21 24 18.3137 24 15C24 11.6863 21.3137 9 18 9Z" fill="%23a1a1aa"/><path d="M9 30C9 25.0294 13.0294 21 18 21C22.9706 21 27 25.0294 27 30" fill="%23a1a1aa"/></svg>';
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="team-name" style={{ fontSize: '13px', fontWeight: '600' }}>{team.name}</span>
                    {isUFC && team.weightClass && (
                      <span className="weight-class-pill" style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '500' }}>
                        {team.weightClass}
                      </span>
                    )}
                  </div>
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
