import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import TeamView from './pages/TeamView';
import Finale from './pages/Finale';
import Results from './pages/Results';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSetup from './pages/admin/AdminSetup';
import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';

function App() {
  const connect = useGameStore(state => state.connect);

  useEffect(() => {
    // Connexion automatique à la room PartyKit
    connect('game-room');
  }, [connect]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/team/:teamId" element={<TeamView />} />
        <Route path="/finale/:teamId" element={<Finale />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/setup" element={<AdminSetup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
