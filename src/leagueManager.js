// leagueManager.js
import { fetchTeamSchedule } from './espnApi.js';
import staticTeams from './staticTeams.json';

export const SUPPORTED_LEAGUES = {
  soccer: [
    { id: 'mls', name: 'MLS', sportSlug: 'soccer/usa.1', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png' },
    { id: 'epl', name: 'Premier League', sportSlug: 'soccer/eng.1', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png' },
    { id: 'laliga', name: 'LALIGA', sportSlug: 'soccer/esp.1', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png' },
    { id: 'ucl', name: 'UEFA Champions League', sportSlug: 'soccer/uefa.champions', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png' },
    { id: 'ligamx', name: 'Liga MX', sportSlug: 'soccer/mex.1', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/22.png' }
  ],
  football: [
    { id: 'nfl', name: 'NFL', sportSlug: 'football/nfl', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png' },
    { id: 'college-football', name: 'College Football', sportSlug: 'football/college-football', logo: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football-college.png' }
  ],
  basketball: [
    { id: 'nba', name: 'NBA', sportSlug: 'basketball/nba', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png' },
    { id: 'wnba', name: 'WNBA', sportSlug: 'basketball/wnba', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png' },
    { id: 'mens-college-basketball', name: 'NCAAM', sportSlug: 'basketball/mens-college-basketball', logo: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-basketball.png' }
  ],
  baseball: [
    { id: 'mlb', name: 'MLB', sportSlug: 'baseball/mlb', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png' }
  ],
  hockey: [
    { id: 'nhl', name: 'NHL', sportSlug: 'hockey/nhl', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png' }
  ],
  racing: [
    { id: 'f1', name: 'Formula 1', sportSlug: 'racing/f1', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/f1.png' }
  ],
  mma: [
    { id: 'ufc', name: 'UFC', sportSlug: 'mma/ufc', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png' }
  ],
  golf: [
    { id: 'pga', name: 'PGA Tour', sportSlug: 'golf/pga', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pgatour.png' }
  ]
};

// Flattened lookup map
export const LEAGUES_FLAT = Object.values(SUPPORTED_LEAGUES).flat().reduce((acc, league) => {
  acc[league.id] = league;
  return acc;
}, {});

// In-memory cache for pre-fetched team schedules
const teamSchedulesCache = new Map();

/**
 * Fetch full season schedule for any team in any league.
 */
export async function fetchTeamScheduleForSport(sportSlug, teamId) {
  if (!sportSlug) return [];
  const cacheKey = `${sportSlug}:${teamId}`;
  if (teamSchedulesCache.has(cacheKey)) {
    return teamSchedulesCache.get(cacheKey);
  }

  const parsedGames = await fetchTeamSchedule(sportSlug, teamId);
  if (parsedGames && parsedGames.length > 0) {
    teamSchedulesCache.set(cacheKey, parsedGames);
  }
  return parsedGames;
}

/**
 * Fetch and parse all teams for a specific league dynamically from ESPN API.
 */
export async function fetchLeagueTeamsFromESPN(sportSlug) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sportSlug}/teams?limit=1000`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (data?.sports?.[0]?.leagues?.[0]?.teams) {
      const teams = data.sports[0].leagues[0].teams.map(item => {
        const t = item.team;
        return {
          id: t.id,
          name: t.displayName || 'TBD',
          shortName: t.shortDisplayName || t.displayName || t.name || 'TBD',
          abbreviation: t.abbreviation || '',
          logo: t.logos && t.logos[0] ? t.logos[0].href : 'https://a.espncdn.com/i/teamlogos/soccer/500/default-team-logo.png',
          sportSlug: sportSlug
        };
      });
      return teams.sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching teams for ${sportSlug} from API:`, error);
    return [];
  }
}

/**
 * Smart loader for teams: Returns static teams instantly, then updates from storage/ESPN API asynchronously.
 */
export async function loadLeagueTeams(sportSlug) {
  const fallback = staticTeams[sportSlug] || [];
  const storageKey = `teams_cache_${sportSlug.replace('/', '_')}`;
  
  return new Promise((resolve) => {
    // Return static fallback immediately if available to guarantee instant zero-wait UI rendering
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([storageKey], async (result) => {
        if (result[storageKey] && result[storageKey].length > 0) {
          resolve(result[storageKey]);
        } else if (fallback.length > 0) {
          resolve(fallback);
          // Refresh from API in background and store
          fetchLeagueTeamsFromESPN(sportSlug).then(fresh => {
            if (fresh && fresh.length > 0) {
              chrome.storage.local.set({ [storageKey]: fresh });
            }
          });
        } else {
          const teams = await fetchLeagueTeamsFromESPN(sportSlug);
          if (teams && teams.length > 0) {
            chrome.storage.local.set({ [storageKey]: teams });
          }
          resolve(teams);
        }
      });
    } else {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            resolve(parsed);
            return;
          }
        } catch (e) {}
      }
      
      if (fallback.length > 0) {
        resolve(fallback);
        fetchLeagueTeamsFromESPN(sportSlug).then(fresh => {
          if (fresh && fresh.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(fresh));
          }
        });
      } else {
        fetchLeagueTeamsFromESPN(sportSlug).then(teams => {
          if (teams && teams.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(teams));
          }
          resolve(teams);
        });
      }
    }
  });
}

/**
 * Automatically pre-fetch schedules for all teams in a given league.
 */
export async function preloadLeagueSchedules(leagueId = 'mls') {
  const league = LEAGUES_FLAT[leagueId];
  if (!league) return;

  const teams = await loadLeagueTeams(league.sportSlug);
  const chunkSize = 5;
  for (let i = 0; i < teams.length; i += chunkSize) {
    const chunk = teams.slice(i, i + chunkSize);
    await Promise.all(chunk.map(team => fetchTeamScheduleForSport(league.sportSlug, team.id)));
  }
}
