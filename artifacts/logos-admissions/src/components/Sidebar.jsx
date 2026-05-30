import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

const primary   = '#7B2335';
const primaryLt = '#F5E8EA';
const textDark  = '#1B2340';
const sidebarBg = '#F3F4F8';

const COLLAPSED_W = 68;
const EXPANDED_W  = 236;

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Settings,        label: 'Settings',  path: '/settings' },
];

export default function Sidebar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(false);

  function isActive(path) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: hovered ? EXPANDED_W : COLLAPSED_W,
        minWidth: hovered ? EXPANDED_W : COLLAPSED_W,
        backgroundColor: sidebarBg,
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'width 0.24s ease, min-width 0.24s ease',
        zIndex: 20,
      }}
    >
      {/* ── Logo area ─────────────────────────────────────── */}
      <div
        style={{
          height: 72,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: hovered ? 'flex-start' : 'center',
          padding: hovered ? '0 18px' : '0',
          transition: 'padding 0.24s ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Collapsed: shield clipped at 34px wide; zoom image tall so text is off-screen */}
        {!hovered && (
          <div
            style={{
              width: 34,
              height: 40,
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <img
              src="/logos-logo.png"
              alt=""
              style={{
                height: 40,
                width: 'auto',
                maxWidth: 'none',
                position: 'absolute',
                left: 0,
                top: 0,
              }}
            />
          </div>
        )}

        {/* Expanded: full logo */}
        {hovered && (
          <img
            src="/logos-logo.png"
            alt="LOGOS University College"
            style={{ height: 40, objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          padding: hovered ? '14px 10px' : '14px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          transition: 'padding 0.24s ease',
        }}
      >
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={!hovered ? label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: hovered ? 'flex-start' : 'center',
                padding: hovered ? '10px 14px' : '10px 0',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active
                  ? (hovered ? primary : primaryLt)
                  : 'transparent',
                color: active ? (hovered ? '#fff' : primary) : '#6B7280',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s, color 0.15s, padding 0.24s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'rgba(123,35,53,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span
                style={{
                  opacity: hovered ? 1 : 0,
                  maxWidth: hovered ? 200 : 0,
                  overflow: 'hidden',
                  transition: 'opacity 0.16s ease, max-width 0.24s ease',
                  display: 'inline-block',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── User ─────────────────────────────────────────── */}
      <div
        style={{
          padding: hovered ? '12px 10px' : '12px 0',
          borderTop: '1px solid #E5E7EB',
          flexShrink: 0,
          transition: 'padding 0.24s ease',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: hovered ? '8px 10px' : '8px 0',
            borderRadius: hovered ? 10 : 0,
            cursor: 'pointer',
            justifyContent: hovered ? 'flex-start' : 'center',
            transition: 'background-color 0.15s, padding 0.24s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(123,35,53,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div
            title="Admin User"
            style={{
              height: 36,
              width: 36,
              borderRadius: '50%',
              backgroundColor: primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: '0.02em',
            }}
          >
            AD
          </div>

          {hovered && (
            <>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textDark, whiteSpace: 'nowrap' }}>
                  Admin User
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  admin@logos.edu
                </p>
              </div>
              <LogOut size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
