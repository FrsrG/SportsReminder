// icsGenerator.js

/**
 * Formats a Date object into iCalendar UTC string: YYYYMMDDTHHMMSSZ
 */
function formatDateToICS(dateStr) {
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate an .ics calendar file content for a list of games for a team
 */
export function generateICS(teamName, games) {
  const nowICS = formatDateToICS(new Date().toISOString());
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Remind Sports//NONSGML Sports Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${teamName} Schedule`
  ];

  games.forEach(game => {
    const startDate = new Date(game.date);
    // Assume 2 hours duration for soccer match
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    const dtStart = formatDateToICS(startDate.toISOString());
    const dtEnd = formatDateToICS(endDate.toISOString());
    const uid = `game-${game.id}@remindsports.com`;
    const summary = `${game.awayTeam.name} vs ${game.homeTeam.name}`;
    const location = game.venue || 'TBD';
    const description = `MLS Match: ${game.awayTeam.name} (${game.awayTeam.abbreviation}) at ${game.homeTeam.name} (${game.homeTeam.abbreviation}). Exported via Remind Sports.`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowICS}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

/**
 * Triggers browser file download for .ics content
 */
export function downloadICSFile(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
