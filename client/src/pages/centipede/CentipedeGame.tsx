import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CentipedeBoard from '../../components/combatzone/centipede/CentipedeBoard';

export default function CentipedeGame() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <button
          onClick={() => navigate('/azul/combatzone')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors self-start flex items-center gap-1"
        >
          ‹ Dreadnought Combat Zone
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-800">Centipede</h1>
          <p className="text-sm text-gray-500">Arcade clásico · modo solitario</p>
        </div>

        <CentipedeBoard />
      </div>
    </Layout>
  );
}
