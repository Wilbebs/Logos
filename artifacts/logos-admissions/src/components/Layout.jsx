import React from 'react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
