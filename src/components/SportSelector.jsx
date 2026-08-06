import React, { useState } from 'react';
import { SUPPORTED_LEAGUES } from '../leagueManager.js';

export const SPORTS_LIST = [
  { id: 'soccer', name: 'Soccer', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'football', name: 'Football', icon: '🏈' },
  { id: 'hockey', name: 'Hockey', icon: '🏒' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'racing', name: 'Racing', icon: '🏎️' },
  { id: 'mma', name: 'Combat', icon: '🥊' },
  { id: 'golf', name: 'Golf', icon: '⛳' }
];

export default function SportSelector({ selectedSport, hiddenLeagues = [], onSelectSport }) {
  const [isOpen, setIsOpen] = useState(false);

  // A sport is visible if at least ONE of its leagues is NOT hidden
  const availableSports = SPORTS_LIST.filter(sport => {
    const leagues = SUPPORTED_LEAGUES[sport.id] || [];
    if (leagues.length === 0) return true;
    return leagues.some(l => !hiddenLeagues.includes(l.id));
  });

  const displaySports = availableSports.length > 0 ? availableSports : SPORTS_LIST;
  const currentSport = displaySports.find(s => s.id === selectedSport) || displaySports[0];

  return (
    <section className="section">
      <div className="section-header">
        <h2>SPORT</h2>
      </div>
      <div className="dropdown-selector-wrapper" style={{ position: 'relative', zIndex: isOpen ? 100 : 1 }}>
        <div 
          className="league-selector" 
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="league-info">
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{currentSport ? currentSport.icon : '🏆'}</span>
            <span className="league-name">{currentSport ? currentSport.name : 'Select Sport'}</span>
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
              background: '#2c2c2e',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              zIndex: 1000,
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden'
            }}
          >
            {displaySports.map(sport => (
              <div
                key={sport.id}
                onClick={() => {
                  onSelectSport(sport.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: sport.id === currentSport?.id ? 'var(--bg-hover)' : 'transparent',
                  color: sport.id === currentSport?.id ? 'var(--accent-green)' : 'var(--text-primary)',
                  fontWeight: sport.id === currentSport?.id ? '600' : '400',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = sport.id === currentSport?.id ? 'var(--bg-hover)' : 'transparent'}
              >
                <span style={{ fontSize: '18px' }}>{sport.icon}</span>
                <span>{sport.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
