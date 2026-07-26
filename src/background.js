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
      message: message.message || 'Inter Miami CF vs CF Montréal starts in 15 minutes at Stade Saputo!',
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
        message: `Reminder: Match starts in ${message.leadTime || '15m'} at ${message.venue || 'Stade Saputo'}!`
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
    const response = await fetch(MLS_API_URL);
    if (!response.ok) return;
    const data = await response.json();
    
    if (!data.events) return;
    
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(['gameReminders', 'reminderLeadTime'], resolve);
    });
    
    const gameReminders = storageData.gameReminders || {};
    const defaultLeadTime = storageData.reminderLeadTime || '1h';
    const teamIds = trackedTeams.map(t => t.id);
    const now = new Date().getTime();
    
    data.events.forEach(event => {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      const hasTrackedTeam = competitors.some(comp => teamIds.includes(comp.team.id));
      
      if (hasTrackedTeam) {
        const gameSetting = gameReminders[event.id] !== undefined ? gameReminders[event.id] : defaultLeadTime;
        
        if (gameSetting === 'off') {
          chrome.alarms.clear(`game-${event.id}`);
          return;
        }
        
        const leadMs = parseLeadTimeMs(gameSetting);
        const gameTime = new Date(event.date).getTime();
        const reminderTime = gameTime - leadMs;
        
        if (reminderTime > now) {
          const alarmId = `game-${event.id}`;
          const homeTeam = competitors.find(c => c.homeAway === 'home').team;
          const awayTeam = competitors.find(c => c.homeAway === 'away').team;
          const matchTitle = `${awayTeam.abbreviation} @ ${homeTeam.abbreviation} starting in ${gameSetting}!`;
          
          chrome.storage.local.set({
            [alarmId]: {
              title: matchTitle,
              message: `The game starts soon at ${competition.venue ? competition.venue.fullName : 'TBD'}`
            }
          });
          
          chrome.alarms.create(alarmId, { when: reminderTime });
          console.log(`Alarm set for ${matchTitle} at ${new Date(reminderTime).toLocaleTimeString()}`);
        }
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
