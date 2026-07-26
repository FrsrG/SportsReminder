import React, { useState } from 'react';
import { SUPPORTED_LEAGUES } from '../leagueManager.js';

export default function LeagueSelector({ selectedSport = 'soccer', selectedLeague = 'mls', onSelectLeague }) {
  const [isOpen, setIsOpen] = useState(false);

  const availableLeagues = SUPPORTED_LEAGUES[selectedSport] || SUPPORTED_LEAGUES.soccer;
  const currentLeague = availableLeagues.find(l => l.id === selectedLeague) || availableLeagues[0];

  return (
    <section className="section">
      <div className="section-header">
        <h2>LEAGUE</h2>
      </div>
      <div className="dropdown-selector-wrapper" style={{ position: 'relative' }}>
        <div 
          className="league-selector" 
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="league-info">
            {currentLeague.logo ? (
              <img 
                src={currentLeague.logo} 
                alt={currentLeague.name} 
                style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
              />
            ) : (
              <div className="league-logo mls-logo">{currentLeague.name.substring(0, 3)}</div>
            )}
            <span className="league-name">{currentLeague.name}</span>
          </div>
          <svg 
            className="chevron" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        {isOpen && (
          <div 
            className="dropdown-menu-list"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              zIndex: 50,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
          >
            {availableLeagues.map(league => (
              <div
                key={league.id}
                onClick={() => {
                  onSelectLeague(league.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: league.id === currentLeague.id ? 'var(--bg-hover)' : 'transparent',
                  color: league.id === currentLeague.id ? 'var(--accent-green)' : 'var(--text-primary)',
                  fontWeight: league.id === currentLeague.id ? '600' : '400',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = league.id === currentLeague.id ? 'var(--bg-hover)' : 'transparent'}
              >
                <img 
                  src={league.logo} 
                  alt={league.name} 
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }} 
                />
                <span>{league.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
