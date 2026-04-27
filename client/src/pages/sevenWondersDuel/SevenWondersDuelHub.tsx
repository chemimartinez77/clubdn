import { useNavigate } from 'react-router-dom';

const FEATURES = [
  'Partidas 1v1 con civilizaciones asimétricas y selección abierta de cartas por eras.',
  'Tres condiciones de victoria modeladas desde el primer diseño: militar, científica y puntos.',
  'Mesa táctica específica para wonders, progreso científico y pista militar.',
];

const NEXT_STEPS = [
  'Definir el estado canónico de partida y el setup inicial de Era I.',
  'Modelar turnos, cartas accesibles y construcción de maravillas.',
  'Persistir partidas y habilitar creación/unión desde Combat Zone.',
];

export default function SevenWondersDuelHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <button
          onClick={() => navigate('/combatzone')}
          className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
        >
          {'<-'} Combat Zone
        </button>

        <div className="rounded-3xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-[0.25em] text-[var(--color-textSecondary)]">
                Combat Zone Prototype
              </p>
              <h1 className="text-3xl font-black text-[var(--color-text)]">7 Wonders Duel</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-textSecondary)]">
                La entrada a Combat Zone ya está conectada. Esta pantalla deja preparado el hueco para construir
                una versión online específica de 7 Wonders Duel sin mezclarla con el flujo de Azul o Viernes.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              En preparación
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                Alcance inicial
              </h2>
              <ul className="space-y-2 text-sm text-[var(--color-textSecondary)]">
                {FEATURES.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                Siguientes pasos
              </h2>
              <ul className="space-y-2 text-sm text-[var(--color-textSecondary)]">
                {NEXT_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/combatzone')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-[var(--color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors"
            >
              Volver a Combat Zone
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-xl border border-[var(--color-cardBorder)] px-4 py-2 text-sm font-semibold text-[var(--color-textSecondary)] opacity-70"
            >
              Nueva partida próximamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
