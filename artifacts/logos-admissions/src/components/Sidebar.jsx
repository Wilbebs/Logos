import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

const primary   = '#7B2335';
const textDark  = '#1B2340';
const sidebarBg = '#F3F4F8';

const COLLAPSED_W = 64;
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

  const w = hovered ? EXPANDED_W : COLLAPSED_W;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: w,
        minWidth: w,
        backgroundColor: sidebarBg,
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'width 0.22s ease, min-width 0.22s ease',
        zIndex: 20,
      }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        style={{
          height: 80,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: hovered ? '0 20px' : '0 14px',
          transition: 'padding 0.22s ease',
          flexShrink: 0,
        }}
      >
        {/* Clip to shield when collapsed, show full logo when expanded */}
        <div
          style={{
            width: hovered ? 'auto' : 36,
            height: 44,
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.22s ease',
          }}
        >
          <img
            src="/logos-logo.png"
            alt="LOGOS University College"
            style={{
              height: 44,
              width: 'auto',
              maxWidth: 'none',
              objectFit: 'none',
              objectPosition: 'left center',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: hovered ? 'flex-start' : 'center',
                padding: hovered ? '10px 14px' : '10px 0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active ? primary : 'transparent',
                color: active ? '#fff' : '#4B5563',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s, color 0.15s, padding 0.22s ease',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(156,163,175,0.25)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span
                style={{
                  opacity: hovered ? 1 : 0,
                  maxWidth: hovered ? 160 : 0,
                  overflow: 'hidden',
                  transition: 'opacity 0.18s ease, max-width 0.22s ease',
                  display: 'inline-block',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── User ─────────────────────────────────────── */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 8,
            borderRadius: 8,
            cursor: 'pointer',
            justifyContent: hovered ? 'flex-start' : 'center',
            transition: 'justify-content 0.22s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(156,163,175,0.25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {/* Avatar */}
          <div
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
            }}
          >
            AD
          </div>

          {/* Name + email — fade in when expanded */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              opacity: hovered ? 1 : 0,
              maxWidth: hovered ? 200 : 0,
              overflow: 'hidden',
              transition: 'opacity 0.18s ease, max-width 0.22s ease',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textDark, whiteSpace: 'nowrap' }}>Admin User</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>admin@logos.edu</p>
          </div>

          {/* Logout icon — only visible when expanded */}
          <LogOut
            size={15}
            style={{
              color: '#9CA3AF',
              flexShrink: 0,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.18s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
