import React, { useState } from 'react';
import { scrapeScheduleFromUrl, DEFAULT_CUSTOM_LOGO } from '../utils/customScheduleScraper.js';

const SPORT_OPTIONS = [
  { slug: 'soccer', name: 'Soccer' },
  { slug: 'football', name: 'Football' },
  { slug: 'basketball', name: 'Basketball' },
  { slug: 'baseball', name: 'Baseball' },
  { slug: 'hockey', name: 'Hockey' },
  { slug: 'racing', name: 'Racing' },
  { slug: 'mma', name: 'Combat Sports / MMA' },
  { slug: 'golf', name: 'Golf' }
];

export default function CustomTeamModal({ isOpen, onClose, onSaveCustomTeam, currentSport = 'soccer' }) {
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [sportCategory, setSportCategory] = useState(currentSport || 'soccer');
  const [logoUrl, setLogoUrl] = useState('');
  const [scrapedGames, setScrapedGames] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStartScrape = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setErrorMsg('Please enter a team name.');
      return;
    }
    if (!leagueName.trim()) {
      setErrorMsg('Please enter a custom league name.');
      return;
    }
    if (!scheduleUrl.trim()) {
      setErrorMsg('Please enter a valid schedule URL.');
      return;
    }

    setErrorMsg('');
    setStep(2);
    setIsScraping(true);

    try {
      const result = await scrapeScheduleFromUrl(scheduleUrl, teamName);
      setScrapedGames(result.games || []);
      setLogoUrl(result.logo || DEFAULT_CUSTOM_LOGO);
      setStep(3);
    } catch (err) {
      console.error('Error scraping custom schedule:', err);
      setErrorMsg('Could not parse schedule. Please verify the URL and try again.');
      setStep(1);
    } finally {
      setIsScraping(false);
    }
  };

  const handleRemoveGame = (indexToRemove) => {
    setScrapedGames(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = () => {
    const finalLogo = logoUrl || DEFAULT_CUSTOM_LOGO;
    const leagueId = `custom-${leagueName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const teamId = `custom-${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    const teamData = {
      id: teamId,
      name: teamName,
      shortName: teamName,
      abbreviation: teamName.substring(0, 3).toUpperCase(),
      logo: finalLogo,
      sportSlug: `${sportCategory}/${leagueId}`,
      sportCategory: sportCategory,
      leagueId: leagueId,
      leagueName: leagueName,
      scheduleUrl: scheduleUrl,
      isCustom: true
    };

    // Standardize games with teamId and sportSlug
    const formattedGames = scrapedGames.map((g, idx) => ({
      ...g,
      id: `${teamId}-game-${idx}`,
      sportSlug: `${sportCategory}/${leagueId}`,
      customTeamId: teamId,
      homeTeam: g.homeTeam.id === 'custom-main' ? { ...g.homeTeam, id: teamId, logo: finalLogo } : g.homeTeam,
      awayTeam: g.awayTeam.id === 'custom-main' ? { ...g.awayTeam, id: teamId, logo: finalLogo } : g.awayTeam
    }));

    onSaveCustomTeam(teamData, formattedGames);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setTeamName('');
    setLeagueName('');
    setScheduleUrl('');
    setErrorMsg('');
    setScrapedGames([]);
    onClose();
  };

  return (
    <div className="ios-custom-modal-backdrop" onClick={resetAndClose}>
      <div className="ios-custom-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* iOS Header */}
        <div className="ios-modal-header">
          <button className="ios-header-cancel" onClick={resetAndClose}>Cancel</button>
          <div className="ios-modal-title">
            {step === 1 && 'Add Custom Team'}
            {step === 2 && 'Scraping Schedule'}
            {step === 3 && 'Confirm Custom Schedule'}
          </div>
          {step === 3 ? (
            <button className="ios-header-done" onClick={handleSave}>Save</button>
          ) : (
            <div style={{ width: '45px' }} />
          )}
        </div>

        {/* Step Indicators */}
        <div className="ios-step-dots">
          <div className={`step-dot ${step === 1 ? 'active' : ''}`} />
          <div className={`step-dot ${step === 2 ? 'active' : ''}`} />
          <div className={`step-dot ${step === 3 ? 'active' : ''}`} />
        </div>

        {errorMsg && (
          <div className="ios-error-banner">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 1: Input Form */}
        {step === 1 && (
          <form onSubmit={handleStartScrape} className="ios-form-body">
            <div className="ios-input-group">
              <label className="ios-input-label">Sport Category</label>
              <select 
                className="ios-select-input"
                value={sportCategory} 
                onChange={(e) => setSportCategory(e.target.value)}
              >
                {SPORT_OPTIONS.map(opt => (
                  <option key={opt.slug} value={opt.slug}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="ios-input-group">
              <label className="ios-input-label">Team Name</label>
              <input 
                type="text"
                className="ios-text-input"
                placeholder="e.g. Soo Greyhounds"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-input-label">Custom League Name</label>
              <input 
                type="text"
                className="ios-text-input"
                placeholder="e.g. Ontario Hockey League"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-input-label">2026-2027 Schedule URL (.html or .ics)</label>
              <input 
                type="url"
                className="ios-text-input"
                placeholder="https://chl.ca/ohl/schedule/16/88/home/"
                value={scheduleUrl}
                onChange={(e) => setScheduleUrl(e.target.value)}
                required
              />
              <span className="ios-input-hint">Paste any team schedule URL or iCal feed link.</span>
            </div>

            <button type="submit" className="ios-primary-btn">
              Next: Scrape Schedule ➔
            </button>
          </form>
        )}

        {/* STEP 2: Loading State */}
        {step === 2 && (
          <div className="ios-scraping-view">
            <div className="ios-spinner" />
            <div className="ios-scraping-title">Scraping Web Schedule...</div>
            <div className="ios-scraping-sub">
              Extracting games, date/time info, and team logos from <br/>
              <code>{scheduleUrl}</code>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Confirm */}
        {step === 3 && (
          <div className="ios-preview-body">
            
            {/* Team & Logo Preview */}
            <div className="ios-team-preview-card">
              <img 
                src={logoUrl || DEFAULT_CUSTOM_LOGO} 
                alt={teamName} 
                className="ios-team-logo-preview"
                onError={(e) => { e.target.src = DEFAULT_CUSTOM_LOGO; }}
              />
              <div className="ios-team-preview-info">
                <div className="ios-team-preview-name">{teamName}</div>
                <div className="ios-team-preview-league">
                  <span className="custom-badge">Custom</span> {leagueName}
                </div>
              </div>
            </div>

            <div className="ios-input-group" style={{ marginBottom: '16px' }}>
              <label className="ios-input-label">Team Logo Image URL</label>
              <input 
                type="text"
                className="ios-text-input"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Image URL"
              />
            </div>

            <div className="ios-preview-subtitle">
              Extracted Schedule ({scrapedGames.length} Games)
            </div>

            {scrapedGames.length === 0 ? (
              <div className="ios-empty-preview" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No games could be extracted automatically from this URL. <br/>
                You can still save this team and update its schedule link later.
              </div>
            ) : (
              <div className="ios-games-preview-list">
                {scrapedGames.map((g, idx) => {
                  const dateStr = new Date(g.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  const timeStr = new Date(g.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                  
                  return (
                    <div key={idx} className="ios-preview-game-row">
                      <div className="ios-preview-game-date">
                        <span className="game-day">{dateStr}</span>
                        <span className="game-time">{timeStr}</span>
                      </div>
                      <div className="ios-preview-game-matchup">
                        <span className="matchup-text">{g.shortName || g.name}</span>
                        {g.venue && <span className="venue-text">{g.venue}</span>}
                      </div>
                      <button 
                        type="button"
                        className="ios-delete-game-btn" 
                        onClick={() => handleRemoveGame(idx)}
                        title="Remove Game"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button type="button" className="ios-primary-btn" onClick={handleSave} style={{ marginTop: '16px' }}>
              Save & Track Team
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
