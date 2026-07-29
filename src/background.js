// background.js - Universal Chromium Browser Compatible Service Worker

const ALARM_NAME = 'check-upcoming-games';

// Cross-browser API accessor (Chrome, Comet, Brave, Edge, Opera, Vivaldi, Firefox)
const extApi = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : null);

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

function getIconUrl() {
  if (extApi && extApi.runtime && extApi.runtime.getURL) {
    try {
      return extApi.runtime.getURL('icon.png');
    } catch (e) {
      return 'icon.png';
    }
  }
  return 'icon.png';
}

/**
 * Universal Desktop Notification Dispatcher
 * Compatible with Google Chrome, Comet, Brave, Edge, Vivaldi, Opera & Firefox WebExtensions.
 * Uses chrome.notifications with seamless ServiceWorker showNotification fallback.
 */
function createUniversalNotification(notifId, title, message) {
  const iconUrl = getIconUrl();

  // Primary Path: Extension Notification API
  if (extApi && extApi.notifications && extApi.notifications.create) {
    try {
      extApi.notifications.create(notifId, {
        type: 'basic',
        iconUrl: iconUrl,
        title: title,
        message: message,
        priority: 2
      }, (createdId) => {
        if (extApi.runtime && extApi.runtime.lastError) {
          console.warn("[Remind Sports] chrome.notifications.create lastError, trying ServiceWorker fallback:", extApi.runtime.lastError);
          fallbackServiceWorkerNotification(title, message, iconUrl);
        }
      });
      return;
    } catch (err) {
      console.warn("[Remind Sports] chrome.notifications.create threw error, resorting to fallback:", err);
    }
  }

  // Secondary Fallback: Standard ServiceWorker Registration Notification (HTML5/Web standard)
  fallbackServiceWorkerNotification(title, message, iconUrl);
}

function fallbackServiceWorkerNotification(title, message, iconUrl) {
  if (typeof self !== 'undefined' && self.registration && self.registration.showNotification) {
    try {
      self.registration.showNotification(title, {
        body: message,
        icon: iconUrl,
        badge: iconUrl,
        tag: title
      });
    } catch (err) {
      console.error("[Remind Sports] ServiceWorker showNotification error:", err);
    }
  }
}

// Initialize extension on install / update
if (extApi && extApi.runtime && extApi.runtime.onInstalled) {
  extApi.runtime.onInstalled.addListener(() => {
    console.log("[Remind Sports] Extension Installed / Activated across Chromium engine");
    if (extApi.alarms) {
      extApi.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
    }
  });
}

// Service Worker Activation Hook (For Chromium derivatives like Comet)
if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('activate', (event) => {
    console.log("[Remind Sports] Service worker activated. Running startup check...");
    checkBrowserStartupReminders(false);
  });
}

// Browser Startup Listener (Chrome, Comet, Brave, Edge, Vivaldi)
if (extApi && extApi.runtime && extApi.runtime.onStartup) {
  extApi.runtime.onStartup.addListener(() => {
    console.log("[Remind Sports] Browser onStartup event fired. Checking game day reminders...");
    checkBrowserStartupReminders(true);
  });
}

// Listen for messages from popup or dev testing hub
if (extApi && extApi.runtime && extApi.runtime.onMessage) {
  extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateAlarms') {
      checkGamesAndSetAlarms(message.trackedTeams);
      sendResponse({ status: 'ok' });
    } else if (message.action === 'checkStartupReminders') {
      checkBrowserStartupReminders(true);
      sendResponse({ status: 'triggered' });
    } else if (message.action === 'triggerDesktopNotification') {
      const notifId = `desktop-notif-${Date.now()}`;
      createUniversalNotification(
        notifId,
        message.title || '⚽ Remind Sports Desktop Alert',
        message.message || 'Inter Miami CF vs CF Montréal starts soon!'
      );
      sendResponse({ status: 'sent', notifId });
    } else if (message.action === 'setTestAlarm') {
      const alarmId = `test-alarm-${Date.now()}`;
      const delayMinutes = (message.delaySeconds || 5) / 60;
      
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.set({
          [alarmId]: {
            title: message.matchTitle || 'TEST MATCH: MIA @ MTL',
            message: `Reminder: Match starts soon at ${message.venue || 'Stade Saputo'}!`
          }
        });
      }
      
      if (extApi.alarms) {
        extApi.alarms.create(alarmId, { delayInMinutes: delayMinutes });
      }
      sendResponse({ status: 'ok', alarmId, delaySeconds: message.delaySeconds || 5 });
    } else if (message.action === 'getActiveAlarms') {
      if (extApi.alarms) {
        extApi.alarms.getAll((alarms) => {
          sendResponse({ alarms });
        });
        return true; // async response
      } else {
        sendResponse({ alarms: [] });
      }
    } else if (message.action === 'clearAllAlarms') {
      if (extApi.alarms) {
        extApi.alarms.clearAll((wasCleared) => {
          sendResponse({ status: wasCleared ? 'cleared' : 'failed' });
        });
        return true;
      }
      sendResponse({ status: 'unsupported' });
    }
  });
}

// Handle recurring alarm & game alarms
if (extApi && extApi.alarms && extApi.alarms.onAlarm) {
  extApi.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.get(['trackedTeams'], (result) => {
          if (result.trackedTeams && result.trackedTeams.length > 0) {
            checkGamesAndSetAlarms(result.trackedTeams);
          }
          checkBrowserStartupReminders(false);
        });
      }
    } else if (alarm.name.startsWith('game-') || alarm.name.startsWith('test-alarm-')) {
      triggerNotification(alarm.name);
    }
  });
}

async function checkGamesAndSetAlarms(trackedTeams) {
  try {
    if (!extApi || !extApi.storage || !extApi.storage.local) return;

    const storageData = await new Promise(resolve => {
      extApi.storage.local.get(['gameReminders', 'reminderLeadTime'], resolve);
    });
    
    const gameReminders = storageData.gameReminders || {};
    const now = new Date().getTime();

    // Iterate through all configured gameReminders
    Object.keys(gameReminders).forEach(gameId => {
      const reminderSetting = gameReminders[gameId];
      if (!reminderSetting || reminderSetting === 'off') return;

      if (Array.isArray(reminderSetting)) {
        reminderSetting.forEach(isoTimeStr => {
          const alarmTimeMs = new Date(isoTimeStr).getTime();
          // STRICT FILTER: Only schedule alarms that are strictly in the future (at least 5s ahead)
          if (alarmTimeMs > (now + 5000)) {
            const alarmId = `game-${gameId}-${alarmTimeMs}`;
            const alarmClockStr = new Date(alarmTimeMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            
            extApi.storage.local.set({
              [alarmId]: {
                title: `⏰ Match Reminder (${alarmClockStr})`,
                message: `Your tracked match is starting soon! Don't miss kick-off/tip-off.`
              }
            });
            
            if (extApi.alarms) {
              extApi.alarms.create(alarmId, { when: alarmTimeMs });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error("[Remind Sports] Error checking games in background:", error);
  }
}

/**
 * Checks for game day matches of tracked teams on browser launch and sends time-remaining notifications.
 * Uses stable Notification IDs to strictly enforce EXACTLY ONE notification per game per day across all Chromium browsers.
 */
async function checkBrowserStartupReminders(forceRun = false) {
  try {
    if (!extApi || !extApi.storage || !extApi.storage.local) return;

    const result = await new Promise(resolve => {
      extApi.storage.local.get(['trackedTeams', 'startupNotificationEnabled', 'browserStartupReminders', 'lastStartupCheckTime'], resolve);
    });

    const trackedTeams = result.trackedTeams || [];
    const globalEnabled = result.startupNotificationEnabled === true;
    const gameStartupMap = result.browserStartupReminders || {};
    const lastCheckTime = result.lastStartupCheckTime || 0;

    if (trackedTeams.length === 0) return;

    const now = new Date();
    const nowMs = now.getTime();

    // Deduplicate executions within 15 seconds to avoid double-firing on startup
    if (!forceRun && (nowMs - lastCheckTime < 15000)) {
      return;
    }

    extApi.storage.local.set({ lastStartupCheckTime: nowMs });

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayYmd = `${yyyy}${mm}${dd}`;
    const todayStr = now.toDateString();

    const gamesToday = [];

    // Fetch today's scoreboard for all tracked sports/leagues with explicit dates parameter
    const sportSlugs = Array.from(new Set(trackedTeams.map(t => t.sportSlug || 'soccer/usa.1')));
    if (trackedTeams.some(t => !t.sportSlug)) {
      ['soccer/usa.1', 'basketball/nba', 'baseball/mlb', 'hockey/nhl', 'football/nfl'].forEach(s => {
        if (!sportSlugs.includes(s)) sportSlugs.push(s);
      });
    }

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
                  c.team && trackedTeams.some(tt => 
                    String(tt.id) === String(c.team.id) ||
                    (tt.name && c.team.displayName && tt.name.toLowerCase().trim() === c.team.displayName.toLowerCase().trim()) ||
                    (tt.name && c.team.name && tt.name.toLowerCase().includes(c.team.name.toLowerCase()))
                  )
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
        console.error(`[Remind Sports] Error fetching scoreboard for ${slug}:`, err);
      }
    }

    // Fetch individual team schedules for any tracked team not yet found
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
        console.error(`[Remind Sports] Error fetching team schedule for ${team.name}:`, err);
      }
    }

    // Deduplicate games by game ID
    const uniqueGamesMap = new Map();
    gamesToday.forEach(g => uniqueGamesMap.set(g.id, g));
    const finalGamesList = Array.from(uniqueGamesMap.values());

    // Process all games today and trigger universal notifications
    finalGamesList.forEach(game => {
      const isSpecificEnabled = gameStartupMap[game.id] === true;

      // Trigger if global setting is enabled OR specific game setting is enabled
      if (globalEnabled || isSpecificEnabled) {
        const diffMs = game.date.getTime() - nowMs;
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
        const notifId = `startup-game-${game.id}-${todayYmd}`;

        createUniversalNotification(
          notifId,
          `⏰ Game Day Alert: ${game.name}`,
          `Match starts today at ${matchTimeStr} (${timeDiffStr} remaining)!`
        );
      }
    });
  } catch (err) {
    console.error("[Remind Sports] Error checking browser startup reminders:", err);
  }
}

function triggerNotification(alarmId) {
  if (!extApi || !extApi.storage || !extApi.storage.local) return;

  extApi.storage.local.get([alarmId], (result) => {
    const gameInfo = result[alarmId];
    const title = gameInfo ? gameInfo.title : 'Remind Sports Game Alert!';
    const message = gameInfo ? gameInfo.message : 'Your tracked game is starting soon!';
    
    createUniversalNotification(alarmId, title, message);
    extApi.storage.local.remove(alarmId);
  });
}
