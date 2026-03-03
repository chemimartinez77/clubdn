// client/src/pages/viernes/ViernesGame.tsx
import { useParams } from 'react-router-dom';
import ViernesBoard from '../../components/combatzone/viernes/ViernesBoard';

export default function ViernesGame() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div className="text-center py-10 text-red-400">ID de partida no válido.</div>;

  return <ViernesBoard gameId={id} />;
}
