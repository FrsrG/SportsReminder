// espnApi.js

/**
 * Helper to safely extract score string from string, number, or object.
 */
export function extractScoreString(scoreVal) {
  if (scoreVal === null || scoreVal === undefined) return '';
  if (typeof scoreVal === 'object') {
    return String(scoreVal.displayValue || scoreVal.value || scoreVal.score || '');
  }
  return String(scoreVal);
}

/**
 * Helper to parse raw ESPN event into normalized Game structure.
 */
export function parseEventToGame(event, defaultSportSlug = '') {
  if (!event) return null;
  const competition = event.competitions ? event.competitions[0] : null;
  if (!competition) return null;

  const competitors = competition.competitors || [];
  const homeTeamComp = competitors.find(c => c.homeAway === 'home');
  const awayTeamComp = competitors.find(c => c.homeAway === 'away');

  let homeTeam = homeTeamComp ? homeTeamComp.team : null;
  let awayTeam = awayTeamComp ? awayTeamComp.team : null;

  // Fallback for events/sports without traditional home/away teams (e.g. F1, UFC, Golf)
  if (!homeTeam && competitors.length >= 2) {
    homeTeam = competitors[0].team || competitors[0].athlete || {};
    awayTeam = competitors[1].team || competitors[1].athlete || {};
  }

  if (!homeTeam) {
    homeTeam = {
      id: event.id + '-home',
      displayName: event.name || event.shortName || 'Event',
      abbreviation: event.shortName || 'EVT',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/default-team-logo.png'
    };
  }

  if (!awayTeam) {
    awayTeam = {
      id: event.id + '-away',
      displayName: event.name || event.shortName || 'Event',
      abbreviation: event.shortName || 'EVT',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/default-team-logo.png'
    };
  }

  const statusObj = competition.status && competition.status.type 
    ? competition.status.type 
    : (event.status && event.status.type ? event.status.type : {});
  const statusName = statusObj.name || 'STATUS_SCHEDULED';
  const isCompleted = statusObj.completed === true || statusName === 'STATUS_FULL_TIME' || statusName === 'STATUS_FINAL';

  const venueName = competition.venue ? competition.venue.fullName : (event.circuit ? event.circuit.fullName : 'TBD');

  const rawHomeScore = homeTeamComp ? (homeTeamComp.score !== undefined ? homeTeamComp.score : (homeTeamComp.linescores ? homeTeamComp.linescores[homeTeamComp.linescores.length-1]?.value : '')) : '';
  const rawAwayScore = awayTeamComp ? (awayTeamComp.score !== undefined ? awayTeamComp.score : (awayTeamComp.linescores ? awayTeamComp.linescores[awayTeamComp.linescores.length-1]?.value : '')) : '';

  return {
    id: String(event.id),
    date: event.date,
    homeTeam: {
      id: String(homeTeam.id || ''),
      name: homeTeam.displayName || homeTeam.name || event.name || 'TBD',
      abbreviation: homeTeam.abbreviation || 'TBD',
      logo: homeTeam.logo || (homeTeam.logos && homeTeam.logos[0] ? homeTeam.logos[0].href : '')
    },
    awayTeam: {
      id: String(awayTeam.id || ''),
      name: awayTeam.displayName || awayTeam.name || event.name || 'TBD',
      abbreviation: awayTeam.abbreviation || 'TBD',
      logo: awayTeam.logo || (awayTeam.logos && awayTeam.logos[0] ? awayTeam.logos[0].href : '')
    },
    venue: venueName,
    status: statusName,
    completed: isCompleted,
    homeScore: extractScoreString(rawHomeScore),
    awayScore: extractScoreString(rawAwayScore),
    sportSlug: defaultSportSlug
  };
}

/**
 * Fetch current & upcoming scoreboard data for a specific league/sport.
 */
export async function fetchLeagueScoreboard(sportSlug) {
  if (!sportSlug) return null;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const startDateStr = `${year}${month}${day}`;
    const endDateStr = `${year}1231`;

    let url = `https://site.api.espn.com/apis/site/v2/sports/${sportSlug}/scoreboard?limit=1000&dates=${startDateStr}-${endDateStr}`;
    let response = await fetch(url);

    if (!response.ok) {
      url = `https://site.api.espn.com/apis/site/v2/sports/${sportSlug}/scoreboard?limit=1000`;
      response = await fetch(url);
    }

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching scoreboard for ${sportSlug}:`, error);
    return null;
  }
}

/**
 * Fetch scoreboard data for a specific league/sport for an entire target month.
 */
export async function fetchLeagueScoreboardForMonth(sportSlug, year, month) {
  if (!sportSlug) return [];
  try {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, '0');
    
    const lastDay = new Date(year, month + 1, 0).getDate();
    const lDayStr = String(lastDay).padStart(2, '0');

    const startDateStr = `${yStr}${mStr}01`;
    const endDateStr = `${yStr}${mStr}${lDayStr}`;

    let url = `https://site.api.espn.com/apis/site/v2/sports/${sportSlug}/scoreboard?limit=1000&dates=${startDateStr}-${endDateStr}`;
    let response = await fetch(url);

    if (!response.ok) {
      url = `https://site.api.espn.com/apis/site/v2/sports/${sportSlug}/scoreboard?limit=1000`;
      response = await fetch(url);
    }

    if (!response.ok) return [];
    const data = await response.json();
    if (!data || !data.events) return [];

    return data.events.map(evt => parseEventToGame(evt, sportSlug)).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching monthly scoreboard for ${sportSlug} (${year}-${month + 1}):`, error);
    return [];
  }
}

/**
 * Fetch full schedule for a specific team with multi-season and scoreboard fallbacks.
 */
export async function fetchTeamSchedule(sportSlug = 'soccer/usa.1', teamId) {
  if (!teamId) return [];
  const safeSlug = sportSlug || 'soccer/usa.1';
  const now = new Date();
  const year = now.getFullYear();
  const prevYear = year - 1;

  try {
    let url = `https://site.api.espn.com/apis/site/v2/sports/${safeSlug}/teams/${teamId}/schedule`;
    let response = await fetch(url);
    let data = response.ok ? await response.json() : null;

    if (!data || !data.events || data.events.length === 0) {
      const seasonUrl = `https://site.api.espn.com/apis/site/v2/sports/${safeSlug}/teams/${teamId}/schedule?season=${year}`;
      const seasonResp = await fetch(seasonUrl);
      if (seasonResp.ok) {
        const seasonData = await seasonResp.json();
        if (seasonData && seasonData.events && seasonData.events.length > 0) {
          data = seasonData;
        }
      }
    }

    if (!data || !data.events || data.events.length === 0) {
      const prevSeasonUrl = `https://site.api.espn.com/apis/site/v2/sports/${safeSlug}/teams/${teamId}/schedule?season=${prevYear}`;
      const prevSeasonResp = await fetch(prevSeasonUrl);
      if (prevSeasonResp.ok) {
        const prevSeasonData = await prevSeasonResp.json();
        if (prevSeasonData && prevSeasonData.events && prevSeasonData.events.length > 0) {
          data = prevSeasonData;
        }
      }
    }

    if (!data || !data.events || data.events.length === 0) {
      const sbData = await fetchLeagueScoreboard(safeSlug);
      if (sbData && sbData.events) {
        const matchingEvents = sbData.events.filter(evt => {
          if (!evt.competitions || !evt.competitions[0]) return false;
          const comps = evt.competitions[0].competitors;
          if (!comps || comps.length === 0) return true;
          return comps.some(c => c.team && String(c.team.id) === String(teamId));
        });
        if (matchingEvents.length > 0) {
          data = { events: matchingEvents };
        }
      }
    }

    if (!data || !data.events) return [];

    return data.events.map(evt => parseEventToGame(evt, safeSlug)).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching schedule for team ${teamId} (${safeSlug}):`, error);
    return [];
  }
}

/**
 * Extract games for specific teams (or all events for non-team sports) from scoreboard data.
 */
export function extractGamesForTeams(apiData, trackedTeams) {
  if (!apiData || !apiData.events) return [];
  
  const upcomingGames = [];
  
  apiData.events.forEach(event => {
    if (!event.competitions || event.competitions.length === 0) return;
    
    const competition = event.competitions[0];
    const competitors = competition.competitors || [];

    const hasTrackedTeam = competitors.length === 0 || (!trackedTeams || trackedTeams.length === 0) || competitors.some(comp => 
      comp.team && trackedTeams.some(tt => {
        const teamId = typeof tt === 'object' && tt !== null ? tt.id : String(tt);
        const teamSlug = typeof tt === 'object' && tt !== null ? tt.sportSlug : null;
        const idMatch = String(teamId) === String(comp.team.id);
        return idMatch;
      })
    );
    
    if (hasTrackedTeam) {
      const matchingTrackedTeam = trackedTeams ? trackedTeams.find(tt => 
        competitors.some(c => c.team && String(c.team.id) === String(typeof tt === 'object' && tt !== null ? tt.id : tt))
      ) : null;
      const sportSlug = (typeof matchingTrackedTeam === 'object' && matchingTrackedTeam !== null) ? matchingTrackedTeam.sportSlug || '' : '';

      const game = parseEventToGame(event, sportSlug);
      if (game) upcomingGames.push(game);
    }
  });
  
  return upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));
}
