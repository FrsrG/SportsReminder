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

import { fetchLeagueScoreboard, extractGamesForTeams, fetchTeamSchedule } from './espnApi.js';
import { loadLeagueTeams, preloadLeagueSchedules, LEAGUES_FLAT } from './leagueManager.js';

export default function App() {
  const [selectedSport, setSelectedSport] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState('mls');
  const [trackedTeams, setTrackedTeams] = useState([]);
  const [reminderLeadTime, setReminderLeadTime] = useState('1h');
  const [gameReminders, setGameReminders] = useState({});
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
      const activeLeagueData = LEAGUES_FLAT[result.selectedLeague || selectedLeague] || LEAGUES_FLAT.mls;
      const defaultSlug = activeLeagueData.sportSlug || 'soccer/usa.1';

      if (result.trackedTeams) {
        // Data Migration for legacy MLS teams or missing sportSlugs
        const migratedTeams = result.trackedTeams.map(t => {
          if (!t.sportSlug) {
            return { ...t, sportSlug: defaultSlug };
          }
          return t;
        });
        setTrackedTeams(migratedTeams);
      }
      if (result.reminderLeadTime) setReminderLeadTime(result.reminderLeadTime);
      if (result.gameReminders) setGameReminders(result.gameReminders);
      if (result.selectedSport) setSelectedSport(result.selectedSport);
      if (result.selectedLeague) setSelectedLeague(result.selectedLeague);
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['trackedTeams', 'reminderLeadTime', 'gameReminders', 'selectedSport', 'selectedLeague'], processLoadedData);
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
      
      processLoadedData(result);
    }
  }, []);

  // Fetch League data (teams and scoreboard) whenever the selected league changes
  useEffect(() => {
    refreshData();
    preloadLeagueSchedules(selectedLeague);
  }, [selectedLeague]);

  // Fetch full schedules for tracked teams whenever trackedTeams or selectedLeague changes
  useEffect(() => {
    async function loadTrackedSchedules() {
      if (trackedTeams.length === 0) {
        setTeamSchedules([]);
        return;
      }
      try {
        const activeLeagueData = LEAGUES_FLAT[selectedLeague] || LEAGUES_FLAT.mls;
        const defaultSlug = activeLeagueData ? activeLeagueData.sportSlug : 'soccer/usa.1';

        const schedulePromises = trackedTeams.map(t => {
          const slug = t.sportSlug || defaultSlug;
          return fetchTeamSchedule(slug, t.id);
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
  }, [trackedTeams, selectedLeague]);

  // Save Tracked Teams, Sport & League selection
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ trackedTeams, reminderLeadTime, gameReminders, selectedSport, selectedLeague });
      if (typeof chrome.runtime !== 'undefined' && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'updateAlarms', trackedTeams });
      }
    } else {
      localStorage.setItem('trackedTeams', JSON.stringify(trackedTeams));
      localStorage.setItem('reminderLeadTime', reminderLeadTime);
      localStorage.setItem('gameReminders', JSON.stringify(gameReminders));
      localStorage.setItem('selectedSport', selectedSport);
      localStorage.setItem('selectedLeague', selectedLeague);
    }
  }, [trackedTeams, reminderLeadTime, gameReminders, selectedSport, selectedLeague]);

  const refreshData = async () => {
    const leagueData = LEAGUES_FLAT[selectedLeague] || LEAGUES_FLAT.mls;
    if (!leagueData) return;
    
    setLastSyncTime('Syncing...');
    
    const [teams, scoreboardData] = await Promise.all([
      loadLeagueTeams(leagueData.sportSlug),
      fetchLeagueScoreboard(leagueData.sportSlug)
    ]);
    
    if (teams) {
      setAllTeamsList(teams);
    }
    
    if (scoreboardData) {
      setApiData(scoreboardData);
    } else {
      setApiData(null);
    }
    
    setLastSyncTime(`Schedule synced ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
  };

  const handleToggleTracked = (team) => {
    const activeLeagueData = LEAGUES_FLAT[selectedLeague] || LEAGUES_FLAT.mls;
    const defaultSlug = activeLeagueData.sportSlug || 'soccer/usa.1';
    
    const teamWithSlug = {
      ...team,
      sportSlug: team.sportSlug || defaultSlug
    };

    setTrackedTeams(prev => {
      if (prev.some(t => t.id === team.id)) {
        return prev.filter(t => t.id !== team.id);
      }
      return [...prev, teamWithSlug];
    });
  };

  const handleRemoveTeam = (teamId) => {
    setTrackedTeams(prev => prev.filter(t => t.id !== teamId));
  };
  
  const handleClearTrackedTeams = () => {
    if (confirm('Clear all tracked teams?')) {
      setTrackedTeams([]);
      setActiveModal(null);
    }
  };

  const handleOpenAlarmModal = (game) => {
    setSelectedGameForAlarm(game);
    setActiveModal('game-alarm');
  };

  const handleToggleGameAlarm = (gameId, slotIsoKey) => {
    setGameReminders(prev => {
      const currentList = Array.isArray(prev[gameId]) 
        ? prev[gameId] 
        : (prev[gameId] && prev[gameId] !== 'off' ? [prev[gameId]] : []);
      
      let updatedList;
      
      const exists = currentList.some(a => {
        if (a === slotIsoKey) return true;
        const aMs = new Date(a).getTime();
        const sMs = new Date(slotIsoKey).getTime();
        return Math.abs(aMs - sMs) < 2000;
      });

      if (exists) {
        updatedList = currentList.filter(a => {
          if (a === slotIsoKey) return false;
          const aMs = new Date(a).getTime();
          const sMs = new Date(slotIsoKey).getTime();
          return Math.abs(aMs - sMs) >= 2000;
        });
      } else {
        updatedList = [...currentList, slotIsoKey];
      }

      return {
        ...prev,
        [gameId]: updatedList
      };
    });
  };

  const allTeams = allTeamsList;
  
  // Combine scoreboard games + team schedules for tracked teams
  const scoreboardTrackedGames = extractGamesForTeams(apiData, trackedTeams);
  const combinedGamesMap = new Map();
  scoreboardTrackedGames.forEach(g => { if (g && g.id) combinedGamesMap.set(g.id, g); });
  teamSchedules.forEach(g => { if (g && g.id) combinedGamesMap.set(g.id, g); });
  
  const allTrackedGames = Array.from(combinedGamesMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const now = new Date();
  
  // Strict filter for upcoming/future games (excludes completed matches)
  const upcomingTrackedGames = allTrackedGames.filter(g => {
    const isCompleted = g.completed || g.status === 'STATUS_FULL_TIME' || g.status === 'STATUS_FINAL';
    const matchEndTimeMs = new Date(g.date).getTime() + (2.5 * 60 * 60 * 1000);
    return !isCompleted && matchEndTimeMs >= now.getTime();
  });

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
          // Default league for selected sport
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
        onTodaysGames={() => setActiveModal('todays-games')}
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
        <FavoritesModal allTeams={allTeams} trackedTeams={trackedTeams} onToggleTracked={handleToggleTracked} selectedLeague={selectedLeague} />
      </Modal>

      <Modal isOpen={activeModal === 'export'} title="Export Schedule (.ics)" onClose={() => setActiveModal(null)}>
        <ExportModal allTeams={allTeams} trackedTeams={trackedTeams} apiData={apiData} selectedSport={selectedSport} selectedLeague={selectedLeague} />
      </Modal>

      <Modal isOpen={activeModal === 'settings'} title="Settings" onClose={() => setActiveModal(null)}>
        <SettingsModal 
          reminderLeadTime={reminderLeadTime} 
          onLeadTimeChange={setReminderLeadTime} 
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

      <Modal isOpen={activeModal === 'todays-games'} title="Today's Games" onClose={() => setActiveModal(null)}>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <NextGames 
            games={upcomingTrackedGames.filter(g => new Date(g.date).toDateString() === new Date().toDateString())} 
            reminderLeadTime={reminderLeadTime} 
            gameReminders={gameReminders}
            onOpenAlarmModal={handleOpenAlarmModal}
            limit={null}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'game-alarm'} title="Set Match Reminders" onClose={() => setActiveModal(null)}>
        <GameAlarmModal 
          game={selectedGameForAlarm} 
          activeAlarms={selectedGameForAlarm ? gameReminders[selectedGameForAlarm.id] : []} 
          onToggleAlarm={handleToggleGameAlarm} 
        />
      </Modal>
    </div>
  );
}
