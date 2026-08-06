import React from 'react';

export default function TrackingList({ trackedTeams, onManage, onAddTeam, onRemoveTeam }) {
  const handleAddClick = onAddTeam || onManage;

  return (
    <section className="section">
      <div className="section-header">
        <h2>TRACKING (<span>{trackedTeams.length}</span> TEAMS)</h2>
      </div>
      
      <div className="tracked-list">
        {trackedTeams.length === 0 ? (
          <div className="empty-state">No teams tracked. Click "Add Team" to add!</div>
        ) : (
          trackedTeams.map(team => {
            const logoUrl = team.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8"><circle cx="12" cy="12" r="12"/></svg>';
            return (
              <div key={`${team.sportSlug || 'team'}-${team.id}`} className="team-row">
                <div className="team-info">
                  <img src={logoUrl} alt={team.abbreviation || team.name} className="team-logo" />
                  <span className="team-name">{team.name}</span>
                </div>
                <div className="team-actions">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-green" style={{ cursor: 'pointer' }} title="Notifications Active"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <button 
                    className="star-btn starred" 
                    onClick={() => onRemoveTeam(team.id, team.sportSlug)} 
                    title="Remove Team from Tracking"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="add-team-btn" onClick={handleAddClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        Add Team
      </button>
    </section>
  );
}
