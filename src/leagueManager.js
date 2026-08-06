// leagueManager.js
import { fetchTeamSchedule } from './espnApi.js';
import staticTeams from './staticTeams.json';
import { DEFAULT_CUSTOM_LOGO } from './utils/customScheduleScraper.js';

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
export let LEAGUES_FLAT = Object.values(SUPPORTED_LEAGUES).flat().reduce((acc, league) => {
  acc[league.id] = league;
  return acc;
}, {});

// In-memory cache for pre-fetched team schedules
const teamSchedulesCache = new Map();
let customTeamsStore = [];
let customSchedulesStore = [];

/**
 * Register custom leagues into SUPPORTED_LEAGUES and LEAGUES_FLAT dynamically.
 */
export function registerCustomLeague(customLeague) {
  const sport = customLeague.sportCategory || 'soccer';
  if (!SUPPORTED_LEAGUES[sport]) {
    SUPPORTED_LEAGUES[sport] = [];
  }

  const existing = SUPPORTED_LEAGUES[sport].find(l => l.id === customLeague.id);
  if (!existing) {
    const entry = {
      id: customLeague.id,
      name: customLeague.name,
      sportSlug: customLeague.sportSlug,
      logo: customLeague.logo || DEFAULT_CUSTOM_LOGO,
      isCustom: true
    };
    SUPPORTED_LEAGUES[sport].push(entry);
    LEAGUES_FLAT[customLeague.id] = entry;
  }
}

/**
 * Load custom teams and custom leagues from storage.
 */
export function initCustomData(customTeams = [], customSchedules = []) {
  customTeamsStore = customTeams;
  customSchedulesStore = customSchedules;

  // Register custom leagues
  customTeams.forEach(t => {
    if (t.leagueId && t.leagueName) {
      registerCustomLeague({
        id: t.leagueId,
        name: t.leagueName,
        sportSlug: t.sportSlug,
        sportCategory: t.sportCategory || 'soccer',
        logo: t.logo
      });
    }
  });

  // Pre-seed schedules into cache
  customSchedules.forEach(g => {
    if (g.customTeamId) {
      const cacheKey = `${g.sportSlug}:${g.customTeamId}`;
      if (!teamSchedulesCache.has(cacheKey)) {
        teamSchedulesCache.set(cacheKey, []);
      }
      teamSchedulesCache.get(cacheKey).push(g);
    }
  });
}

/**
 * Add custom team and schedule to local cache.
 */
export function addCustomTeamToStore(teamData, gamesData) {
  registerCustomLeague({
    id: teamData.leagueId,
    name: teamData.leagueName,
    sportSlug: teamData.sportSlug,
    sportCategory: teamData.sportCategory || 'soccer',
    logo: teamData.logo
  });

  customTeamsStore = [...customTeamsStore.filter(t => t.id !== teamData.id), teamData];
  customSchedulesStore = [...customSchedulesStore.filter(g => g.customTeamId !== teamData.id), ...gamesData];

  // Set in-memory cache
  const cacheKey = `${teamData.sportSlug}:${teamData.id}`;
  teamSchedulesCache.set(cacheKey, gamesData);

  return { customTeams: customTeamsStore, customSchedules: customSchedulesStore };
}

/**
 * Update custom team metadata and schedule in local cache.
 */
export function updateCustomTeamInStore(updatedTeam, newGames) {
  customTeamsStore = customTeamsStore.map(t => t.id === updatedTeam.id ? updatedTeam : t);

  // Update dynamic league name if registered
  if (updatedTeam.leagueId && LEAGUES_FLAT[updatedTeam.leagueId]) {
    LEAGUES_FLAT[updatedTeam.leagueId].name = updatedTeam.leagueName || updatedTeam.name;
    LEAGUES_FLAT[updatedTeam.leagueId].logo = updatedTeam.logo;
  }

  if (newGames && Array.isArray(newGames)) {
    customSchedulesStore = [...customSchedulesStore.filter(g => g.customTeamId !== updatedTeam.id), ...newGames];
    const cacheKey = `${updatedTeam.sportSlug}:${updatedTeam.id}`;
    teamSchedulesCache.set(cacheKey, newGames);
  }

  return { customTeams: customTeamsStore, customSchedules: customSchedulesStore };
}

/**
 * Delete custom team and its schedule from local cache.
 */
export function deleteCustomTeamFromStore(teamId) {
  customTeamsStore = customTeamsStore.filter(t => t.id !== teamId);
  customSchedulesStore = customSchedulesStore.filter(g => g.customTeamId !== teamId);

  return { customTeams: customTeamsStore, customSchedules: customSchedulesStore };
}

/**
 * Fetch full season schedule for any team in any league.
 */
export async function fetchTeamScheduleForSport(sportSlug, teamId) {
  if (!sportSlug) return [];
  const cacheKey = `${sportSlug}:${teamId}`;
  if (teamSchedulesCache.has(cacheKey)) {
    return teamSchedulesCache.get(cacheKey);
  }

  // Check custom schedule store
  const customGames = customSchedulesStore.filter(g => g.customTeamId === teamId || g.sportSlug === sportSlug);
  if (customGames.length > 0) {
    teamSchedulesCache.set(cacheKey, customGames);
    return customGames;
  }

  const parsedGames = await fetchTeamSchedule(sportSlug, teamId);
  if (parsedGames && parsedGames.length > 0) {
    teamSchedulesCache.set(cacheKey, parsedGames);
  }
  return parsedGames;
}

/**
 * Fetch and parse all teams for a specific league dynamically from ESPN API or Custom Store.
 */
export async function fetchLeagueTeamsFromESPN(sportSlug) {
  try {
    // Check if custom league
    if (sportSlug && sportSlug.includes('/custom-')) {
      return customTeamsStore.filter(t => t.sportSlug === sportSlug);
    }

    if (sportSlug === 'mma/ufc') {
      const url1 = `https://sports.core.api.espn.com/v3/sports/mma/ufc/athletes?limit=1000&page=1`;
      const url2 = `https://sports.core.api.espn.com/v3/sports/mma/ufc/athletes?limit=1000&page=2`;
      const [res1, res2] = await Promise.all([fetch(url1), fetch(url2)]);
      if (!res1.ok || !res2.ok) throw new Error(`HTTP error fetching UFC fighters`);
      
      const data1 = await res1.json();
      const data2 = await res2.json();
      
      const items = [...(data1.items || []), ...(data2.items || [])];
      
      if (items.length > 0) {
        const fighters = items.map(athlete => {
          return {
            id: athlete.id,
            name: athlete.fullName || 'TBD',
            shortName: athlete.shortName || athlete.displayName || athlete.fullName || 'TBD',
            abbreviation: '',
            logo: `https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/${athlete.id}.png`,
            sportSlug: sportSlug
          };
        });
        return fighters.sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    }

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
 * Helper to ensure team object always has valid sportSlug.
 */
export function ensureTeamSportSlug(team, defaultLeague = 'mls') {
  if (!team) return team;
  if (team.sportSlug) return team;

  // First pass: match by both ID and Name
  if (team.name) {
    const normName = team.name.toLowerCase().trim();
    for (const [slug, teamsList] of Object.entries(staticTeams)) {
      if (Array.isArray(teamsList) && teamsList.some(t => String(t.id) === String(team.id) && t.name && t.name.toLowerCase().trim() === normName)) {
        return { ...team, sportSlug: slug };
      }
    }
  }

  // Second pass: match by ID
  for (const [slug, teamsList] of Object.entries(staticTeams)) {
    if (Array.isArray(teamsList) && teamsList.some(t => String(t.id) === String(team.id))) {
      return { ...team, sportSlug: slug };
    }
  }

  const activeLeagueData = LEAGUES_FLAT[defaultLeague] || LEAGUES_FLAT.mls;
  return { ...team, sportSlug: activeLeagueData.sportSlug || 'soccer/usa.1' };
}

/**
 * Smart loader for teams: Returns static teams instantly, then updates from storage/ESPN API asynchronously.
 */
export async function loadLeagueTeams(sportSlug) {
  // If custom league, load from custom store
  if (sportSlug && sportSlug.includes('/custom-')) {
    const matchingCustom = customTeamsStore.filter(t => t.sportSlug === sportSlug);
    return matchingCustom;
  }

  const rawFallback = staticTeams[sportSlug] || [];
  const fallback = rawFallback.map(t => ({ ...t, sportSlug: t.sportSlug || sportSlug }));
  const storageKey = `teams_cache_${sportSlug.replace('/', '_')}`;
  
  const mapSlug = (teamsList) => (teamsList || []).map(t => ({ ...t, sportSlug: t.sportSlug || sportSlug }));

  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([storageKey], async (result) => {
        if (result[storageKey] && result[storageKey].length > 0) {
          resolve(mapSlug(result[storageKey]));
        } else if (fallback.length > 0) {
          resolve(fallback);
          fetchLeagueTeamsFromESPN(sportSlug).then(fresh => {
            if (fresh && fresh.length > 0) {
              const mapped = mapSlug(fresh);
              chrome.storage.local.set({ [storageKey]: mapped });
            }
          });
        } else {
          const teams = await fetchLeagueTeamsFromESPN(sportSlug);
          const mapped = mapSlug(teams);
          if (mapped && mapped.length > 0) {
            chrome.storage.local.set({ [storageKey]: mapped });
          }
          resolve(mapped);
        }
      });
    } else {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            resolve(mapSlug(parsed));
            return;
          }
        } catch (e) {}
      }
      
      if (fallback.length > 0) {
        resolve(fallback);
        fetchLeagueTeamsFromESPN(sportSlug).then(fresh => {
          if (fresh && fresh.length > 0) {
            const mapped = mapSlug(fresh);
            localStorage.setItem(storageKey, JSON.stringify(mapped));
          }
        });
      } else {
        fetchLeagueTeamsFromESPN(sportSlug).then(teams => {
          const mapped = mapSlug(teams);
          if (mapped && mapped.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(mapped));
          }
          resolve(mapped);
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
