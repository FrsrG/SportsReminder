// background.js

const ALARM_NAME = 'check-upcoming-games';

// Helper to convert lead time string ('15m', '30m', '45m', '1h', '2h') to milliseconds
function parseLeadTimeMs(leadTimeStr) {
  switch (leadTimeStr) {
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '45m': return 45 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '2h': return 120 * 60 * 1000;
    default: return 60 * 60 * 1000; // default 1h
  }
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Remind Sports Extension Installed");
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
});

// Browser Startup Listener (triggers when user launches browser on game day)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    console.log("Browser launched. Checking game day startup reminders...");
    checkBrowserStartupReminders();
  });
}

// Listen for messages from popup or dev testing hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateAlarms') {
    checkGamesAndSetAlarms(message.trackedTeams);
    checkBrowserStartupReminders();
    sendResponse({ status: 'ok' });
  } else if (message.action === 'checkStartupReminders') {
    checkBrowserStartupReminders();
    sendResponse({ status: 'triggered' });
  } else if (message.action === 'triggerDesktopNotification') {
    // Direct trigger desktop notification
    const notifId = `desktop-notif-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icon.png',
      title: message.title || '⚽ Remind Sports Desktop Alert',
      message: message.message || 'Inter Miami CF vs CF Montréal starts soon!',
      priority: 2
    });
    sendResponse({ status: 'sent', notifId });
  } else if (message.action === 'setTestAlarm') {
    // Schedule an immediate or fast-forwarded alarm for testing
    const alarmId = `test-alarm-${Date.now()}`;
    const delayMinutes = (message.delaySeconds || 5) / 60;
    
    chrome.storage.local.set({
      [alarmId]: {
        title: message.matchTitle || 'TEST MATCH: MIA @ MTL',
        message: `Reminder: Match starts soon at ${message.venue || 'Stade Saputo'}!`
      }
    });
    
    chrome.alarms.create(alarmId, { delayInMinutes: delayMinutes });
    sendResponse({ status: 'ok', alarmId, delaySeconds: message.delaySeconds || 5 });
  } else if (message.action === 'getActiveAlarms') {
    chrome.alarms.getAll((alarms) => {
      sendResponse({ alarms });
    });
    return true; // async response
  } else if (message.action === 'clearAllAlarms') {
    chrome.alarms.clearAll((wasCleared) => {
      sendResponse({ status: wasCleared ? 'cleared' : 'failed' });
    });
    return true;
  }
});

// Handle recurring alarm & game alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    chrome.storage.local.get(['trackedTeams'], (result) => {
      if (result.trackedTeams && result.trackedTeams.length > 0) {
        checkGamesAndSetAlarms(result.trackedTeams);
      }
    });
  } else if (alarm.name.startsWith('game-') || alarm.name.startsWith('test-alarm-')) {
    triggerNotification(alarm.name);
  }
});

async function checkGamesAndSetAlarms(trackedTeams) {
  try {
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(['gameReminders', 'reminderLeadTime'], resolve);
    });
    
    const gameReminders = storageData.gameReminders || {};
    const now = new Date().getTime();

    // Iterate through all configured gameReminders
    Object.keys(gameReminders).forEach(gameId => {
      const reminderSetting = gameReminders[gameId];
      if (!reminderSetting || reminderSetting === 'off') return;

      // Handle array of ISO timestamps (from iOS Alarm Modal)
      if (Array.isArray(reminderSetting)) {
        reminderSetting.forEach(isoTimeStr => {
          const alarmTimeMs = new Date(isoTimeStr).getTime();
          if (alarmTimeMs > now) {
            const alarmId = `game-${gameId}-${alarmTimeMs}`;
            const alarmClockStr = new Date(alarmTimeMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            
            chrome.storage.local.set({
              [alarmId]: {
                title: `⏰ Match Reminder (${alarmClockStr})`,
                message: `Your tracked match is starting soon! Don't miss kick-off/tip-off.`
              }
            });
            
            chrome.alarms.create(alarmId, { when: alarmTimeMs });
          }
        });
      }
    });
  } catch (error) {
    console.error("Error checking games in background:", error);
  }
}

/**
 * Checks for game day matches of tracked teams on browser launch and sends time-remaining notifications.
 */
async function checkBrowserStartupReminders() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['trackedTeams', 'startupNotificationEnabled', 'browserStartupReminders'], resolve);
    });

    const trackedTeams = result.trackedTeams || [];
    const globalEnabled = result.startupNotificationEnabled === true;
    const gameStartupMap = result.browserStartupReminders || {};

    if (trackedTeams.length === 0) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayYmd = `${yyyy}${mm}${dd}`;
    const todayStr = now.toDateString();

    const gamesToday = [];

    // Method 1: Fetch today's scoreboard for all tracked sports/leagues with explicit dates parameter
    const sportSlugs = Array.from(new Set(trackedTeams.map(t => t.sportSlug || 'soccer/usa.1')));

    for (const slug of sportSlugs) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${slug}/scoreboard?limit=1000&dates=${todayYmd}`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();

        if (data && data.events) {
          data.events.forEach(evt => {
            if (evt && evt.date) {
              const gDate = new Date(evt.date);
              if (gDate.toDateString() === todayStr) {
                const competition = evt.competitions ? evt.competitions[0] : null;
                const competitors = competition ? competition.competitors : [];
                
                const isTracked = competitors.some(c => 
                  c.team && trackedTeams.some(tt => String(tt.id) === String(c.team.id))
                );

                if (isTracked) {
                  gamesToday.push({
                    id: String(evt.id),
                    name: evt.name || evt.shortName || 'Tracked Game',
                    date: gDate,
                    sportSlug: slug
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching scoreboard for ${slug}:`, err);
      }
    }

    // Method 2: Fetch individual team schedules for any tracked team not yet found
    for (const team of trackedTeams) {
      const slug = team.sportSlug || 'soccer/usa.1';
      try {
        const teamSchedUrl = `https://site.api.espn.com/apis/site/v2/sports/${slug}/teams/${team.id}/schedule`;
        const resp = await fetch(teamSchedUrl);
        if (!resp.ok) continue;
        const data = await resp.json();

        if (data && data.events) {
          data.events.forEach(evt => {
            if (evt && evt.date) {
              const gDate = new Date(evt.date);
              if (gDate.toDateString() === todayStr) {
                const gameId = String(evt.id);
                if (!gamesToday.some(g => g.id === gameId)) {
                  gamesToday.push({
                    id: gameId,
                    name: evt.name || evt.shortName || `${team.name} Game`,
                    date: gDate,
                    sportSlug: slug
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching team schedule for ${team.name}:`, err);
      }
    }

    // Process all games today and trigger notifications
    gamesToday.forEach(game => {
      const isSpecificEnabled = gameStartupMap[game.id] === true;

      // Trigger if global setting is enabled OR specific game setting is enabled
      if (globalEnabled || isSpecificEnabled) {
        const diffMs = game.date.getTime() - now.getTime();
        let timeDiffStr = '';

        if (diffMs <= 0) {
          timeDiffStr = 'LIVE now!';
        } else {
          const totalMins = Math.floor(diffMs / (1000 * 60));
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;

          if (hours > 0 && mins > 0) {
            timeDiffStr = `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
          } else if (hours > 0) {
            timeDiffStr = `${hours} hour${hours > 1 ? 's' : ''}`;
          } else {
            timeDiffStr = `${mins} minute${mins > 1 ? 's' : ''}`;
          }
        }

        const matchTimeStr = game.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        chrome.notifications.create(`startup-game-${game.id}-${Date.now()}`, {
          type: 'basic',
          iconUrl: 'icon.png',
          title: `⏰ Game Day Reminder: ${game.name}`,
          message: `Match starts today at ${matchTimeStr} (${timeDiffStr} remaining)!`,
          priority: 2
        });
      }
    });
  } catch (err) {
    console.error("Error checking browser startup reminders:", err);
  }
}

function triggerNotification(alarmId) {
  chrome.storage.local.get([alarmId], (result) => {
    const gameInfo = result[alarmId];
    const title = gameInfo ? gameInfo.title : 'Remind Sports Game Alert!';
    const message = gameInfo ? gameInfo.message : 'Your tracked game is starting soon!';
    
    chrome.notifications.create(alarmId, {
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message,
      priority: 2
    });
    
    chrome.storage.local.remove(alarmId);
  });
}
