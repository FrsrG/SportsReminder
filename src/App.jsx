import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import SportSelector from './components/SportSelector.jsx';
import LeagueSelector from './components/LeagueSelector.jsx';
import TrackingList from './components/TrackingList.jsx';
import NextGames from './components/NextGames.jsx';
import QuickActions from './components/QuickActions.jsx';
import Modal from './components/Modal.jsx';
import FavoritesModal from './components/FavoritesModal.jsx';
import ExportModal from './components/ExportModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import FullScheduleModal from './components/FullScheduleModal.jsx';
import GameAlarmModal from './components/GameAlarmModal.jsx';
import CalendarModal from './components/CalendarModal.jsx';

import { fetchLeagueScoreboard, extractGamesForTeams, fetchTeamSchedule } from './espnApi.js';
import { loadLeagueTeams, preloadLeagueSchedules, LEAGUES_FLAT, ensureTeamSportSlug, initCustomData, addCustomTeamToStore } from './leagueManager.js';

export default function App() {
  const [selectedSport, setSelectedSport] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState('mls');
  const [trackedTeams, setTrackedTeams] = useState([]);
  const [reminderLeadTime, setReminderLeadTime] = useState('1h');
  const [gameReminders, setGameReminders] = useState({});
  const [startupNotificationEnabled, setStartupNotificationEnabled] = useState(false);
  const [browserStartupReminders, setBrowserStartupReminders] = useState({});
  const [customLeadMinsMap, setCustomLeadMinsMap] = useState({});
  const [customTeams, setCustomTeams] = useState([]);
  const [customSchedules, setCustomSchedules] = useState([]);
  
  const [apiData, setApiData] = useState(null);
  const [allTeamsList, setAllTeamsList] = useState([]);
  const [teamSchedules, setTeamSchedules] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState('Not synced');
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null);
  const [selectedGameForAlarm, setSelectedGameForAlarm] = useState(null);

  // Load Initial Data & Migration
  useEffect(() => {
    const processLoadedData = (result) => {
      const currentSelectedLeague = result.selectedLeague || selectedLeague;
      
      const loadedCustomTeams = result.customTeams || [];
      const loadedCustomSchedules = result.customSchedules || [];
      setCustomTeams(loadedCustomTeams);
      setCustomSchedules(loadedCustomSchedules);
      initCustomData(loadedCustomTeams, loadedCustomSchedules);

      if (result.trackedTeams) {
        const migratedTeams = result.trackedTeams.map(t => ensureTeamSportSlug(t, currentSelectedLeague));
        setTrackedTeams(migratedTeams);
      }
      if (result.reminderLeadTime) setReminderLeadTime(result.reminderLeadTime);
      if (result.gameReminders) setGameReminders(result.gameReminders);
      if (result.selectedSport) setSelectedSport(result.selectedSport);
      if (result.selectedLeague) setSelectedLeague(result.selectedLeague);
      if (result.startupNotificationEnabled !== undefined) setStartupNotificationEnabled(result.startupNotificationEnabled);
      if (result.browserStartupReminders) setBrowserStartupReminders(result.browserStartupReminders);
      if (result.customLeadMinsMap) setCustomLeadMinsMap(result.customLeadMinsMap);
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([
        'trackedTeams', 'reminderLeadTime', 'gameReminders', 
        'selectedSport', 'selectedLeague', 'startupNotificationEnabled',
        'browserStartupReminders', 'customLeadMinsMap', 'customTeams', 'customSchedules'
      ], processLoadedData);
    } else {
      const result = {};
      const mockTeams = localStorage.getItem('trackedTeams');
      if (mockTeams) result.trackedTeams = JSON.parse(mockTeams);
      const mockLead = localStorage.getItem('reminderLeadTime');
      if (mockLead) result.reminderLeadTime = mockLead;
      const mockReminders = localStorage.getItem('gameReminders');
      if (mockReminders) result.gameReminders = JSON.parse(mockReminders);
      const mockSport = localStorage.getItem('selectedSport');
      if (mockSport) result.selectedSport = mockSport;
      const mockLeague = localStorage.getItem('selectedLeague');
      if (mockLeague) result.selectedLeague = mockLeague;
      const mockStartupNotif = localStorage.getItem('startupNotificationEnabled');
      if (mockStartupNotif) result.startupNotificationEnabled = JSON.parse(mockStartupNotif);
      const mockBrowserStartup = localStorage.getItem('browserStartupReminders');
      if (mockBrowserStartup) result.browserStartupReminders = JSON.parse(mockBrowserStartup);
      const mockCustomLeads = localStorage.getItem('customLeadMinsMap');
      if (mockCustomLeads) result.customLeadMinsMap = JSON.parse(mockCustomLeads);
      const mockCTeams = localStorage.getItem('customTeams');
      if (mockCTeams) result.customTeams = JSON.parse(mockCTeams);
      const mockCScheds = localStorage.getItem('customSchedules');
      if (mockCScheds) result.customSchedules = JSON.parse(mockCScheds);
      
      processLoadedData(result);
    }
  }, []);

  // Fetch League data (teams and scoreboard) whenever the selected league changes
  useEffect(() => {
    refreshData();
    preloadLeagueSchedules(selectedLeague);
  }, [selectedLeague, customTeams]);

  // Fetch full schedules for ALL tracked teams across ALL their respective sports/leagues
  useEffect(() => {
    async function loadTrackedSchedules() {
      if (trackedTeams.length === 0) {
        setTeamSchedules([]);
        return;
      }
      try {
        const schedulePromises = trackedTeams.map(t => {
          const teamWithSlug = ensureTeamSportSlug(t, selectedLeague);
          // If custom team, return games from customSchedules
          if (teamWithSlug.isCustom) {
            return customSchedules.filter(g => g.customTeamId === teamWithSlug.id || g.sportSlug === teamWithSlug.sportSlug);
          }
          return fetchTeamSchedule(teamWithSlug.sportSlug, teamWithSlug.id);
        });

        const results = await Promise.all(schedulePromises);
        const allGames = results.flat();
        
        const gamesMap = new Map();
        allGames.forEach(g => {
          if (g && g.id) gamesMap.set(g.id, g);
        });
        const sorted = Array.from(gamesMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        setTeamSchedules(sorted);
      } catch (err) {
        console.error('Error loading team schedules:', err);
      }
    }
    loadTrackedSchedules();
  }, [trackedTeams, customSchedules]);

  // Save Tracked Teams, Settings & Reminders
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ 
        trackedTeams, 
        reminderLeadTime, 
        gameReminders, 
        selectedSport, 
        selectedLeague,
        startupNotificationEnabled,
        browserStartupReminders,
        customLeadMinsMap,
        customTeams,
        customSchedules
      });
      if (typeof chrome.runtime !== 'undefined' && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'updateAlarms', trackedTeams });
      }
    } else {
      localStorage.setItem('trackedTeams', JSON.stringify(trackedTeams));
      localStorage.setItem('reminderLeadTime', reminderLeadTime);
      localStorage.setItem('gameReminders', JSON.stringify(gameReminders));
      localStorage.setItem('selectedSport', selectedSport);
      localStorage.setItem('selectedLeague', selectedLeague);
      localStorage.setItem('startupNotificationEnabled', JSON.stringify(startupNotificationEnabled));
      localStorage.setItem('browserStartupReminders', JSON.stringify(browserStartupReminders));
      localStorage.setItem('customLeadMinsMap', JSON.stringify(customLeadMinsMap));
      localStorage.setItem('customTeams', JSON.stringify(customTeams));
      localStorage.setItem('customSchedules', JSON.stringify(customSchedules));
    }
  }, [trackedTeams, reminderLeadTime, gameReminders, selectedSport, selectedLeague, startupNotificationEnabled, browserStartupReminders, customLeadMinsMap, customTeams, customSchedules]);

  const refreshData = async () => {
    const leagueData = LEAGUES_FLAT[selectedLeague] || LEAGUES_FLAT.mls;
    if (!leagueData) return;

    try {
      const teams = await loadLeagueTeams(leagueData.sportSlug);
      setAllTeamsList(teams || []);

      if (leagueData.isCustom) {
        setApiData({ events: customSchedules.filter(g => g.sportSlug === leagueData.sportSlug) });
      } else {
        const scoreboard = await fetchLeagueScoreboard(leagueData.sportSlug);
        setApiData(scoreboard);
      }

      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleToggleTracked = (team) => {
    const isTracked = trackedTeams.some(t => 
      String(t.id) === String(team.id) && 
      (t.sportSlug && team.sportSlug ? t.sportSlug === team.sportSlug : true)
    );

    if (isTracked) {
      setTrackedTeams(trackedTeams.filter(t => 
        !(String(t.id) === String(team.id) && (t.sportSlug && team.sportSlug ? t.sportSlug === team.sportSlug : true))
      ));
    } else {
      setTrackedTeams([...trackedTeams, team]);
    }
  };

  const handleSaveCustomTeam = (teamData, formattedGames) => {
    const { customTeams: updatedTeams, customSchedules: updatedSchedules } = addCustomTeamToStore(teamData, formattedGames);
    setCustomTeams(updatedTeams);
    setCustomSchedules(updatedSchedules);

    // Auto track the new custom team
    if (!trackedTeams.some(t => t.id === teamData.id)) {
      setTrackedTeams(prev => [...prev, teamData]);
    }

    // Switch to the newly created custom league and sport
    if (teamData.sportCategory) setSelectedSport(teamData.sportCategory);
    if (teamData.leagueId) setSelectedLeague(teamData.leagueId);
  };

  const handleRemoveTeam = (teamId) => {
    setTrackedTeams(trackedTeams.filter(t => t.id !== teamId));
  };

  const handleClearTrackedTeams = () => {
    setTrackedTeams([]);
  };

  const handleOpenAlarmModal = (game) => {
    setSelectedGameForAlarm(game);
    setActiveModal('game-alarm');
  };

  const handleToggleGameAlarm = (gameId, timeOption) => {
    setGameReminders(prev => {
      const current = prev[gameId] || [];
      const updated = current.includes(timeOption)
        ? current.filter(t => t !== timeOption)
        : [...current, timeOption];
      return { ...prev, [gameId]: updated };
    });
  };

  const handleToggleStartupReminder = (gameId) => {
    setBrowserStartupReminders(prev => ({
      ...prev,
      [gameId]: !prev[gameId]
    }));
  };

  const handleAddCustomLeadMin = (gameId, minVal) => {
    setCustomLeadMinsMap(prev => {
      const current = prev[gameId] || [];
      if (current.includes(minVal)) return prev;
      return { ...prev, [gameId]: [...current, minVal] };
    });
  };

  // Derive games list
  const activeLeagueData = LEAGUES_FLAT[selectedLeague] || LEAGUES_FLAT.mls;
  const currentSportSlug = activeLeagueData ? activeLeagueData.sportSlug : 'soccer/usa.1';

  // Games from current scoreboard / custom schedule
  const scoreboardGames = apiData ? extractGamesForTeams(apiData, trackedTeams, currentSportSlug) : [];
  
  // Custom games matching tracked teams
  const trackedCustomGames = customSchedules.filter(g => 
    trackedTeams.some(tt => String(tt.id) === String(g.customTeamId) || String(tt.id) === String(g.homeTeam.id) || String(tt.id) === String(g.awayTeam.id))
  );

  // Combine scoreboard games + full team schedules + custom games
  const allTrackedGamesMap = new Map();
  [...scoreboardGames, ...teamSchedules, ...trackedCustomGames].forEach(g => {
    if (g && g.id) allTrackedGamesMap.set(g.id, g);
  });

  const allTrackedGames = Array.from(allTrackedGamesMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Upcoming games filter
  const now = new Date();
  const upcomingTrackedGames = allTrackedGames.filter(g => new Date(g.date) >= now);

  const allTeams = allTeamsList.length > 0 ? allTeamsList : [];

  return (
    <div className="app-container">
      <Header 
        onRefresh={refreshData} 
        onSettings={() => setActiveModal('settings')} 
      />
      
      <SportSelector 
        selectedSport={selectedSport} 
        onSelectSport={(sportId) => {
          setSelectedSport(sportId);
          const defaultLeagues = { soccer: 'mls', basketball: 'nba', football: 'nfl', hockey: 'nhl', baseball: 'mlb', racing: 'f1', mma: 'ufc', golf: 'pga' };
          setSelectedLeague(defaultLeagues[sportId] || 'mls');
        }} 
      />
      
      <LeagueSelector 
        selectedSport={selectedSport} 
        selectedLeague={selectedLeague} 
        onSelectLeague={setSelectedLeague} 
      />
      
      <TrackingList 
        trackedTeams={trackedTeams}
        onManage={() => setActiveModal('favorites')}
        onRemoveTeam={handleRemoveTeam}
      />
      
      <NextGames 
        games={upcomingTrackedGames} 
        onViewFullSchedule={() => setActiveModal('full-schedule')}
        reminderLeadTime={reminderLeadTime}
        gameReminders={gameReminders}
        onOpenAlarmModal={handleOpenAlarmModal}
        limit={5}
      />
      
      <QuickActions 
        onCalendar={() => setActiveModal('calendar')}
        onFavorites={() => setActiveModal('favorites')}
        onExportSchedule={() => setActiveModal('export')}
      />
      
      <footer className="footer">
        <div className="sync-status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{lastSyncTime}</span>
        </div>
        <a href="#" className="link-text text-green" onClick={(e) => { e.preventDefault(); setActiveModal('help'); }}>
          Having issues? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </footer>

      {/* Modals */}
      <Modal isOpen={activeModal === 'favorites'} title={`${LEAGUES_FLAT[selectedLeague]?.name || ''} Favorites & Tracking`} onClose={() => setActiveModal(null)}>
        <FavoritesModal 
          allTeams={allTeams} 
          trackedTeams={trackedTeams} 
          onToggleTracked={handleToggleTracked} 
          selectedLeague={selectedLeague}
          selectedSport={selectedSport}
          onSaveCustomTeam={handleSaveCustomTeam}
        />
      </Modal>

      <Modal isOpen={activeModal === 'export'} title="Export Schedule (.ics)" onClose={() => setActiveModal(null)}>
        <ExportModal allTeams={allTeams} trackedTeams={trackedTeams} apiData={apiData} selectedSport={selectedSport} selectedLeague={selectedLeague} />
      </Modal>

      <Modal isOpen={activeModal === 'settings'} title="Settings" onClose={() => setActiveModal(null)}>
        <SettingsModal 
          reminderLeadTime={reminderLeadTime} 
          onLeadTimeChange={setReminderLeadTime} 
          startupNotificationEnabled={startupNotificationEnabled}
          onStartupNotificationChange={setStartupNotificationEnabled}
          onClearTrackedTeams={handleClearTrackedTeams}
        />
      </Modal>

      <Modal isOpen={activeModal === 'help'} title="Having Issues?" onClose={() => setActiveModal(null)}>
        <HelpModal />
      </Modal>

      <Modal isOpen={activeModal === 'full-schedule'} title="Tracked Teams Schedule & Results" onClose={() => setActiveModal(null)}>
        <FullScheduleModal 
          allTrackedGames={allTrackedGames} 
          reminderLeadTime={reminderLeadTime} 
          gameReminders={gameReminders}
          onOpenAlarmModal={handleOpenAlarmModal}
        />
      </Modal>

      <Modal isOpen={activeModal === 'calendar'} title="Match Calendar" isWide={true} onClose={() => setActiveModal(null)}>
        <CalendarModal 
          allTrackedGames={allTrackedGames}
          trackedTeams={trackedTeams}
          selectedSport={selectedSport}
          selectedLeague={selectedLeague}
          gameReminders={gameReminders}
          onOpenAlarmModal={handleOpenAlarmModal}
        />
      </Modal>

      <Modal isOpen={activeModal === 'game-alarm'} title="Set Match Reminders" onClose={() => setActiveModal(null)}>
        <GameAlarmModal 
          game={selectedGameForAlarm} 
          activeAlarms={selectedGameForAlarm ? gameReminders[selectedGameForAlarm.id] : []} 
          onToggleAlarm={handleToggleGameAlarm} 
          isStartupReminderEnabled={selectedGameForAlarm ? !!browserStartupReminders[selectedGameForAlarm.id] : false}
          onToggleStartupReminder={handleToggleStartupReminder}
          customLeadMins={selectedGameForAlarm ? (customLeadMinsMap[selectedGameForAlarm.id] || []) : []}
          onAddCustomLeadMin={handleAddCustomLeadMin}
        />
      </Modal>
    </div>
  );
}
