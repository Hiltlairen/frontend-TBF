import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RutaProtegida } from './auth/AuthContext.jsx'
import Login from './auth/Login.jsx'
import ActivarCuenta from './auth/ActivarCuenta.jsx'
import OlvidePassword from './auth/OlvidePassword.jsx'
import RestablecerPassword from './auth/RestablecerPassword.jsx'
import ConfirmarEmail from './auth/ConfirmarEmail.jsx'

import DashboardLayout from './components/layout/DashboardLayout.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import ReviewQueue from './pages/ReviewQueue.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import Clases from './pages/Clases.jsx'
import PanelDocente from './pages/PanelDocente.jsx'
import PanelClase from './pages/PanelClase.jsx'
import PanelActividad from './pages/PanelActividad.jsx'
import MiPerfil from './pages/MiPerfil.jsx'
import CreateActivityPage from './components/create-activity/CreateActivityPage.jsx'
import ResultsPage from './components/results/ResultsPage.jsx'
import VocabularyPage from './components/vocabulary/VocabularyPage.jsx'

import StudentHome from './components/student/StudentHome.jsx'
import GamePlayer from './game/GamePlayer.jsx'

import './pages/DashboardHome.css'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Estudiante: sin cuenta, solo código ── */}
        <Route index element={<StudentHome />} />
        <Route path="jugar/:codigo" element={<GamePlayer />} />

        {/* ── Acceso del personal ── */}
        <Route path="entrar" element={<Login />} />
        <Route path="activar-cuenta" element={<ActivarCuenta />} />
        <Route path="olvide-password" element={<OlvidePassword />} />
        <Route path="restablecer-password" element={<RestablecerPassword />} />
        <Route path="confirmar-email" element={<ConfirmarEmail />} />

        {/* ── Curaduría (curador y admin) ── */}
        <Route path="curaduria" element={
          <RutaProtegida roles={['curador', 'admin']}>
            <DashboardLayout />
          </RutaProtegida>
        }>
          <Route index element={<ReviewQueue />} />
          <Route path="vocabulario" element={<VocabularyPage />} />
          <Route path="resultados" element={<ResultsPage />} />
          <Route path="clases" element={<Clases />} />
          <Route path="perfil" element={<MiPerfil />} />
        </Route>

        {/* ── Panel del docente (y admin) ── */}
        <Route path="dashboard" element={
          <RutaProtegida roles={['docente', 'admin']}>
            <DashboardLayout />
          </RutaProtegida>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="actividades/crear" element={<CreateActivityPage />} />
          <Route path="resultados" element={<ResultsPage />} />
          <Route path="panel" element={<PanelDocente />} />
          <Route path="panel/:claseId" element={<PanelClase />} />
          <Route path="panel/:claseId/:salaId" element={<PanelActividad />} />
          <Route path="vocabulario" element={<VocabularyPage />} />
          <Route path="usuarios" element={
            <RutaProtegida roles={['admin']}><AdminUsers /></RutaProtegida>
          } />
          <Route path="clases" element={
            <RutaProtegida roles={['admin']}><Clases /></RutaProtegida>
          } />
          <Route path="perfil" element={<MiPerfil />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
