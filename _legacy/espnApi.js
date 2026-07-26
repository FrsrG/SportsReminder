// espnApi.js

const MLS_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard';

/**
 * Fetch the current MLS scoreboard data (includes schedules).
 */
export async function fetchMLSSchedule() {
  try {
    const response = await fetch(MLS_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching MLS schedule:', error);
    return null;
  }
}

/**
 * Extract a list of all MLS teams from the API response.
 * Used for populating the "Add Team" dropdown.
 */
export function extractTeams(apiData) {
  if (!apiData || !apiData.events) return [];
  
  const teamsMap = new Map();
  
  apiData.events.forEach(event => {
    const competitors = event.competitions[0].competitors;
    competitors.forEach(comp => {
      const team = comp.team;
      if (!teamsMap.has(team.id)) {
        teamsMap.set(team.id, {
          id: team.id,
          name: team.displayName,
          shortName: team.shortDisplayName,
          abbreviation: team.abbreviation,
          logo: team.logo
        });
      }
    });
  });
  
  return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract games for specific teams.
 */
export function extractGamesForTeams(apiData, teamIds) {
  if (!apiData || !apiData.events || !teamIds || teamIds.length === 0) return [];
  
  const upcomingGames = [];
  
  apiData.events.forEach(event => {
    const competition = event.competitions[0];
    const competitors = competition.competitors;
    
    // Check if any of our tracked teams are in this game
    const hasTrackedTeam = competitors.some(comp => teamIds.includes(comp.team.id));
    
    if (hasTrackedTeam) {
      const homeTeam = competitors.find(c => c.homeAway === 'home').team;
      const awayTeam = competitors.find(c => c.homeAway === 'away').team;
      const venue = competition.venue ? competition.venue.fullName : 'TBD';
      
      upcomingGames.push({
        id: event.id,
        date: event.date,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.displayName,
          abbreviation: homeTeam.abbreviation,
          logo: homeTeam.logo
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.displayName,
          abbreviation: awayTeam.abbreviation,
          logo: awayTeam.logo
        },
        venue: venue,
        status: event.status.type.name // e.g. STATUS_SCHEDULED, STATUS_IN_PROGRESS
      });
    }
  });
  
  // Sort games by date
  return upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));
}
