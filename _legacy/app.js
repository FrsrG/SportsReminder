import { fetchMLSSchedule, extractTeams, extractGamesForTeams } from './espnApi.js';
import { generateICS, downloadICSFile } from './icsGenerator.js';

// DOM Elements
const trackedListEl = document.getElementById('tracked-list');
const gamesListEl = document.getElementById('games-list');
const trackedCountEl = document.getElementById('tracked-count');
const lastSyncEl = document.getElementById('last-sync');
const refreshBtn = document.getElementById('refresh-btn');

const addTeamBtn = document.getElementById('add-team-btn');
const dropdownContainer = document.getElementById('team-dropdown-container');
const teamSelect = document.getElementById('team-select');
const confirmAddTeamBtn = document.getElementById('confirm-add-team-btn');
const cancelAddTeamBtn = document.getElementById('cancel-add-team-btn');

// Header & Navigation Action Elements
const btnSettings = document.getElementById('btn-settings');
const linkManage = document.getElementById('link-manage');
const linkViewFullSchedule = document.getElementById('link-view-full-schedule');
const linkHavingIssues = document.getElementById('link-having-issues');

// Quick Action Buttons
const btnTodaysGames = document.getElementById('btn-todays-games');
const btnFavorites = document.getElementById('btn-favorites');
const btnExportSchedule = document.getElementById('btn-export-schedule');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

// State
let trackedTeams = []; // Array of team objects
let apiData = null;
let reminderLeadTime = '1h'; // Default reminder lead time

// Initialize app
async function init() {
  await loadTrackedTeams();
  await refreshData();
  setupEventListeners();
}

async function loadTrackedTeams() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['trackedTeams', 'reminderLeadTime'], (result) => {
        if (result.trackedTeams) {
          trackedTeams = result.trackedTeams;
        }
        if (result.reminderLeadTime) {
          reminderLeadTime = result.reminderLeadTime;
        }
        resolve();
      });
    } else {
      const mockTeams = localStorage.getItem('trackedTeams');
      if (mockTeams) {
        trackedTeams = JSON.parse(mockTeams);
      }
      resolve();
    }
  });
}

function saveTrackedTeams() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ trackedTeams, reminderLeadTime });
    if (typeof chrome.runtime !== 'undefined' && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'updateAlarms', trackedTeams });
    }
  } else {
    localStorage.setItem('trackedTeams', JSON.stringify(trackedTeams));
  }
  renderTrackedTeams();
  renderGames();
}

async function refreshData() {
  lastSyncEl.textContent = 'Syncing...';
  apiData = await fetchMLSSchedule();
  if (apiData) {
    const now = new Date();
    lastSyncEl.textContent = `Schedule synced ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    populateTeamDropdown();
    renderTrackedTeams();
    renderGames();
  } else {
    lastSyncEl.textContent = 'Failed to sync schedule';
  }
}

function populateTeamDropdown() {
  if (!apiData) return;
  const allTeams = extractTeams(apiData);
  
  while (teamSelect.options.length > 1) {
    teamSelect.remove(1);
  }
  
  allTeams.forEach(team => {
    if (!trackedTeams.some(t => t.id === team.id)) {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      option.dataset.team = JSON.stringify(team);
      teamSelect.appendChild(option);
    }
  });
}

function renderTrackedTeams() {
  trackedCountEl.textContent = trackedTeams.length;
  trackedListEl.innerHTML = '';
  
  if (trackedTeams.length === 0) {
    trackedListEl.innerHTML = '<div class="empty-state">No teams tracked. Click Favorites or Add Team below!</div>';
    return;
  }
  
  trackedTeams.forEach((team) => {
    const row = document.createElement('div');
    row.className = 'team-row';
    
    const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
    
    row.innerHTML = `
      <div class="team-info">
        <img src="${logoUrl}" alt="${team.abbreviation}" class="team-logo" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' fill=\\'%2394a3b8\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\'/></svg>'">
        <span class="team-name">${team.name}</span>
      </div>
      <div class="team-actions">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="text-green" style="cursor:pointer;" title="Notifications Active"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="remove-team-btn" data-id="${team.id}" style="cursor:pointer; color: var(--text-secondary)" title="Remove Team"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </div>
    `;
    trackedListEl.appendChild(row);
  });
  
  document.querySelectorAll('.remove-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idToRemove = e.currentTarget.dataset.id;
      trackedTeams = trackedTeams.filter(t => t.id !== idToRemove);
      saveTrackedTeams();
      populateTeamDropdown();
    });
  });
}

function renderGames() {
  gamesListEl.innerHTML = '';
  
  if (!apiData) {
    gamesListEl.innerHTML = '<div class="empty-state">Loading schedule...</div>';
    return;
  }
  
  const teamIds = trackedTeams.map(t => t.id);
  const games = extractGamesForTeams(apiData, teamIds);
  
  if (games.length === 0) {
    gamesListEl.innerHTML = '<div class="empty-state">No upcoming games for tracked teams.</div>';
    return;
  }
  
  games.slice(0, 3).forEach((game, index) => {
    const card = createGameCard(game, index === 0);
    gamesListEl.appendChild(card);
  });
}

function createGameCard(game, isNext = false) {
  const card = document.createElement('div');
  card.className = `game-card ${isNext ? 'next-game' : ''}`;
  
  const gameDate = new Date(game.date);
  let dayStr = '';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (gameDate.toDateString() === today.toDateString()) {
    dayStr = 'Today';
  } else if (gameDate.toDateString() === tomorrow.toDateString()) {
    dayStr = 'Tomorrow';
  } else {
    dayStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  card.innerHTML = `
    <div class="game-teams">
      <div class="team-col">
        <img src="${game.awayTeam.logo}" alt="${game.awayTeam.abbreviation}" class="team-logo">
        <span class="team-abbr">${game.awayTeam.abbreviation}</span>
      </div>
      <span class="vs-text">@</span>
      <div class="team-col">
        <img src="${game.homeTeam.logo}" alt="${game.homeTeam.abbreviation}" class="team-logo">
        <span class="team-abbr">${game.homeTeam.abbreviation}</span>
      </div>
    </div>
    
    <div class="game-divider"></div>
    
    <div class="game-info">
      <span class="game-day">${dayStr}</span>
      <span class="game-time">${timeStr}</span>
      <span class="game-arena">${game.venue}</span>
    </div>
    
    <div class="game-action">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      <span>${reminderLeadTime}</span>
    </div>
  `;
  return card;
}

// Modal Helpers
function openModal(title, contentHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = contentHTML;
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalBody.innerHTML = '';
}

// Modal View Handlers
function openFavoritesModal() {
  if (!apiData) {
    openModal('Favorites', '<div class="empty-state">Schedule data loading...</div>');
    return;
  }
  
  const allTeams = extractTeams(apiData);
  
  let html = `
    <input type="text" id="fav-search" class="search-input" placeholder="Search MLS teams...">
    <div class="modal-team-list" id="fav-team-list">
      ${renderFavoritesTeamItems(allTeams, '')}
    </div>
  `;
  
  openModal('MLS Favorites & Tracking', html);
  
  const searchInput = document.getElementById('fav-search');
  const teamListContainer = document.getElementById('fav-team-list');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    teamListContainer.innerHTML = renderFavoritesTeamItems(allTeams, query);
    attachFavoritesToggleListeners(allTeams);
  });
  
  attachFavoritesToggleListeners(allTeams);
}

function renderFavoritesTeamItems(allTeams, query) {
  const filtered = allTeams.filter(t => t.name.toLowerCase().includes(query) || t.abbreviation.toLowerCase().includes(query));
  
  if (filtered.length === 0) {
    return '<div class="empty-state">No matching teams found.</div>';
  }
  
  return filtered.map(team => {
    const isTracked = trackedTeams.some(t => t.id === team.id);
    const starFill = isTracked ? 'currentColor' : 'none';
    const starClass = isTracked ? 'star-btn starred' : 'star-btn';
    const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
    
    return `
      <div class="modal-team-item">
        <div class="team-info">
          <img src="${logoUrl}" alt="${team.abbreviation}" class="team-logo">
          <span class="team-name">${team.name}</span>
        </div>
        <button class="${starClass}" data-id="${team.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${starFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      </div>
    `;
  }).join('');
}

function attachFavoritesToggleListeners(allTeams) {
  document.querySelectorAll('.modal-team-item .star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.dataset.id;
      const isTracked = trackedTeams.some(t => t.id === teamId);
      
      if (isTracked) {
        trackedTeams = trackedTeams.filter(t => t.id !== teamId);
      } else {
        const teamObj = allTeams.find(t => t.id === teamId);
        if (teamObj) trackedTeams.push(teamObj);
      }
      
      saveTrackedTeams();
      populateTeamDropdown();
      
      // Update star button UI dynamically
      const starSvg = e.currentTarget.querySelector('svg');
      if (isTracked) {
        e.currentTarget.classList.remove('starred');
        starSvg.setAttribute('fill', 'none');
      } else {
        e.currentTarget.classList.add('starred');
        starSvg.setAttribute('fill', 'currentColor');
      }
    });
  });
}

function openExportScheduleModal() {
  if (!apiData) {
    openModal('Export Schedule', '<div class="empty-state">Schedule data loading...</div>');
    return;
  }
  
  const allTeams = extractTeams(apiData);
  
  let html = `
    <div class="modal-tabs">
      <button class="tab-btn active" id="tab-tracked">Tracked Teams (${trackedTeams.length})</button>
      <button class="tab-btn" id="tab-all">All MLS Teams (${allTeams.length})</button>
    </div>
    <div class="modal-team-list" id="export-team-list">
      ${renderExportTeamList(trackedTeams.length > 0 ? trackedTeams : allTeams)}
    </div>
  `;
  
  openModal('Export Schedule (.ics)', html);
  
  const tabTracked = document.getElementById('tab-tracked');
  const tabAll = document.getElementById('tab-all');
  const exportListContainer = document.getElementById('export-team-list');
  
  tabTracked.addEventListener('click', () => {
    tabTracked.classList.add('active');
    tabAll.classList.remove('active');
    exportListContainer.innerHTML = renderExportTeamList(trackedTeams);
    attachExportListeners();
  });
  
  tabAll.addEventListener('click', () => {
    tabAll.classList.add('active');
    tabTracked.classList.remove('active');
    exportListContainer.innerHTML = renderExportTeamList(allTeams);
    attachExportListeners();
  });
  
  attachExportListeners();
}

function renderExportTeamList(teams) {
  if (teams.length === 0) {
    return '<div class="empty-state">No tracked teams to export. Switch to All Teams tab!</div>';
  }
  
  return teams.map(team => {
    const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
    return `
      <div class="modal-team-item">
        <div class="team-info">
          <img src="${logoUrl}" alt="${team.abbreviation}" class="team-logo">
          <span class="team-name">${team.name}</span>
        </div>
        <button class="export-btn" data-id="${team.id}" data-name="${team.name}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export .ics
        </button>
      </div>
    `;
  }).join('');
}

function attachExportListeners() {
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.dataset.id;
      const teamName = e.currentTarget.dataset.name;
      const teamGames = extractGamesForTeams(apiData, [teamId]);
      
      if (teamGames.length === 0) {
        alert(`No scheduled games found for ${teamName}.`);
        return;
      }
      
      const icsString = generateICS(teamName, teamGames);
      const filename = `${teamName.replace(/\s+/g, '_')}_Schedule.ics`;
      downloadICSFile(filename, icsString);
    });
  });
}

function openTodaysGamesModal() {
  if (!apiData) {
    openModal("Today's Games", '<div class="empty-state">Schedule data loading...</div>');
    return;
  }
  
  const allTeams = extractTeams(apiData);
  const allTeamIds = allTeams.map(t => t.id);
  const allGames = extractGamesForTeams(apiData, allTeamIds);
  
  const today = new Date().toDateString();
  const todaysGames = allGames.filter(g => new Date(g.date).toDateString() === today);
  
  if (todaysGames.length === 0) {
    openModal("Today's MLS Games", '<div class="empty-state">No MLS games scheduled for today.</div>');
    return;
  }
  
  let html = '<div class="games-list">';
  todaysGames.forEach(game => {
    const gameCard = createGameCard(game);
    html += gameCard.outerHTML;
  });
  html += '</div>';
  
  openModal("Today's MLS Games", html);
}

function openFullScheduleModal() {
  if (!apiData) {
    openModal("Full MLS Schedule", '<div class="empty-state">Schedule data loading...</div>');
    return;
  }
  
  const allTeams = extractTeams(apiData);
  const allTeamIds = allTeams.map(t => t.id);
  const allGames = extractGamesForTeams(apiData, allTeamIds);
  
  let html = '<div class="games-list">';
  allGames.forEach(game => {
    const gameCard = createGameCard(game);
    html += gameCard.outerHTML;
  });
  html += '</div>';
  
  openModal("Full MLS Schedule", html);
}

function openSettingsModal() {
  let html = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div>
        <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px;">Game Reminder Timing</label>
        <select id="settings-lead-time" class="team-select" style="width:100%;">
          <option value="15m" ${reminderLeadTime === '15m' ? 'selected' : ''}>15 minutes before match</option>
          <option value="30m" ${reminderLeadTime === '30m' ? 'selected' : ''}>30 minutes before match</option>
          <option value="1h" ${reminderLeadTime === '1h' ? 'selected' : ''}>1 hour before match</option>
          <option value="2h" ${reminderLeadTime === '2h' ? 'selected' : ''}>2 hours before match</option>
        </select>
      </div>
      <div>
        <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px;">Data & Cache</label>
        <button id="btn-clear-tracked" class="cancel-team-btn" style="width:100%; color:#ef4444; border-color:#ef4444;">Clear Tracked Teams</button>
      </div>
    </div>
  `;
  
  openModal('Settings', html);
  
  const leadSelect = document.getElementById('settings-lead-time');
  const clearBtn = document.getElementById('btn-clear-tracked');
  
  leadSelect.addEventListener('change', (e) => {
    reminderLeadTime = e.target.value;
    saveTrackedTeams();
  });
  
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all tracked teams?')) {
      trackedTeams = [];
      saveTrackedTeams();
      closeModal();
    }
  });
}

function openHelpModal() {
  let html = `
    <div style="font-size:13px; color:var(--text-secondary); display:flex; flex-direction:column; gap:12px; line-height:1.5;">
      <p><strong style="color:var(--text-primary);">Extension Troubleshooting:</strong></p>
      <ul style="padding-left:18px;">
        <li>Ensure Google Chrome Notifications are enabled in your System Preferences.</li>
        <li>Make sure the extension has background permission enabled in chrome://extensions.</li>
        <li>Click Refresh in the top right header to manually pull the latest game schedules.</li>
      </ul>
      <button id="btn-test-notification" class="add-team-btn" style="margin-top:8px;">Test Notification</button>
    </div>
  `;
  
  openModal('Having Issues?', html);
  
  document.getElementById('btn-test-notification').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create('test-notif', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Remind Sports Test',
        message: 'Notifications are working perfectly!',
        priority: 2
      });
    } else {
      alert('Test Notification: Notifications are working in browser simulation!');
    }
  });
}

function setupEventListeners() {
  refreshBtn.addEventListener('click', refreshData);
  
  btnFavorites.addEventListener('click', openFavoritesModal);
  btnExportSchedule.addEventListener('click', openExportScheduleModal);
  btnTodaysGames.addEventListener('click', openTodaysGamesModal);
  
  btnSettings.addEventListener('click', openSettingsModal);
  linkManage.addEventListener('click', (e) => {
    e.preventDefault();
    openFavoritesModal();
  });
  linkViewFullSchedule.addEventListener('click', (e) => {
    e.preventDefault();
    openFullScheduleModal();
  });
  linkHavingIssues.addEventListener('click', (e) => {
    e.preventDefault();
    openHelpModal();
  });
  
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  addTeamBtn.addEventListener('click', () => {
    addTeamBtn.classList.add('hidden');
    dropdownContainer.classList.remove('hidden');
  });
  
  cancelAddTeamBtn.addEventListener('click', () => {
    dropdownContainer.classList.add('hidden');
    addTeamBtn.classList.remove('hidden');
    teamSelect.value = '';
    confirmAddTeamBtn.disabled = true;
  });
  
  teamSelect.addEventListener('change', () => {
    confirmAddTeamBtn.disabled = !teamSelect.value;
  });
  
  confirmAddTeamBtn.addEventListener('click', () => {
    const selectedOption = teamSelect.options[teamSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.team) {
      const teamData = JSON.parse(selectedOption.dataset.team);
      trackedTeams.push(teamData);
      saveTrackedTeams();
      
      populateTeamDropdown();
      dropdownContainer.classList.add('hidden');
      addTeamBtn.classList.remove('hidden');
      teamSelect.value = '';
      confirmAddTeamBtn.disabled = true;
    }
  });
}

// Start
init();
