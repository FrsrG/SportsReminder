import React from 'react';

/**
 * High-tech Octagon Vector Badge component for UFC Event Cards.
 * Features metallic carbon fiber texture, gold/crimson combat accent stripes,
 * and dynamic event codes (e.g. 330, 331, FN, DWCS, MEX).
 */
const UFC_EVENT_THEMES = {
  PPV: { bgGrad: ['#7f1d1d', '#450a0a'], accent: '#eab308', text: '#ffffff', subText: '#fef08a', label: 'PPV' },
  FIGHT_NIGHT: { bgGrad: ['#18181b', '#09090b'], accent: '#ef4444', text: '#ffffff', subText: '#fca5a5', label: 'FIGHT NIGHT' },
  NOCHE: { bgGrad: ['#064e3b', '#022c22'], accent: '#eab308', text: '#ffffff', subText: '#86efac', label: 'NOCHE' },
  DWCS: { bgGrad: ['#0f172a', '#020617'], accent: '#06b6d4', text: '#ffffff', subText: '#67e8f9', label: 'CONTEST' },
  DEFAULT: { bgGrad: ['#27272a', '#18181b'], accent: '#d97706', text: '#ffffff', subText: '#fde047', label: 'UFC' }
};

export function parseUFCBadgeInfo(eventName = '') {
  const name = eventName.trim();
  
  if (name.includes('Contender Series') || name.includes('DWCS')) {
    return { code: 'DWCS', ...UFC_EVENT_THEMES.DWCS };
  }
  if (name.toLowerCase().includes('noche')) {
    return { code: 'NOCHE', ...UFC_EVENT_THEMES.NOCHE };
  }
  
  // Check for UFC PPV numbers (e.g. UFC 330, UFC 331)
  const ppvMatch = name.match(/UFC\s*(\d{3})/i);
  if (ppvMatch) {
    return { code: `UFC ${ppvMatch[1]}`, ...UFC_EVENT_THEMES.PPV };
  }

  if (name.toLowerCase().includes('fight night')) {
    return { code: 'UFC', ...UFC_EVENT_THEMES.FIGHT_NIGHT };
  }

  return { code: 'UFC', ...UFC_EVENT_THEMES.DEFAULT };
}

export default function UFCNameplate({ eventName = '' }) {
  const info = parseUFCBadgeInfo(eventName);

  return (
    <div 
      className="ufc-nameplate-badge" 
      style={{
        position: 'relative',
        width: '64px',
        height: '48px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${info.bgGrad[0]} 0%, ${info.bgGrad[1]} 100%)`,
        border: `1px solid ${info.accent}66`,
        boxShadow: `0 2px 10px ${info.accent}33`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {/* Background Octagon Mesh & Carbon Texture SVG */}
      <svg 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25, pointerEvents: 'none' }}
        viewBox="0 0 100 80"
        preserveAspectRatio="none"
      >
        <pattern id="ufc-mesh" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 4 0 L 8 4 L 4 8 L 0 4 Z" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        </pattern>
        <rect width="100" height="80" fill="url(#ufc-mesh)" />
        <path d="M -10 0 L 35 80 L 55 80 L 10 0 Z" fill={info.accent} />
        <path d="M 25 0 L 85 80 L 100 80 L 40 0 Z" fill="#ffffff" opacity="0.3" />
      </svg>

      {/* Top Gold/Red Accent Line */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: info.accent
        }}
      />

      {/* Event Code Label */}
      <span 
        style={{
          fontSize: info.code.length > 5 ? '13px' : '16px',
          fontWeight: 900,
          letterSpacing: '0.5px',
          color: info.text,
          lineHeight: 1,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontStyle: 'italic',
          zIndex: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap'
        }}
      >
        {info.code}
      </span>

      {/* UFC Sub-Badge Label */}
      <span 
        style={{
          fontSize: '7.5px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: info.subText,
          textTransform: 'uppercase',
          marginTop: '3px',
          zIndex: 1,
          opacity: 0.95
        }}
      >
        {info.label}
      </span>
    </div>
  );
}
