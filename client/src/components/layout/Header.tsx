// client/src/components/layout/Header.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const [isMobileGamesOpen, setIsMobileGamesOpen] = useState(false);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [now, setNow] = useState(new Date());

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
  };

  const membershipLabel =
    user?.membership?.type === 'SOCIO'
      ? 'Socio'
      : user?.membership?.type === 'COLABORADOR'
      ? 'Colaborador'
      : 'Miembro';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="Club DN Logo"
              className="w-32 h-16 rounded-lg"
            />
            <span className="text-xl font-bold text-gray-900">Club DN</span>
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
                className="text-gray-700 hover:text-primary transition-colors"
              >
                ID
              </button>
            )}

            {/* Inicio */}
            <Link
              to="/"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Inicio
            </Link>

            {/* Calendario (antes Eventos) */}
            <Link
              to="/events"
              className="text-gray-700 hover:text-primary transition-colors"
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
                className="text-gray-700 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
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
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <Link
                      to="/ludoteca"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Ludoteca
                    </Link>
                    <Link
                      to="/games"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsGamesMenuOpen(false)}
                    >
                      Buscados
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Documentos - Accesible a todos */}
            <Link
              to="/documentos"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Documentos
            </Link>

            {/* Menú Administración - Solo admin */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsAdminMenuOpen(!isAdminMenuOpen);
                    setIsGamesMenuOpen(false);
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
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
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <Link
                        to="/admin/pending-approvals"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Aprobaciones Pendientes
                      </Link>
                      <Link
                        to="/admin/members"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Directorio de Miembros
                      </Link>
                      <Link
                        to="/admin/membership"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión de Pagos
                      </Link>
                      <Link
                        to="/admin/events"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión de Eventos
                      </Link>
                      <Link
                        to="/financiero"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        Gestión Financiera
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <Link
                        to="/admin/config"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setIsAdminMenuOpen(false);
                  setIsGamesMenuOpen(false);
                }}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{user?.name}</span>
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Administrador' : 'Usuario'}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
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

          {/* Mobile menu button */}
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsMobileGamesOpen(false);
            }}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2">
              {/* ID */}
              {user && (
                <button
                  onClick={() => {
                    closeAllMenus();
                    setIsIdModalOpen(true);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                >
                  ID
                </button>
              )}

              {/* Inicio */}
              <Link
                to="/"
                className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Inicio
              </Link>

              {/* Calendario */}
              <Link
                to="/events"
                className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Calendario
              </Link>

              {/* Juegos - Acordeón móvil */}
              <div>
                <button
                  onClick={() => setIsMobileGamesOpen(!isMobileGamesOpen)}
                  className="w-full px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center justify-between cursor-pointer"
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
                      className="block px-4 py-2 text-gray-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Ludoteca
                    </Link>
                    <Link
                      to="/games"
                      className="block px-4 py-2 text-gray-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      onClick={closeAllMenus}
                    >
                      Buscados
                    </Link>
                  </div>
                )}
              </div>

              {/* Documentos */}
              <Link
                to="/documentos"
                className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                onClick={closeAllMenus}
              >
                Documentos
              </Link>

              {/* Administración - Solo admin */}
              {isAdmin && (
                <>
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Administración
                    </p>
                  </div>
                  <Link
                    to="/admin/pending-approvals"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Aprobaciones Pendientes
                  </Link>
                  <Link
                    to="/admin/members"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Directorio de Miembros
                  </Link>
                  <Link
                    to="/admin/membership"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión de Pagos
                  </Link>
                  <Link
                    to="/admin/events"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión de Eventos
                  </Link>
                  <Link
                    to="/financiero"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Gestión Financiera
                  </Link>
                  <Link
                    to="/admin/config"
                    className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    onClick={closeAllMenus}
                  >
                    Configuración del Club
                  </Link>
                </>
              )}

              <div className="border-t border-gray-200 my-2" />

              {/* Perfil */}
              <Link
                to="/profile"
                className="px-4 py-2 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center gap-2"
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
              className="w-24 h-24 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-gray-200">
              <span className="text-3xl font-semibold text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-600">{membershipLabel}</p>
          </div>

          <div className="w-full border-t border-gray-200 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Hora en tiempo real</p>
            <p className="text-base font-semibold text-gray-900">
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
  );
}
