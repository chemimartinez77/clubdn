// client/src/pages/azul/AzulGame.tsx
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { GameBoard } from '../../components/combatzone/azul/GameBoard';

export default function AzulGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/azul/combatzone');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/azul/combatzone')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors self-start flex items-center gap-1"
        >
          ‹ Dreadnought Combat Zone
        </button>

        <GameBoard gameId={id} />
      </div>
    </Layout>
  );
}
