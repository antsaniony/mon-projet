import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken, clearToken } from './api';
import { AnneeScolaireProvider } from './context/AnneeScolaire.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AnneeScolairePage from './pages/AnneeScolairePage.jsx';
import Eleves from './pages/Eleves.jsx';
import Paiements from './pages/Paiements.jsx';
import EmploiDuTemps from './pages/EmploiDuTemps.jsx';
import Programmes from './pages/Programmes.jsx';
import Dactylographie from './pages/Dactylographie.jsx';

export default function App() {
  const [connecte, setConnecte] = useState(!!getToken());

  useEffect(() => {
    const surDeconnexion = () => setConnecte(false);
    window.addEventListener('auth:deconnexion', surDeconnexion);
    return () => window.removeEventListener('auth:deconnexion', surDeconnexion);
  }, []);

  if (!connecte) return <Login onConnecte={() => setConnecte(true)} />;

  const deconnecter = () => {
    clearToken();
    setConnecte(false);
  };

  return (
    <AnneeScolaireProvider>
      <Layout onDeconnexion={deconnecter}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/annee-scolaire" element={<AnneeScolairePage />} />
          <Route path="/eleves" element={<Eleves />} />
          <Route path="/paiements" element={<Paiements />} />
          <Route path="/emploi-du-temps" element={<EmploiDuTemps />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/dactylographie" element={<Dactylographie />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AnneeScolaireProvider>
  );
}
