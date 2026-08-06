/**
 * customScheduleScraper.js
 * Client-side schedule scraper for custom team schedule URLs (Non-ESPN).
 * Supports ICS/iCal feeds, CHL/LeagueStat pattern recognition, CORS proxy fallbacks, JSON-LD, Microdata, Next.js data, HTML tables, and DOM logo extraction.
 */

export const DEFAULT_CUSTOM_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%230a84ff"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"/></svg>';

// Helper to resolve relative URLs to absolute URLs
function resolveUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

// Format Date object to ISO string
function formatGameDate(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) {
    const now = new Date();
    now.setHours(19, 0, 0, 0);
    return now.toISOString();
  }
  return dateObj.toISOString();
}

/**
 * 1. Parse ICS / iCal text feeds
 */
export function parseICS(icsText, teamName = 'Custom Team', baseUrl = '') {
  const games = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.summary || currentEvent.dtstart) {
        const rawSummary = (currentEvent.summary || 'Custom Game').replace(/\\,/g, ',').replace(/\\;/g, ';');
        let isAway = false;
        let opponentName = rawSummary;

        if (rawSummary.includes(' @ ')) {
          const parts = rawSummary.split(' @ ').map(s => s.trim());
          if (parts[1] && parts[1].toLowerCase().includes(teamName.toLowerCase())) {
            // Main team is Home (e.g. Opponent @ MainTeam)
            opponentName = parts[0];
            isAway = false;
          } else if (parts[0] && parts[0].toLowerCase().includes(teamName.toLowerCase())) {
            // Main team is Away (e.g. MainTeam @ Opponent)
            opponentName = parts[1];
            isAway = true;
          } else {
            opponentName = parts[0];
            isAway = true;
          }
        } else if (rawSummary.includes(' vs ')) {
          const parts = rawSummary.split(' vs ').map(s => s.trim());
          if (parts[0] && parts[0].toLowerCase().includes(teamName.toLowerCase())) {
            opponentName = parts[1];
            isAway = false;
          } else if (parts[1] && parts[1].toLowerCase().includes(teamName.toLowerCase())) {
            opponentName = parts[0];
            isAway = true;
          } else {
            opponentName = parts[1];
            isAway = false;
          }
        }

        let gameDate = new Date();
        if (currentEvent.dtstart) {
          const raw = currentEvent.dtstart.replace(/^.*:/, '');
          const y = parseInt(raw.substring(0, 4), 10);
          const m = parseInt(raw.substring(4, 6), 10) - 1;
          const d = parseInt(raw.substring(6, 8), 10);
          let hh = 19, mm = 0;
          if (raw.includes('T') && raw.length >= 13) {
            hh = parseInt(raw.substring(9, 11), 10) || 19;
            mm = parseInt(raw.substring(11, 13), 10) || 0;
          }
          gameDate = new Date(Date.UTC(y, m, d, hh, mm));
        }

        const venueStr = (currentEvent.location || '').replace(/\\,/g, ',').replace(/\\;/g, ';');

        games.push({
          id: `ics-${Date.now()}-${games.length}`,
          name: `${teamName} ${isAway ? '@' : 'vs'} ${opponentName}`,
          shortName: `${isAway ? '@' : 'vs'} ${opponentName}`,
          date: formatGameDate(gameDate),
          status: { type: { state: 'pre', detail: 'Scheduled' } },
          homeTeam: isAway ? { id: `opp-${games.length}`, name: opponentName, logo: DEFAULT_CUSTOM_LOGO } : { id: 'custom-main', name: teamName, logo: DEFAULT_CUSTOM_LOGO },
          awayTeam: isAway ? { id: 'custom-main', name: teamName, logo: DEFAULT_CUSTOM_LOGO } : { id: `opp-${games.length}`, name: opponentName, logo: DEFAULT_CUSTOM_LOGO },
          isCustom: true,
          venue: venueStr
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) currentEvent.summary = line.substring(8);
      else if (line.startsWith('DTSTART')) currentEvent.dtstart = line;
      else if (line.startsWith('LOCATION:')) currentEvent.location = line.substring(9);
    }
  }

  return games;
}

/**
 * Extract team logo and opponent logo mappings from HTML DOM or string
 */
export function extractLogosFromDOM(doc, htmlString, baseUrl, teamName) {
  let mainLogo = '';
  const opponentLogos = new Map();

  if (doc) {
    const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    if (ogImg) mainLogo = resolveUrl(ogImg, baseUrl);

    const imgElements = doc.querySelectorAll('img');
    imgElements.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const alt = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
      if (!src) return;

      const fullSrc = resolveUrl(src, baseUrl);
      if (alt) {
        opponentLogos.set(alt.toLowerCase(), fullSrc);
        if (teamName && alt.toLowerCase().includes(teamName.toLowerCase()) && !mainLogo) {
          mainLogo = fullSrc;
        }
      }

      if (img.className && typeof img.className === 'string' && img.className.includes('logo')) {
        if (!mainLogo && teamName && alt.toLowerCase().includes(teamName.toLowerCase())) {
          mainLogo = fullSrc;
        }
      }
    });

    if (!mainLogo) {
      const iconEl = doc.querySelector('link[rel="apple-touch-icon"]') || doc.querySelector('link[rel="icon"]');
      if (iconEl && iconEl.getAttribute('href')) {
        mainLogo = resolveUrl(iconEl.getAttribute('href'), baseUrl);
      }
    }
  } else if (htmlString) {
    const imgRegex = /src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(htmlString)) !== null) {
      const src = match[1];
      const alt = match[2].trim();
      if (src && alt) {
        const fullSrc = resolveUrl(src, baseUrl);
        opponentLogos.set(alt.toLowerCase(), fullSrc);
        if (teamName && alt.toLowerCase().includes(teamName.toLowerCase()) && !mainLogo) {
          mainLogo = fullSrc;
        }
      }
    }

    const logoImgMatch = htmlString.match(/<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
    if (logoImgMatch && !mainLogo) {
      mainLogo = resolveUrl(logoImgMatch[1], baseUrl);
    }
  }

  return { mainLogo, opponentLogos };
}

/**
 * 2. Parse Structured Data (JSON-LD & Next.js Hydration JSON)
 */
export function parseStructuredData(doc, htmlString, teamName, baseUrl) {
  const games = [];
  const { mainLogo } = extractLogosFromDOM(doc, htmlString, baseUrl, teamName);

  if (doc) {
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : (data['@graph'] || [data]);

        items.forEach(item => {
          if (item['@type'] === 'SportsEvent' || item['@type'] === 'Event') {
            const gameDate = new Date(item.startDate || Date.now());
            
            let homeName = item.homeTeam?.name || teamName;
            let awayName = item.awayTeam?.name || 'Opponent';
            let homeLogo = item.homeTeam?.image ? resolveUrl(item.homeTeam.image, baseUrl) : '';
            let awayLogo = item.awayTeam?.image ? resolveUrl(item.awayTeam.image, baseUrl) : '';

            const isAway = awayName.toLowerCase().includes(teamName.toLowerCase());

            games.push({
              id: `jsonld-${Date.now()}-${games.length}`,
              name: `${homeName} vs ${awayName}`,
              shortName: `${isAway ? '@' : 'vs'} ${isAway ? homeName : awayName}`,
              date: formatGameDate(gameDate),
              status: { type: { state: 'pre', detail: 'Scheduled' } },
              homeTeam: { id: `home-${games.length}`, name: homeName, logo: homeLogo || (isAway ? DEFAULT_CUSTOM_LOGO : (mainLogo || DEFAULT_CUSTOM_LOGO)) },
              awayTeam: { id: `away-${games.length}`, name: awayName, logo: awayLogo || (isAway ? (mainLogo || DEFAULT_CUSTOM_LOGO) : DEFAULT_CUSTOM_LOGO) },
              isCustom: true,
              venue: item.location?.name || ''
            });
          }
        });
      } catch (e) {}
    });

    const nextDataScript = doc.querySelector('script[id="__NEXT_DATA__"]');
    if (nextDataScript && games.length === 0) {
      try {
        const json = JSON.parse(nextDataScript.textContent);
        const findEventsInObj = (obj, depth = 0) => {
          if (!obj || depth > 5 || games.length > 50) return;
          if (Array.isArray(obj)) {
            obj.forEach(item => findEventsInObj(item, depth + 1));
          } else if (typeof obj === 'object') {
            if ((obj.opponent || obj.opponentName || obj.vs) && (obj.date || obj.gameDate || obj.startDate)) {
              const opp = obj.opponent || obj.opponentName || obj.vs || 'Opponent';
              const dateStr = obj.date || obj.gameDate || obj.startDate;
              const oppLogo = obj.opponentLogo || obj.logo || '';
              const isAway = obj.isAway || obj.homeAway === 'away' || false;

              games.push({
                id: `nextjs-${Date.now()}-${games.length}`,
                name: `${teamName} ${isAway ? '@' : 'vs'} ${opp}`,
                shortName: `${isAway ? '@' : 'vs'} ${opp}`,
                date: formatGameDate(new Date(dateStr)),
                status: { type: { state: 'pre', detail: 'Scheduled' } },
                homeTeam: isAway ? { id: `opp-${games.length}`, name: opp, logo: resolveUrl(oppLogo, baseUrl) || DEFAULT_CUSTOM_LOGO } : { id: 'custom-main', name: teamName, logo: mainLogo || DEFAULT_CUSTOM_LOGO },
                awayTeam: isAway ? { id: 'custom-main', name: teamName, logo: mainLogo || DEFAULT_CUSTOM_LOGO } : { id: `opp-${games.length}`, name: opp, logo: resolveUrl(oppLogo, baseUrl) || DEFAULT_CUSTOM_LOGO },
                isCustom: true,
                venue: obj.location || obj.venue || ''
              });
            } else {
              Object.values(obj).forEach(val => findEventsInObj(val, depth + 1));
            }
          }
        };
        findEventsInObj(json);
      } catch (e) {}
    }
  }

  return games;
}

/**
 * 3. Fallback HTML Table & Grid Parser
 */
export function parseHTMLTables(doc, htmlString, teamName, baseUrl) {
  const games = [];
  const { mainLogo, opponentLogos } = extractLogosFromDOM(doc, htmlString, baseUrl, teamName);

  if (doc) {
    const rows = doc.querySelectorAll('table tr, .schedule-row, .game-row, .event-row, .schedule-item, li.game, .game-item');

    rows.forEach((row, idx) => {
      const text = row.textContent || '';
      if (!text || text.length < 5 || (text.toLowerCase().includes('date') && text.toLowerCase().includes('opponent'))) {
        return;
      }

      const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(,\s+\d{4})?/i) ||
                        text.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/);

      const timeMatch = text.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/i);

      const rowImg = row.querySelector('img');
      const oppLogo = rowImg ? resolveUrl(rowImg.getAttribute('src'), baseUrl) : '';

      const isAway = text.includes('@');
      
      let opponentName = '';
      const oppEl = row.querySelector('.opponent, .team-name, .opponent-name, td:nth-child(2), td:nth-child(3)');
      if (oppEl) {
        opponentName = oppEl.textContent.trim().replace(/^(@|vs\.?|vs)\s*/i, '');
      }

      if (!opponentName && dateMatch) {
        const match = text.match(/(vs\.?|@)\s*([A-Za-z0-9\s&.-]+)/i);
        if (match && match[2]) {
          opponentName = match[2].trim().split('\n')[0];
        }
      }

      if (opponentName && dateMatch) {
        let dateObj = new Date();
        if (dateMatch[0]) {
          let yearStr = dateMatch[0].includes('202') ? '' : ` ${new Date().getFullYear()}`;
          dateObj = new Date(`${dateMatch[0]}${yearStr} ${timeMatch ? timeMatch[0] : '19:00'}`);
        }

        games.push({
          id: `html-${Date.now()}-${idx}`,
          name: `${teamName} ${isAway ? '@' : 'vs'} ${opponentName}`,
          shortName: `${isAway ? '@' : 'vs'} ${opponentName}`,
          date: formatGameDate(dateObj),
          status: { type: { state: 'pre', detail: 'Scheduled' } },
          homeTeam: isAway ? { id: `opp-${idx}`, name: opponentName, logo: oppLogo || DEFAULT_CUSTOM_LOGO } : { id: 'custom-main', name: teamName, logo: mainLogo || DEFAULT_CUSTOM_LOGO },
          awayTeam: isAway ? { id: 'custom-main', name: teamName, logo: mainLogo || DEFAULT_CUSTOM_LOGO } : { id: `opp-${idx}`, name: opponentName, logo: oppLogo || DEFAULT_CUSTOM_LOGO },
          isCustom: true,
          venue: ''
        });
      }
    });
  }

  return games;
}

/**
 * Main Web Scraper Engine Entry Point
 */
export async function scrapeScheduleFromUrl(urlInput, teamName = 'Custom Team') {
  if (!urlInput) throw new Error('Schedule URL is required.');

  let url = urlInput.trim().replace(/^webcal:\/\//i, 'https://');



  // --- SPECIAL PATTERN RECOGNITION 2: Direct iCal URL ---
  if (url.endsWith('.ics') || url.includes('ical_add_games') || url.includes('.ical')) {
    try {
      const icalRes = await fetch(url);
      if (icalRes.ok) {
        const text = await icalRes.text();
        const games = parseICS(text, teamName, url);
        if (games.length > 0) {
          return { games, logo: DEFAULT_CUSTOM_LOGO };
        }
      }
    } catch (e) {
      console.warn('Direct iCal fetch error:', e);
    }
  }

  // Standard HTML Fetch with CORS Proxy Fallback
  let fetchedText = '';

  const fetchUrls = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (let fetchTarget of fetchUrls) {
    try {
      const response = await fetch(fetchTarget, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (response.ok) {
        fetchedText = await response.text();
        if (fetchedText && fetchedText.length > 100) {
          break; // Successfully retrieved page HTML
        }
      }
    } catch (err) {
      console.warn(`Scraper fetch warning for target (${fetchTarget}):`, err);
    }
  }

  // Parse HTML
  if (fetchedText) {
    let doc = null;
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        doc = parser.parseFromString(fetchedText, 'text/html');
      } catch (e) {}
    }

    const { mainLogo, opponentLogos } = extractLogosFromDOM(doc, fetchedText, url, teamName);

    // Scan HTML for embedded calendar links (.ics, ical, webcal, ical_add_games)
    let calendarFeedUrl = '';
    
    if (doc) {
      const links = doc.querySelectorAll('a[href]');
      for (let a of links) {
        const href = a.getAttribute('href') || '';
        if (href.includes('.ics') || href.includes('ical') || href.includes('webcal://') || href.includes('calendar/ical') || href.includes('ical_add_games')) {
          calendarFeedUrl = resolveUrl(href.replace(/^webcal:\/\//i, 'https://'), url);
          if (calendarFeedUrl) break;
        }
      }
    }
    
    // Fallback 1: If DOMParser missed it (e.g., hidden in a JSON blob or <script> tag), scan raw HTML text!
    if (!calendarFeedUrl) {
      const hrefRegex = /(?:href|url|data-url)=?\\?["']([^"'\\]*(?:\.ics|ical|webcal|calendar\/ical|ical_add_games)[^"'\\]*)[\\]?["']/gi;
      let match;
      while ((match = hrefRegex.exec(fetchedText)) !== null) {
        calendarFeedUrl = resolveUrl(match[1].replace(/\\/g, '').replace(/^webcal:\/\//i, 'https://'), url);
        if (calendarFeedUrl) break;
      }
    }

    // Fallback 2: Check for dynamic Sports Management Platforms (HockeyTech / LeagueStat / Statview)
    if (!calendarFeedUrl) {
      const clientCodeMatch = fetchedText.match(/var\s+client_code\s*=\s*['"]([^'"]+)['"]/i) ||
                                fetchedText.match(/\/client\/([a-z0-9_-]+)\//i) ||
                                fetchedText.match(/client_code[:=]\s*['"]([^'"]+)['"]/i);
      const clientCode = clientCodeMatch ? clientCodeMatch[1] : '';

      const pathMatch = url.match(/\/schedule\/(\d+)\/(\d+)/i) || 
                         url.match(/[?&]team_id=(\d+).*[?&]season_id=(\d+)/i) ||
                         url.match(/[?&]team=(\d+).*[?&]season=(\d+)/i);
      
      if (clientCode && pathMatch) {
        const teamId = pathMatch[1];
        const seasonId = pathMatch[2];
        calendarFeedUrl = `https://cluster.leaguestat.com/components/calendar/ical_add_games.php?client_code=${clientCode}&season_id=${seasonId}&team_id=${teamId}`;
      }
    }

    // Fallback 3: General raw URL search anywhere in HTML string for .ics feeds or export_ical
    if (!calendarFeedUrl) {
      const rawIcsMatch = fetchedText.match(/https?:\/\/[^\s"'<>]+\.(?:ics|ical)(?:\?[^\s"'<>]*)?/i) ||
                          fetchedText.match(/https?:\/\/[^\s"'<>]*(?:ical_add_games|calendar\/ical|export_ical)[^\s"'<>]*/i);
      if (rawIcsMatch) {
        calendarFeedUrl = rawIcsMatch[0].replace(/\\/g, '').replace(/^webcal:\/\//i, 'https://');
      }
    }

    let games = [];

    if (calendarFeedUrl) {
      try {
        const icalRes = await fetch(calendarFeedUrl);
        if (icalRes.ok) {
          const icalText = await icalRes.text();
          games = parseICS(icalText, teamName, calendarFeedUrl);
        }
      } catch (e) {
        console.warn('Error fetching embedded calendar feed:', e);
      }
    }

    if (games.length === 0) {
      games = parseStructuredData(doc, fetchedText, teamName, url);
    }

    if (games.length === 0) {
      games = parseHTMLTables(doc, fetchedText, teamName, url);
    }

    if (games.length > 0) {
      games.forEach(g => {
        const oppName = g.homeTeam.id === 'custom-main' ? g.awayTeam.name : g.homeTeam.name;
        const oppNameLower = (oppName || '').toLowerCase();

        let oppLogoFound = '';
        for (let [key, logoUrl] of opponentLogos.entries()) {
          if (key.includes(oppNameLower) || oppNameLower.includes(key)) {
            oppLogoFound = logoUrl;
            break;
          }
        }

        if (g.homeTeam.id === 'custom-main') {
          g.homeTeam.logo = mainLogo || DEFAULT_CUSTOM_LOGO;
          g.awayTeam.logo = oppLogoFound || DEFAULT_CUSTOM_LOGO;
        } else {
          g.homeTeam.logo = oppLogoFound || DEFAULT_CUSTOM_LOGO;
          g.awayTeam.logo = mainLogo || DEFAULT_CUSTOM_LOGO;
        }
      });

      return { games, logo: mainLogo || DEFAULT_CUSTOM_LOGO };
    }
  }

  return { games: [], logo: DEFAULT_CUSTOM_LOGO };
}
