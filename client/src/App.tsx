// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import CreatePartida from './pages/CreatePartida';
import InviteValidation from './pages/InviteValidation';
import PendingApprovals from './pages/admin/PendingApprovals';
import AdminDashboard from './pages/admin/Dashboard';
import EventManagement from './pages/admin/EventManagement';
import MembershipManagement from './pages/admin/MembershipManagement';
import Members from './pages/admin/Members';
import ClubConfig from './pages/admin/ClubConfig';
import Games from './pages/Games';
import Financiero from './pages/Financiero';
import Ludoteca from './pages/Ludoteca';
import Documentos from './pages/Documentos';
import Feedback from './pages/Feedback';
import AdminRoute from './components/routes/AdminRoute';
import AzulLocal from './pages/azul/AzulLocal';
import CombatZone from './pages/azul/CombatZone';
import AzulGame from './pages/azul/AzulGame';

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Componente para rutas públicas (login/register)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider position="top-right">
          <AuthProvider>
            <Routes>
          {/* Rutas públicas */}
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          {/* Sandbox Azul — pública para pruebas sin login */}
          <Route path="/azul/local" element={<AzulLocal />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rutas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Rutas de eventos */}
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/crear-partida"
            element={
              <ProtectedRoute>
                <CreatePartida />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite/:token"
            element={
              <ProtectedRoute>
                <InviteValidation />
              </ProtectedRoute>
            }
          />

          {/* Dreadnought Combat Zone — Azul online */}
          <Route
            path="/azul/combatzone"
            element={
              <ProtectedRoute>
                <CombatZone />
              </ProtectedRoute>
            }
          />
          <Route
            path="/azul/combatzone/:id"
            element={
              <ProtectedRoute>
                <AzulGame />
              </ProtectedRoute>
            }
          />

          {/* Ruta de juegos */}
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <Games />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financiero"
            element={
              <AdminRoute>
                <Financiero />
              </AdminRoute>
            }
          />
          <Route
            path="/ludoteca"
            element={
              <ProtectedRoute>
                <Ludoteca />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentos"
            element={
              <ProtectedRoute>
                <Documentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />

          {/* Rutas de administración */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pending-approvals"
            element={
              <AdminRoute>
                <PendingApprovals />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <EventManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/membership"
            element={
              <AdminRoute>
                <MembershipManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <AdminRoute>
                <Members />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/config"
            element={
              <AdminRoute>
                <ClubConfig />
              </AdminRoute>
            }
          />

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
