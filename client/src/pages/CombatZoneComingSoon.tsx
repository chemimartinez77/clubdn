import { useNavigate } from 'react-router-dom';

export default function CombatZoneComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-6">⚠️</div>
      <h1 className="text-4xl font-bold text-[var(--color-textPrimary)] mb-4">
        Combat Zone
      </h1>
      <p className="text-2xl font-semibold text-[var(--color-primary)] mb-2">
        Coming soon...
      </p>
      <p className="text-[var(--color-textSecondary)] mt-4 max-w-md">
        Esta sección está en desarrollo. Pronto podrás acceder a ella.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-8 px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
      >
        Volver
      </button>
    </div>
  );
}
