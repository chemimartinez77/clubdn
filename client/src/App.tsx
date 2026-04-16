// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { usePageTracking } from './hooks/usePageTracking';
import { ToastProvider } from './contexts/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { api } from './api/axios';
import TipOfTheDayModal from './components/tips/TipOfTheDayModal';
import { getRandomTip, shouldShowTip } from './data/tips';
import type { Tip } from './data/tips';
import { ThemeProvider } from './contexts/ThemeContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import CreatePartida from './pages/CreatePartida';
import InviteValidation from './pages/InviteValidation';
import ValidateGame from './pages/ValidateGame';
import JoinViaShareLink from './pages/JoinViaShareLink';
import PendingApprovals from './pages/admin/PendingApprovals';
import AdminDashboard from './pages/admin/Dashboard';
import EventManagement from './pages/admin/EventManagement';
import MembershipManagement from './pages/admin/MembershipManagement';
import Members from './pages/admin/Members';
import ClubConfig from './pages/admin/ClubConfig';
import InvitationHistory from './pages/admin/InvitationHistory';
import AdminAnnouncements from './pages/admin/Announcements';
import Announcements from './pages/Announcements';
import Games from './pages/Games';
import Financiero from './pages/Financiero';
import Ludoteca from './pages/Ludoteca';
import MiLudoteca from './pages/MiLudoteca';
import Documentos from './pages/Documentos';
import Feedback from './pages/Feedback';
import UserProfile from './pages/UserProfile';
import AdminRoute from './components/routes/AdminRoute';
import AzulLocal from './pages/azul/AzulLocal';
import CombatZone from './pages/azul/CombatZone';
import AzulGame from './pages/azul/AzulGame';
import ViernesHub from './pages/viernes/ViernesHub';
import ViernesGame from './pages/viernes/ViernesGame';
import CentipedeGame from './pages/centipede/CentipedeGame';
import CombatZoneComingSoon from './pages/CombatZoneComingSoon';
import SevenWondersDuelHub from './pages/sevenWondersDuel/SevenWondersDuelHub';
import WeeklyPreview from './pages/WeeklyPreview';
import Marketplace from './pages/marketplace/Marketplace';
import MarketplaceNew from './pages/marketplace/MarketplaceNew';
import MarketplaceListing from './pages/marketplace/MarketplaceListing';
import MarketplaceEdit from './pages/marketplace/MarketplaceEdit';
import MarketplaceMine from './pages/marketplace/MarketplaceMine';
import MarketplaceConversations from './pages/marketplace/MarketplaceConversations';
import MarketplaceChat from './pages/marketplace/MarketplaceChat';

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, impersonating } = useAuth();
  const location = useLocation();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => api.get('/api/profile/me').then(r => r.data.data?.profile),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || (!!user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el onboarding no está completo y no estamos ya en /onboarding, redirigir
  if (
    profileData &&
    !profileData.onboardingCompleted &&
    !impersonating &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function CombatZoneRoute({ children }: { children: React.ReactNode }) {
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

  const isAllowedUser =
    user.id === 'cmlnolhj4000oo175283glccj' ||
    user.email?.toLowerCase() === 'chemimartinez@gmail.com';

  if (!isAllowedUser) {
    return <Navigate to="/azul/combatzone/coming-soon" replace />;
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

function PageTracker() {
  usePageTracking();
  return null;
}

const NO_TIP_PATHS = ['/reset-password', '/login', '/register', '/verify-email', '/forgot-password'];

function TipController() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const [tip, setTip] = useState<Tip | null>(null);
  const tipCheckedRef = useRef(false);

  const { data: profileData, isSuccess: profileLoaded } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => api.get('/api/profile/me').then(r => r.data.data?.profile),
    enabled: !!user && !isLoading,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isLoading || !user || !profileLoaded) return;
    if (tipCheckedRef.current) return;
    tipCheckedRef.current = true;

    const showTipPref = profileData?.showTipOfTheDay;
    if (showTipPref !== false && shouldShowTip() && !NO_TIP_PATHS.includes(pathname)) {
      setTip(getRandomTip());
    }
  }, [user, isLoading, profileLoaded, profileData, pathname]);

  // Resetear cuando el usuario cierra sesión
  useEffect(() => {
    if (!user) {
      tipCheckedRef.current = false;
    }
  }, [user]);

  if (!tip) return null;
  return <TipOfTheDayModal tip={tip} onClose={() => setTip(null)} />;
}

function App() {
  if (import.meta.env.VITE_MAINTENANCE === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <img
          src="/under_construction.png"
          alt="En construcción"
          className="max-w-full max-h-screen object-contain"
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider position="top-right">
          <AuthProvider>
            <PageTracker />
            <TipController />
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
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          {/* Enlace de invitación por WhatsApp — público */}
          <Route path="/join/:token" element={<JoinViaShareLink />} />
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

          <Route
            path="/users/:userId"
            element={
              <ProtectedRoute>
                <UserProfile />
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
            path="/events/preview-semanal"
            element={
              <ProtectedRoute>
                <WeeklyPreview />
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
          <Route
            path="/validate-game/:eventId/:scannedUserId"
            element={
              <ProtectedRoute>
                <ValidateGame />
              </ProtectedRoute>
            }
          />

          {/* Combat Zone — Coming Soon (accesible a todos los usuarios) */}
          <Route
            path="/azul/combatzone/coming-soon"
            element={
              <ProtectedRoute>
                <CombatZoneComingSoon />
              </ProtectedRoute>
            }
          />

          {/* Dreadnought Combat Zone — Azul online */}
          <Route
            path="/azul/combatzone"
            element={
              <CombatZoneRoute>
                <CombatZone />
              </CombatZoneRoute>
            }
          />
          <Route
            path="/azul/combatzone/:id"
            element={
              <CombatZoneRoute>
                <AzulGame />
              </CombatZoneRoute>
            }
          />

          {/* Dreadnought Combat Zone — Viernes (solitario) */}
          <Route
            path="/viernes"
            element={
              <CombatZoneRoute>
                <ViernesHub />
              </CombatZoneRoute>
            }
          />
          <Route
            path="/viernes/:id"
            element={
              <CombatZoneRoute>
                <ViernesGame />
              </CombatZoneRoute>
            }
          />
          <Route
            path="/7-wonders-duel"
            element={
              <CombatZoneRoute>
                <SevenWondersDuelHub />
              </CombatZoneRoute>
            }
          />
          <Route
            path="/azul/combatzone/centipede"
            element={
              <CombatZoneRoute>
                <CentipedeGame />
              </CombatZoneRoute>
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
            path="/mi-ludoteca"
            element={
              <ProtectedRoute>
                <MiLudoteca />
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
          <Route
            path="/anuncios"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />

          {/* Rutas de Mercadillo */}
          <Route path="/mercadillo" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/mercadillo/nuevo" element={<ProtectedRoute><MarketplaceNew /></ProtectedRoute>} />
          <Route path="/mercadillo/mis-anuncios" element={<ProtectedRoute><MarketplaceMine /></ProtectedRoute>} />
          <Route path="/mercadillo/conversaciones" element={<ProtectedRoute><MarketplaceConversations /></ProtectedRoute>} />
          <Route path="/mercadillo/conversaciones/:id" element={<ProtectedRoute><MarketplaceChat /></ProtectedRoute>} />
          <Route path="/mercadillo/:id" element={<ProtectedRoute><MarketplaceListing /></ProtectedRoute>} />
          <Route path="/mercadillo/:id/editar" element={<ProtectedRoute><MarketplaceEdit /></ProtectedRoute>} />

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
          <Route
            path="/admin/invitations"
            element={
              <AdminRoute>
                <InvitationHistory />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <AdminRoute>
                <AdminAnnouncements />
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
