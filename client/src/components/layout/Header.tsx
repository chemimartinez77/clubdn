// client/src/components/layout/Header.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import Modal from '../ui/Modal';
import NotificationBell from '../notifications/NotificationBell';
import TipOfTheDayModal from '../tips/TipOfTheDayModal';
import { displayName, fullNameTooltip } from '../../utils/displayName';
import { getRandomTip } from '../../data/tips';
import type { Tip } from '../../data/tips';

export default function Header() {
  const { user, logout, isAdmin, impersonating, stopImpersonating } = useAuth();
  const { themeMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const [isMobileGamesOpen, setIsMobileGamesOpen] = useState(false);
  const [isComunidadMenuOpen, setIsComunidadMenuOpen] = useState(false);
  const [isMobileComunidadOpen, setIsMobileComunidadOpen] = useState(false);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [manualTip, setManualTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (!isIdModalOpen) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isIdModalOpen]);

  const handleLogout = () => {
    logout();
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsAdminMenuOpen(false);
    setIsGamesMenuOpen(false);
    setIsComunidadMenuOpen(false);
  };

  const membershipLabel =
    user?.membership?.type === 'SOCIO'
      ? 'Socio'
      : user?.membership?.type === 'COLABORADOR'
      ? 'Colaborador'
      : user?.membership?.type === 'FAMILIAR'
      ? 'Familiar'
      : user?.membership?.type === 'EN_PRUEBAS'
      ? 'Colaborador en pruebas'
      : user?.membership?.type === 'BAJA'
      ? 'Baja'
      : 'Miembro';
  const isCombatZoneEnabledForUser =
    user?.id === 'cmlnolhj4000oo175283glccj' ||
    user?.email?.toLowerCase() === 'chemimartinez@gmail.com';

  return (
    <>
    {impersonating && (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between">
        <span>Viendo como <strong>{impersonating.name}</strong> ({impersonating.email})</span>
        <button
          onClick={stopImpersonating}
          className="ml-4 underline font-semibold hover:text-amber-100"
        >
          Volver a mi cuenta
        </button>
      </div>
    )}
    <header className="bg-[var(--color-cardBackground)] shadow-sm border-b border-[var(--color-cardBorder)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src={themeMode === 'dark' ? '/logowhite.png' : '/logo.png'}
              alt="Club DN Logo"
              className="w-32 h-16 rounded-lg"
            />
            <span className="text-xl font-bold text-[var(--color-text)]">Club Dreadnought</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* ID */}
            {user && (
              <button
                onClick={() => {
                  setIsIdModalOpen(true);
                  setIsMenuOpen(false);
                  setIsAdminMenuOpen(false);
                  setIsGamesMenuOpen(false);
                }}
                className="text-[var(--color-textSecondary)] hover:text-primary transition-colors"
              >
                ID
              </button>
            )}

            {/* Inicio */}
            <Link
              id="nav-inicio"
              to="/"
              className="text-[var(--color-textSecondary)] hover:text-primary transition-colors"
            >
              Inicio
            </Link>

            {/* Calendario (antes Eventos) */}
            <Link
              id="nav-calendario"
              to="/events"
              state={{ forceMonth: true }}
              className="text-[var(--color-textSecondary)] hover:text-primary transition-colors"
            >
              Calendario
            </Link>

            {/* Juegos - Desplegable */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsGamesMenuOpen(!isGamesMenuOpen);
                  setIsAdminMenuOpen(false);
                  setIsMenuOpen(false);
                }}
                className="text-[var(--color-textSecondary)] hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                Juegos
                <svg
                  className={`w-4 h-4 transition-transform ${isGamesMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isGamesMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsGamesMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-48 bg-[var(--color-cardBackground)] rounded-lg shadow-lg border border-[var(--color-cardBorder)] py-1 z-20">
                    <Link
                      to="/ludoteca"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Ludoteca del club
                    </Link>
                    <Link
                      to="/mi-ludoteca"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Mi ludoteca
                    </Link>
                    <Link
                      to="/ludotecas-jugadores"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Ludotecas de jugadores
                    </Link>
                    <Link
                      to="/games"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Juegos jugados
                    </Link>
                    <Link
                      to="/quien-sabe-jugar"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      ¿Quién sabe jugar?
                    </Link>
                    {isCombatZoneEnabledForUser ? (
                      <Link
                        to="/azul/combatzone"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsGamesMenuOpen(false)}
                      >
                        <span className="block leading-tight">⚠️ Combat Zone</span>
                        <span className="block text-[10px] opacity-70 leading-tight">Coming soon</span>
                      </Link>
                    ) : (
                      <Link
                        to="/azul/combatzone/coming-soon"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsGamesMenuOpen(false)}
                      >
                        <span className="block leading-tight">⚠️ Combat Zone</span>
                        <span className="block text-[10px] opacity-70 leading-tight">Coming soon</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Documentos - Accesible a todos */}
            <Link
              to="/documentos"
              className="text-[var(--color-textSecondary)] hover:text-primary transition-colors"
            >
              Documentos
            </Link>
            {/* Comunidad - Desplegable */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsComunidadMenuOpen(!isComunidadMenuOpen);
                  setIsGamesMenuOpen(false);
                  setIsAdminMenuOpen(false);
                  setIsMenuOpen(false);
                }}
                className="text-[var(--color-textSecondary)] hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                Comunidad
                <svg
                  className={`w-4 h-4 transition-transform ${isComunidadMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isComunidadMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsComunidadMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-52 bg-[var(--color-cardBackground)] rounded-lg shadow-lg border border-[var(--color-cardBorder)] py-1 z-20">
                    <Link
                      to="/feedback"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsComunidadMenuOpen(false)}
                    >
                      Sugerencias y reportes
                    </Link>
                    <Link
                      to="/anuncios"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsComunidadMenuOpen(false)}
                    >
                      Tablón de anuncios
                    </Link>
                    <Link
                      to="/mercadillo"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                      onClick={() => setIsComunidadMenuOpen(false)}
                    >
                      Mercadillo
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Menú Administración - Solo admin */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsAdminMenuOpen(!isAdminMenuOpen);
                    setIsGamesMenuOpen(false);
                    setIsMenuOpen(false);
                  }}
                  className="text-[var(--color-textSecondary)] hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Administración
                  <svg
                    className={`w-4 h-4 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAdminMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsAdminMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-56 bg-[var(--color-cardBackground)] rounded-lg shadow-lg border border-[var(--color-cardBorder)] py-1 z-20">
                      <Link
                        to="/admin/dashboard"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Panel de Control
                      </Link>
                      <div className="border-t border-[var(--color-cardBorder)] my-1"></div>
                      <Link
                        to="/admin/pending-approvals"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Aprobaciones Pendientes
                      </Link>
                      <Link
                        to="/admin/members"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Directorio de Miembros
                      </Link>
                      <Link
                        to="/admin/membership"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión de Pagos
                      </Link>
                      <Link
                        to="/admin/events"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión de Eventos
                      </Link>
                      <Link
                        to="/financiero"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión Financiera
                      </Link>
                      <Link
                        to="/events/preview-semanal"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Preview semanal
                      </Link>
                      <div className="border-t border-[var(--color-cardBorder)] my-1"></div>
                      <Link
                        to="/admin/invitations"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Historial de Invitaciones
                      </Link>
                      <Link
                        to="/admin/announcements"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Tablón de anuncios
                      </Link>
                      <Link
                        to="/admin/config"
                        className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Configuración del Club
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User Dropdown */}
            <div className="relative">
              <button
                id="nav-user-menu"
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setIsAdminMenuOpen(false);
                  setIsGamesMenuOpen(false);
                }}
                className="flex items-center space-x-2 text-[var(--color-textSecondary)] hover:text-primary transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.profile?.avatar ? (
                    <img
                      src={user.profile.avatar}
                      alt={user?.name || 'Usuario'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold text-sm">
                      {displayName(user?.name || '', user?.profile?.nick).charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <span className="font-medium" title={fullNameTooltip(user?.name || '', user?.profile?.nick)}>
                  {displayName(user?.name || '', user?.profile?.nick)}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--color-cardBackground)] rounded-lg shadow-lg border border-[var(--color-cardBorder)] py-1 z-20">
                    <div className="px-4 py-2 border-b border-[var(--color-cardBorder)]">
                      <p className="text-sm font-medium text-[var(--color-text)]">{displayName(user?.name || '', user?.profile?.nick)}</p>
                      {user?.profile?.nick && <p className="text-xs text-[var(--color-textSecondary)]">{user.name}</p>}
                      <p className="text-xs text-[var(--color-textSecondary)]">{user?.email}</p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        {user?.role === 'SUPER_ADMIN' ? 'Super Administrador' : user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                      </p>
                    </div>

                    <button
                      onClick={() => { setManualTip(getRandomTip()); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Consejo del día
                    </button>

                    <Link
                      id="nav-perfil"
                      to="/profile"
                      className="block px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Perfil
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Right side: Bell (always once) + Mobile menu button */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              id="mobile-menu-button"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setIsMobileGamesOpen(false);
              }}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-cardBorder)]">
            <nav className="flex flex-col space-y-2">
              {/* ID */}
              {user && (
                <button
                  onClick={() => {
                    closeAllMenus();
                    setIsIdModalOpen(true);
                  }}
                  className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                >
                  ID
                </button>
              )}

              {/* Inicio */}
              <Link
                to="/"
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Inicio
              </Link>

              {/* Calendario */}
              <Link
                to="/events"
                state={{ forceMonth: true }}
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Calendario
              </Link>

              {/* Juegos - Acordeón móvil */}
              <div>
                <button
                  onClick={() => setIsMobileGamesOpen(!isMobileGamesOpen)}
                  className="w-full px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Juegos</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isMobileGamesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMobileGamesOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      to="/ludoteca"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Ludoteca del club
                    </Link>
                    <Link
                      to="/mi-ludoteca"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Mi ludoteca
                    </Link>
                    <Link
                      to="/ludotecas-jugadores"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Ludotecas de jugadores
                    </Link>
                    <Link
                      to="/games"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Juegos jugados
                    </Link>
                    <Link
                      to="/quien-sabe-jugar"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      ¿Quién sabe jugar?
                    </Link>
                    {isCombatZoneEnabledForUser ? (
                      <Link
                        to="/azul/combatzone"
                        className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                        onClick={closeAllMenus}
                      >
                        <span className="block leading-tight">⚠️ Combat Zone</span>
                        <span className="block text-[10px] opacity-70 leading-tight">Coming soon</span>
                      </Link>
                    ) : (
                      <Link
                        to="/azul/combatzone/coming-soon"
                        className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                        onClick={closeAllMenus}
                      >
                        <span className="block leading-tight">⚠️ Combat Zone</span>
                        <span className="block text-[10px] opacity-70 leading-tight">Coming soon</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Documentos */}
              <Link
                to="/documentos"
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Documentos
              </Link>
              {/* Comunidad - Acordeón móvil */}
              <div>
                <button
                  onClick={() => setIsMobileComunidadOpen(!isMobileComunidadOpen)}
                  className="w-full px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Comunidad</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isMobileComunidadOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMobileComunidadOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      to="/feedback"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Sugerencias y reportes
                    </Link>
                    <Link
                      to="/anuncios"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Tablón de anuncios
                    </Link>
                    <Link
                      to="/mercadillo"
                      className="block px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Mercadillo
                    </Link>
                  </div>
                )}
              </div>

              {/* Administración - Solo admin */}
              {isAdmin && (
                <>
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wider mb-2">
                      Administración
                    </p>
                  </div>
                  <Link
                    to="/admin/dashboard"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Panel de Control
                  </Link>
                  <Link
                    to="/admin/pending-approvals"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Aprobaciones Pendientes
                  </Link>
                  <Link
                    to="/admin/members"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Directorio de Miembros
                  </Link>
                  <Link
                    to="/admin/membership"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión de Pagos
                  </Link>
                  <Link
                    to="/admin/events"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión de Eventos
                  </Link>
                  <Link
                    to="/financiero"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión Financiera
                  </Link>
                  <Link
                    to="/events/preview-semanal"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Preview semanal
                  </Link>
                  <Link
                    to="/admin/invitations"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Historial de Invitaciones
                  </Link>
                  <Link
                    to="/admin/announcements"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Tablón de anuncios
                  </Link>
                  <Link
                    to="/admin/config"
                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Configuración del Club
                  </Link>
                </>
              )}

              <div className="border-t border-[var(--color-cardBorder)] my-2" />

              {/* Consejo del día */}
              <button
                onClick={() => { setManualTip(getRandomTip()); closeAllMenus(); }}
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center gap-2 text-left cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Consejo del día
              </button>

              {/* Perfil */}
              <Link
                to="/profile"
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center gap-2"
                onClick={closeAllMenus}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perfil
              </Link>

              {/* Cerrar sesión */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </nav>
          </div>
        )}
      </div>

      {manualTip && (
        <TipOfTheDayModal tip={manualTip} onClose={() => setManualTip(null)} />
      )}

      <Modal
        isOpen={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
        title="ID"
        size="sm"
      >
        <div className="flex flex-col items-center space-y-4 text-center">
          {user?.profile?.avatar ? (
            <img
              src={user.profile.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border border-[var(--color-cardBorder)]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-[var(--color-cardBorder)]">
              <span className="text-3xl font-semibold text-primary">
                {displayName(user?.name || '', user?.profile?.nick).charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <p
              className="text-lg font-semibold text-[var(--color-text)]"
              title={fullNameTooltip(user?.name || '', user?.profile?.nick)}
            >
              {displayName(user?.name || '', user?.profile?.nick)}
            </p>
            {user?.profile?.nick && <p className="text-xs text-[var(--color-textSecondary)]">{user.name}</p>}
            <p className="text-sm text-[var(--color-textSecondary)]">{membershipLabel}</p>
          </div>

          <div className="w-full border-t border-[var(--color-cardBorder)] pt-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)] mb-1">Hora en tiempo real</p>
            <p className="text-base font-semibold text-[var(--color-text)]">
              {now.toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
        </div>
      </Modal>
    </header>
    </>
  );
}
