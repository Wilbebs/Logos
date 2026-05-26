import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import ApplicantDetail from './pages/ApplicantDetail.jsx';
import ChatBot from './components/ChatBot.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applicants/:id" element={<ApplicantDetail />} />
      </Routes>

      {/* Global AI assistant — floats on every page */}
      <ChatBot />
    </BrowserRouter>
  );
}
