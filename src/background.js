// background.js

const MLS_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard';
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
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
});

// Listen for messages from popup or dev testing hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateAlarms') {
    checkGamesAndSetAlarms(message.trackedTeams);
    sendResponse({ status: 'ok' });
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
    const defaultLeadTime = storageData.reminderLeadTime || '1h';
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
      } else if (typeof reminderSetting === 'string') {
        // Handle legacy single lead time string (e.g. '15m')
        const leadMs = parseLeadTimeMs(reminderSetting);
        // Set fallback alarm if needed
      }
    });
  } catch (error) {
    console.error("Error checking games in background:", error);
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
