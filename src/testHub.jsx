import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import NextGames from './components/NextGames.jsx';
import './global.css';

const MLS_TEAMS_SAMPLE = [
  { id: '18630', name: 'Inter Miami CF', abbreviation: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/18630.png' },
  { id: '9784', name: 'CF Montréal', abbreviation: 'MTL', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/9784.png' },
  { id: '18418', name: 'Atlanta United FC', abbreviation: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/18418.png' },
  { id: '928', name: 'New England Revolution', abbreviation: 'NE', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/928.png' },
  { id: '20232', name: 'Austin FC', abbreviation: 'ATX', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/20232.png' },
  { id: '599', name: 'Houston Dynamo FC', abbreviation: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/599.png' }
];

function TestHubApp() {
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'preview'
  const [awayTeam, setAwayTeam] = useState(MLS_TEAMS_SAMPLE[0]);
  const [homeTeam, setHomeTeam] = useState(MLS_TEAMS_SAMPLE[1]);
  const [matchDate, setMatchDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [venue, setVenue] = useState('Stade Saputo');
  
  const [gameReminders, setGameReminders] = useState({ 'fictional-game-1': '15m' });
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const fictionalGame = {
    id: 'fictional-game-1',
    date: matchDate,
    venue: venue,
    awayTeam: awayTeam,
    homeTeam: homeTeam
  };

  const handleToggleGameReminder = (gameId, currentSetting) => {
    const seq = ['15m', '30m', '45m', '1h', 'off'];
    const nextSetting = seq[(seq.indexOf(currentSetting) + 1) % seq.length];
    setGameReminders(prev => ({ ...prev, [gameId]: nextSetting }));
  };

  const requestDesktopPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        setStatusMessage('✅ Desktop notification permission granted!');
      } else {
        setStatusMessage('⚠️ Desktop notification permission was denied. Please allow notifications in browser site settings.');
      }
    }
  };

  const fireDesktopNotification = (title, body) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'triggerDesktopNotification',
        title: title,
        message: body
      });
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: '/icon.png'
        });
      } catch (err) {
        console.error("Desktop Notification creation error:", err);
      }
    }
  };

  const loadAlarms = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getActiveAlarms' }, (res) => {
        if (res && res.alarms) {
          setActiveAlarms(res.alarms);
        }
      });
    }
  };

  useEffect(() => {
    loadAlarms();
    const interval = setInterval(loadAlarms, 2000);
    return () => clearInterval(interval);
  }, []);

  const triggerTestAlarm = async (delaySeconds) => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      await requestDesktopPermission();
    }

    const currentSetting = gameReminders['fictional-game-1'] || '15m';
    const matchTitle = `⚽ ${awayTeam.abbreviation} @ ${homeTeam.abbreviation} (${currentSetting} Reminder)`;
    const matchBody = `Match starts soon at ${venue}! (${currentSetting} before kickoff)`;

    if (delaySeconds <= 1) {
      fireDesktopNotification(matchTitle, matchBody);
      setStatusMessage(`🔔 Desktop notification sent! Check your system notification banner.`);
      setTimeout(() => setStatusMessage(''), 5000);
      return;
    }

    setStatusMessage(`⏱️ Desktop Notification scheduled! Will pop up in ${delaySeconds} seconds...`);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'setTestAlarm',
        delaySeconds: delaySeconds,
        matchTitle: matchTitle,
        leadTime: currentSetting,
        venue: venue
      }, () => loadAlarms());
    }

    setTimeout(() => {
      fireDesktopNotification(matchTitle, matchBody);
      setStatusMessage(`🔔 Desktop notification triggered after ${delaySeconds}s!`);
      setTimeout(() => setStatusMessage(''), 5000);
    }, delaySeconds * 1000);
  };

  const handleClearAlarms = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'clearAllAlarms' }, () => {
        setStatusMessage('Cleared all Chrome alarms.');
        setTimeout(() => setStatusMessage(''), 3000);
        loadAlarms();
      });
    }
  };

  const handleResetExtensionState = () => {
    if (confirm('Reset local extension state (tracked teams & preferences)?')) {
      localStorage.removeItem('trackedTeams');
      localStorage.removeItem('reminderLeadTime');
      localStorage.removeItem('gameReminders');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear();
      }
      setStatusMessage('Extension state reset successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0b1120', padding: '32px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: '#151e32', borderRadius: '16px', padding: '32px', border: '1px solid #2a3449', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #2a3449', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              🧪 Localhost Extension Suite & Dev Hub
            </h1>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Test notification alarms or view a live updating replica of the Chrome Extension in real time.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {notifPermission !== 'granted' && (
              <button 
                onClick={requestDesktopPermission}
                style={{ background: '#f59e0b', color: '#0b1120', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                🔔 Enable Desktop Notifications
              </button>
            )}
            <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(74, 222, 128, 0.3)' }}>
              Desktop Dev Scene
            </span>
          </div>
        </div>

        {/* Top Main Navigation Bar */}
        <div style={{ display: 'flex', background: '#0b1120', borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '28px', border: '1px solid #2a3449' }}>
          <button
            onClick={() => setActiveTab('hub')}
            style={{
              flex: 1,
              background: activeTab === 'hub' ? '#151e32' : 'transparent',
              color: activeTab === 'hub' ? '#4ade80' : '#94a3b8',
              border: activeTab === 'hub' ? '1px solid #2a3449' : 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            🧪 Notification Testing Hub
          </button>
          
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              flex: 1,
              background: activeTab === 'preview' ? '#151e32' : 'transparent',
              color: activeTab === 'preview' ? '#4ade80' : '#94a3b8',
              border: activeTab === 'preview' ? '1px solid #2a3449' : 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            📱 Extension Live Preview (Full Replica)
          </button>
        </div>

        {statusMessage && (
          <div style={{ background: '#1e293b', color: '#4ade80', padding: '12px 18px', borderRadius: '10px', marginBottom: '24px', border: '1px solid #4ade80', fontSize: '14px', fontWeight: 500 }}>
            {statusMessage}
          </div>
        )}

        {/* TAB 1: NOTIFICATION TESTING HUB */}
        {activeTab === 'hub' && (
          <>
            {/* 2-Column Desktop Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              
              {/* Column 1: Match Setup Form */}
              <div style={{ background: '#0b1120', padding: '24px', borderRadius: '12px', border: '1px solid #2a3449' }}>
                <h2 style={{ fontSize: '16px', color: '#4ade80', marginTop: 0, marginBottom: '16px', fontWeight: 700 }}>
                  1. Fictional Match Setup
                </h2>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Away Team</label>
                  <select className="team-select" style={{ width: '100%', padding: '12px', fontSize: '14px' }} value={awayTeam.id} onChange={(e) => setAwayTeam(MLS_TEAMS_SAMPLE.find(t => t.id === e.target.value))}>
                    {MLS_TEAMS_SAMPLE.map(t => <option key={t.id} value={t.id}>{t.name} ({t.abbreviation})</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Home Team</label>
                  <select className="team-select" style={{ width: '100%', padding: '12px', fontSize: '14px' }} value={homeTeam.id} onChange={(e) => setHomeTeam(MLS_TEAMS_SAMPLE.find(t => t.id === e.target.value))}>
                    {MLS_TEAMS_SAMPLE.map(t => <option key={t.id} value={t.id}>{t.name} ({t.abbreviation})</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Match Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="search-input" 
                    value={matchDate} 
                    onChange={(e) => setMatchDate(e.target.value)}
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Venue</label>
                  <input 
                    type="text" 
                    className="search-input" 
                    value={venue} 
                    onChange={(e) => setVenue(e.target.value)}
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Column 2: Extension Popup Replica Preview */}
              <div style={{ background: '#0b1120', padding: '24px', borderRadius: '12px', border: '1px solid #2a3449', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', color: '#4ade80', marginTop: 0, marginBottom: '4px', fontWeight: 700 }}>
                    2. Replica Game Card & Interactive Bell
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Click the bell icon on the preview card below to cycle reminder times (15m ➔ 30m ➔ 45m ➔ 1h ➔ Off):
                  </p>
                </div>
                
                {/* Styled Extension Card Frame */}
                <div style={{ width: '100%', maxWidth: '380px', background: '#151e32', padding: '20px', borderRadius: '16px', border: '1px solid #2a3449', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <NextGames 
                    games={[fictionalGame]} 
                    reminderLeadTime="15m" 
                    gameReminders={gameReminders} 
                    onToggleGameReminder={handleToggleGameReminder} 
                  />
                </div>
              </div>

            </div>

            {/* Section 3: Desktop Notification Trigger Suite */}
            <div style={{ background: '#0b1120', padding: '24px', borderRadius: '12px', border: '1px solid #2a3449', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', color: '#4ade80', marginTop: 0, marginBottom: '6px', fontWeight: 700 }}>
                3. Desktop Notification Trigger Suite
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
                Test real OS Desktop Notifications end-to-end. Click any button below to trigger a live Desktop Notification:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <button className="add-team-btn" style={{ padding: '14px', fontSize: '14px', fontWeight: 600 }} onClick={() => triggerTestAlarm(5)}>
                  ⚡ 5s Desktop Notification Test
                </button>
                <button className="add-team-btn" style={{ padding: '14px', fontSize: '14px', fontWeight: 600 }} onClick={() => triggerTestAlarm(10)}>
                  ⏱️ 10s Desktop Notification Test
                </button>
                <button className="cancel-team-btn" style={{ padding: '14px', fontSize: '14px', fontWeight: 600, color: '#4ade80', borderColor: '#4ade80', background: 'rgba(74,222,128,0.1)' }} onClick={() => triggerTestAlarm(1)}>
                  🔔 Send Desktop Notification Now
                </button>
                <button className="add-team-btn" style={{ padding: '14px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(180deg, #3870b2 0%, #204c82 100%)', borderColor: '#4a8adb' }} onClick={() => {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'checkStartupReminders' });
                    setStatusMessage('🚀 Browser startup game day check triggered!');
                    setTimeout(() => setStatusMessage(''), 4000);
                  } else {
                    fireDesktopNotification('⏰ Game Day Reminder: MIA @ MTL', 'Match starts today at 7:30 PM (2 hours 15 minutes remaining)!');
                    setStatusMessage('🚀 Browser startup test notification fired!');
                    setTimeout(() => setStatusMessage(''), 4000);
                  }
                }}>
                  🚀 Test Browser Startup Notification
                </button>
              </div>
            </div>

            {/* Section 4: Active Alarms Monitor */}
            <div style={{ background: '#0b1120', padding: '24px', borderRadius: '12px', border: '1px solid #2a3449' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                  Active Chrome Alarms ({activeAlarms.length})
                </h2>
                <button className="cancel-team-btn" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={handleClearAlarms}>
                  Clear All Alarms
                </button>
              </div>
              {activeAlarms.length === 0 ? (
                <div style={{ fontSize: '14px', color: '#94a3b8', padding: '12px 0' }}>No active alarms currently registered in the Chrome background service worker.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {activeAlarms.map((a, i) => (
                    <div key={i} style={{ background: '#151e32', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #2a3449' }}>
                      <span style={{ color: '#4ade80', fontWeight: '600' }}>{a.name}</span>
                      <span style={{ color: '#94a3b8' }}>Scheduled: {new Date(a.scheduledTime).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: LIVE EXTENSION PREVIEW */}
        {activeTab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Dev Controls Toolbar */}
            <div style={{ width: '100%', maxWidth: '440px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#0b1120', padding: '12px 16px', borderRadius: '10px', border: '1px solid #2a3449' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Vite HMR Active</span>
              </div>
              <button 
                className="cancel-team-btn" 
                style={{ fontSize: '12px', padding: '6px 12px', color: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleResetExtensionState}
              >
                Reset Extension State
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', textAlign: 'center' }}>
              Below is a live rendering of the actual Chrome Extension. Every code edit made to components, modals, APIs, or CSS will hot-reload live right here!
            </p>

            {/* Extension Popup 420px Frame */}
            <div style={{ width: '420px', background: '#0b1120', border: '1px solid #2a3449', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
              <App />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('test-root')).render(
  <React.StrictMode>
    <TestHubApp />
  </React.StrictMode>
);
