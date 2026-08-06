import React from 'react';

const COUNTRY_THEMES = {
  NED: { bgGrad: ['#1e293b', '#0f172a'], accent: '#f97316', text: '#ffffff', subText: '#fdba74' }, // Dutch Orange
  ITA: { bgGrad: ['#064e3b', '#022c22'], accent: '#ef4444', text: '#ffffff', subText: '#86efac' }, // Italian Tricolore
  ESP: { bgGrad: ['#7c2d12', '#451a03'], accent: '#eab308', text: '#ffffff', subText: '#fde047' }, // Spanish Gold/Red
  GBR: { bgGrad: ['#1e1b4b', '#0f172a'], accent: '#ef4444', text: '#ffffff', subText: '#93c5fd' }, // British Racing Blue/Red
  MON: { bgGrad: ['#7f1d1d', '#450a0a'], accent: '#ffffff', text: '#ffffff', subText: '#fca5a5' }, // Monaco Red/White
  BHR: { bgGrad: ['#881337', '#4c0519'], accent: '#fbbf24', text: '#ffffff', subText: '#fde68a' }, // Bahrain Red/Gold
  MIA: { bgGrad: ['#831843', '#500724'], accent: '#06b6d4', text: '#ffffff', subText: '#f472b6' }, // Vice Pink/Cyan
  LVG: { bgGrad: ['#581c87', '#3b0764'], accent: '#f59e0b', text: '#ffffff', subText: '#ddd6fe' }, // Vegas Neon Gold/Purple
  JPN: { bgGrad: ['#7f1d1d', '#450a0a'], accent: '#ffffff', text: '#ffffff', subText: '#fecaca' }, // Japan Red/White
  AUS: { bgGrad: ['#064e3b', '#022c22'], accent: '#eab308', text: '#ffffff', subText: '#fef08a' }, // Aussie Green/Gold
  CAN: { bgGrad: ['#991b1b', '#450a0a'], accent: '#ffffff', text: '#ffffff', subText: '#fca5a5' }, // Canada Red/White
  AUT: { bgGrad: ['#991b1b', '#7f1d1d'], accent: '#ffffff', text: '#ffffff', subText: '#fecaca' }, // Austria Red
  BEL: { bgGrad: ['#451a03', '#1c1917'], accent: '#eab308', text: '#ffffff', subText: '#fde047' }, // Belgium Black/Gold
  SGP: { bgGrad: ['#0f172a', '#020617'], accent: '#ef4444', text: '#ffffff', subText: '#f87171' }, // Singapore Night Race
  BRA: { bgGrad: ['#14532d', '#052e16'], accent: '#eab308', text: '#ffffff', subText: '#4ade80' }, // Brazil Green/Yellow
  MEX: { bgGrad: ['#064e3b', '#14532d'], accent: '#ef4444', text: '#ffffff', subText: '#86efac' }, // Mexico Green/Red
  UAE: { bgGrad: ['#1c1917', '#09090b'], accent: '#d97706', text: '#ffffff', subText: '#fef08a' }, // Abu Dhabi Gold/Black
  AZE: { bgGrad: ['#1e1b4b', '#0f172a'], accent: '#06b6d4', text: '#ffffff', subText: '#67e8f9' }, // Baku Flame Cyan
  DEFAULT: { bgGrad: ['#1f1f27', '#111116'], accent: '#e10600', text: '#ffffff', subText: '#ff6b6b' } // F1 Red Carbon
};

export default function F1Nameplate({ eventName = '', countryCode = 'F1' }) {
  const code = (countryCode || 'F1').toUpperCase();
  const theme = COUNTRY_THEMES[code] || COUNTRY_THEMES.DEFAULT;

  return (
    <div 
      className="f1-nameplate-badge" 
      style={{
        position: 'relative',
        width: '62px',
        height: '48px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.bgGrad[0]} 0%, ${theme.bgGrad[1]} 100%)`,
        border: `1px solid ${theme.accent}66`,
        boxShadow: `0 2px 10px ${theme.accent}33`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {/* Background Racing Stripes & Carbon Texture SVG */}
      <svg 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25, pointerEvents: 'none' }}
        viewBox="0 0 100 80"
        preserveAspectRatio="none"
      >
        <pattern id="carbon" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#ffffff" />
          <rect x="3" y="3" width="3" height="3" fill="#ffffff" />
        </pattern>
        <rect width="100" height="80" fill="url(#carbon)" />
        <path d="M -20 0 L 40 80 L 60 80 L 0 0 Z" fill={theme.accent} />
        <path d="M 20 0 L 80 80 L 100 80 L 40 0 Z" fill="#ffffff" opacity="0.4" />
      </svg>

      {/* Top Accent Line */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: theme.accent
        }}
      />

      {/* Country Code Label */}
      <span 
        style={{
          fontSize: '18px',
          fontWeight: 900,
          letterSpacing: '1px',
          color: theme.text,
          lineHeight: 1,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontStyle: 'italic',
          zIndex: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}
      >
        {code}
      </span>

      {/* F1 Sub-Badge */}
      <span 
        style={{
          fontSize: '8px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: theme.subText,
          textTransform: 'uppercase',
          marginTop: '3px',
          zIndex: 1,
          opacity: 0.95
        }}
      >
        RACE
      </span>
    </div>
  );
}
