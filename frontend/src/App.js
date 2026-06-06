import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';

import { LanguageProvider } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';
import Landing from '@/pages/Landing';
import About from '@/pages/About';
import PolicyMonitor from '@/pages/PolicyMonitor';
import ImpactBrief from '@/pages/ImpactBrief';
import AlertCenter from '@/pages/AlertCenter';
import SpatialCheck from '@/pages/SpatialCheck';
import TheoryOfChange from '@/pages/TheoryOfChange';
import EvidencePacks from '@/pages/EvidencePacks';
import Intel from '@/pages/Intel';
import Contact from '@/pages/Contact';

function App() {
  return (
    <LanguageProvider>
      <div className="App">
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/monitor" element={<PolicyMonitor />} />
              <Route path="/brief" element={<ImpactBrief />} />
              <Route path="/alerts" element={<AlertCenter />} />
              <Route path="/spatial" element={<SpatialCheck />} />
              <Route path="/evidence" element={<EvidencePacks />} />
              <Route path="/intel" element={<Intel />} />
              <Route path="/theory" element={<TheoryOfChange />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </div>
    </LanguageProvider>
  );
}

export default App;
