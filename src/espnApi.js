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

  const isUFC = defaultSportSlug === 'mma/ufc';
  const eventName = event.name || event.shortName || '';

  const result = {
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

  // UFC-specific fields
  if (isUFC) {
    result.isUFC = true;
    result.eventName = eventName;
    // Extract headline fight (main event competitors)
    if (competitors.length >= 2) {
      const f1 = competitors[0].athlete || competitors[0].team || {};
      const f2 = competitors[1].athlete || competitors[1].team || {};
      result.headline = `${f1.displayName || f1.name || 'TBD'} vs ${f2.displayName || f2.name || 'TBD'}`;
    }
  }

  return result;
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

    // Inject full UFC bouts for accurate fighter tracking (including prelims)
    if (sportSlug === 'mma/ufc' && data.events) {
      await Promise.all(data.events.map(async (evt) => {
        const bouts = await fetchUFCEventBouts(evt.id);
        if (bouts && bouts.length > 0 && evt.competitions && evt.competitions.length > 0) {
          evt.competitions[0].competitors = evt.competitions[0].competitors || [];
          const mainEventCompetitors = evt.competitions[0].competitors;
          const addedFighterIds = new Set(mainEventCompetitors.map(c => c.id || (c.team && c.team.id) || (c.athlete && c.athlete.id)));
          
          bouts.forEach(bout => {
            [bout.fighter1, bout.fighter2].forEach(fighter => {
              if (fighter && fighter.id && !addedFighterIds.has(String(fighter.id))) {
                addedFighterIds.add(String(fighter.id));
                // Mocking the structure expected by extractGamesForTeams
                evt.competitions[0].competitors.push({
                  team: { id: String(fighter.id), displayName: fighter.name }
                });
              }
            });
          });
        }
      }));
    }

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
 * Strictly verifies BOTH team ID and sportSlug to prevent cross-league ID collisions.
 */
export function extractGamesForTeams(apiData, trackedTeams, defaultSportSlug = '') {
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
        const slugMatch = !teamSlug || !defaultSportSlug || teamSlug === defaultSportSlug;
        return idMatch && slugMatch;
      })
    );
    
    if (hasTrackedTeam) {
      const matchingTrackedTeam = trackedTeams ? trackedTeams.find(tt => 
        competitors.some(c => c.team && String(c.team.id) === String(typeof tt === 'object' && tt !== null ? tt.id : tt))
      ) : null;
      const sportSlug = (typeof matchingTrackedTeam === 'object' && matchingTrackedTeam !== null) ? matchingTrackedTeam.sportSlug || defaultSportSlug : defaultSportSlug;

      const game = parseEventToGame(event, sportSlug);
      if (game) upcomingGames.push(game);
    }
  });
  
  return upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// =============================================
// UFC-Specific Functions
// =============================================

// Cache for UFC event bouts and fighter records
const _ufcEventCache = {};
const _fighterRecordCache = {};

/**
 * Fetch all bouts (fights) for a UFC event from ESPN event detail endpoint.
 * Returns an array of fight objects with fighter info, weight class, etc.
 */
export async function fetchUFCEventBouts(eventId) {
  if (!eventId) return [];
  if (_ufcEventCache[eventId]) return _ufcEventCache[eventId];

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard/${eventId}`;
    let response = await fetch(url);
    
    // Fallback: try the event endpoint directly
    if (!response.ok) {
      const fallbackUrl = `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/event/${eventId}`;
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) return [];
    const data = await response.json();

    // ESPN UFC events have multiple competitions (each is a fight)
    const events = data.events || (data.event ? [data.event] : [data]);
    const bouts = [];

    for (const evt of events) {
      const competitions = evt.competitions || [];
      for (const comp of competitions) {
        const competitors = comp.competitors || [];
        if (competitors.length < 2) continue;

        const fighter1Raw = competitors[0];
        const fighter2Raw = competitors[1];
        const f1 = fighter1Raw.athlete || fighter1Raw.team || {};
        const f2 = fighter2Raw.athlete || fighter2Raw.team || {};

        const weightClass = comp.type?.text || 
                           (comp.notes && comp.notes[0]?.headline) || 
                           'Bout';

        bouts.push({
          id: comp.id || `${evt.id}-${bouts.length}`,
          weightClass,
          fighter1: {
            id: String(f1.id || ''),
            name: f1.displayName || f1.name || 'TBD',
            headshot: f1.headshot?.href || f1.logo || (f1.logos && f1.logos[0]?.href) || '',
            record: fighter1Raw.records?.[0]?.summary || '',
            winner: fighter1Raw.winner === true,
          },
          fighter2: {
            id: String(f2.id || ''),
            name: f2.displayName || f2.name || 'TBD',
            headshot: f2.headshot?.href || f2.logo || (f2.logos && f2.logos[0]?.href) || '',
            record: fighter2Raw.records?.[0]?.summary || '',
            winner: fighter2Raw.winner === true,
          },
          completed: comp.status?.type?.completed === true,
        });
      }
    }

    _ufcEventCache[eventId] = bouts;
    return bouts;
  } catch (error) {
    console.error(`Error fetching UFC event bouts for ${eventId}:`, error);
    return [];
  }
}

/**
 * Fetch the last 5 fight results for a UFC fighter from ESPN athlete endpoint.
 * Returns an array of up to 5 results: 'W', 'L', 'D', or 'NC'.
 */
export async function fetchFighterLast5(athleteId) {
  if (!athleteId) return [];
  if (_fighterRecordCache[athleteId]) return _fighterRecordCache[athleteId];

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/athletes/${athleteId}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    
    // Try to extract from athlete's event log / statistics
    const eventLog = data.eventLog?.events || data.statistics?.splits?.categories?.[0]?.stats || [];
    const results = [];

    if (data.eventLog && data.eventLog.events) {
      // Parse event log entries for win/loss results
      for (const evt of data.eventLog.events.slice(0, 5)) {
        if (evt.winner === true) results.push('W');
        else if (evt.winner === false) results.push('L');
        else if (evt.draw === true) results.push('D');
        else results.push('NC');
      }
    }

    // Fallback: derive from record if no event log
    if (results.length === 0 && data.record) {
      const summary = data.record.items?.[0]?.summary || data.displayRecord || '';
      // Parse "21-2-0" format as best guess
      const match = summary.match(/(\d+)-(\d+)-(\d+)/);
      if (match) {
        const wins = parseInt(match[1]);
        const losses = parseInt(match[2]);
        // Create a best-guess last 5 (most recent results for active fighters are likely wins)
        const total = Math.min(5, wins + losses);
        for (let i = 0; i < Math.min(5, wins); i++) results.push('W');
        for (let i = 0; i < Math.min(5 - results.length, losses); i++) results.push('L');
      }
    }

    const last5 = results.slice(0, 5);
    _fighterRecordCache[athleteId] = last5;
    return last5;
  } catch (error) {
    console.error(`Error fetching fighter record for ${athleteId}:`, error);
    return [];
  }
}
