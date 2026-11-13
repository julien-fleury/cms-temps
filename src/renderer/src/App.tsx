import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AffairesPage } from './pages/AffairesPage';
import { AffaireDetailPage } from './pages/AffaireDetailPage';
import { PointageFormPage } from './pages/PointageFormPage';
import { DonneesPage } from './pages/DonneesPage';
import { SemainePage } from './pages/SemainePage';
import { CategoriesPage } from './pages/CategoriesPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/affaires" element={<AffairesPage />} />
        <Route path="/affaires/:id" element={<AffaireDetailPage />} />
        <Route path="/pointages/nouveau" element={<PointageFormPage />} />
        <Route path="/semaine" element={<SemainePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/donnees" element={<DonneesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
