// background.js

const MLS_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard';
const ALARM_NAME = 'check-upcoming-games';

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Remind Sports Extension Installed");
  // Set alarm to check games every 30 minutes
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
});

// Listen for messages from popup (e.g. when tracked teams change)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateAlarms') {
    checkGamesAndSetAlarms(message.trackedTeams);
    sendResponse({ status: 'ok' });
  }
});

// Handle recurring alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    chrome.storage.local.get(['trackedTeams'], (result) => {
      if (result.trackedTeams && result.trackedTeams.length > 0) {
        checkGamesAndSetAlarms(result.trackedTeams);
      }
    });
  } else if (alarm.name.startsWith('game-')) {
    // This is a specific game reminder alarm
    triggerNotification(alarm.name);
  }
});

async function checkGamesAndSetAlarms(trackedTeams) {
  try {
    const response = await fetch(MLS_API_URL);
    if (!response.ok) return;
    const data = await response.json();
    
    if (!data.events) return;
    
    const teamIds = trackedTeams.map(t => t.id);
    const now = new Date().getTime();
    
    data.events.forEach(event => {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      const hasTrackedTeam = competitors.some(comp => teamIds.includes(comp.team.id));
      
      if (hasTrackedTeam) {
        const gameTime = new Date(event.date).getTime();
        // Calculate time 1 hour before the game
        const reminderTime = gameTime - (60 * 60 * 1000); 
        
        // If the reminder time is in the future, set an alarm
        if (reminderTime > now) {
          const alarmId = `game-${event.id}`;
          
          const homeTeam = competitors.find(c => c.homeAway === 'home').team;
          const awayTeam = competitors.find(c => c.homeAway === 'away').team;
          const matchTitle = `${awayTeam.abbreviation} @ ${homeTeam.abbreviation} in 1 hour!`;
          
          // Save game info for the notification
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
    if (gameInfo) {
      chrome.notifications.create(alarmId, {
        type: 'basic',
        iconUrl: 'icon.png',
        title: gameInfo.title,
        message: gameInfo.message,
        priority: 2
      });
      // Clean up storage
      chrome.storage.local.remove(alarmId);
    }
  });
}
