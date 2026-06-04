import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ApplicantDetail from './pages/ApplicantDetail.jsx';
import AcceptanceLetterPage from './pages/AcceptanceLetterPage.jsx';
import DecisionEmailPage from './pages/DecisionEmailPage.jsx';
import ChatBot from './components/ChatBot.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applicants/:id" element={<ApplicantDetail />} />
          <Route path="/applicants/:id/acceptance" element={<AcceptanceLetterPage />} />
          <Route path="/applicants/:id/email/:type" element={<DecisionEmailPage />} />
        </Routes>
      </Layout>

      {/* Global AI assistant — floats on every page */}
      <ChatBot />
    </BrowserRouter>
  );
}
