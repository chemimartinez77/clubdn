// client/src/pages/azul/AzulGame.tsx
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { GameBoard } from '../../components/combatzone/azul/GameBoard';

export default function AzulGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/combatzone');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/combatzone')}
          className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
        >
          ‹ Dreadnought Combat Zone
        </button>

        <GameBoard gameId={id} />
      </div>
    </Layout>
  );
}
