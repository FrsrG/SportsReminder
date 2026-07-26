import React from 'react';

export default function HelpModal() {
  const handleTestNotification = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'triggerDesktopNotification',
        title: '⚽ Remind Sports Desktop Alert',
        message: 'Inter Miami CF @ CF Montréal starts in 15 minutes at Stade Saputo!'
      });
    } else if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('⚽ Remind Sports Desktop Alert', {
            body: 'Inter Miami CF @ CF Montréal starts in 15 minutes at Stade Saputo!',
            icon: 'icon.png'
          });
        } else {
          alert('Notification permission was denied in browser settings.');
        }
      });
    } else {
      alert('Desktop notifications are supported inside Google Chrome.');
    }
  };

  return (
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: '1.5' }}>
      <p><strong style={{ color: 'var(--text-primary)' }}>Desktop Notifications Setup:</strong></p>
      <ul style={{ paddingLeft: '18px' }}>
        <li>Ensure Windows / Chrome notifications are enabled in your System Preferences.</li>
        <li>Make sure the extension has background permission enabled in <code>chrome://extensions</code>.</li>
        <li>Click the button below to test a live Windows desktop notification banner!</li>
      </ul>
      <button className="add-team-btn" style={{ marginTop: '8px' }} onClick={handleTestNotification}>
        🔔 Send Test Desktop Notification
      </button>
    </div>
  );
}
