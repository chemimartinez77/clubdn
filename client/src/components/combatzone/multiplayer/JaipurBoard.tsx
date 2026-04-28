import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  JaipurCtx,
  JaipurEngineState,
  JaipurGoodsType,
  MultiplayerMatchSnapshot,
} from '../../../types/multiplayer';
import { JaipurPixiScene, type JaipurBoardUiState } from './jaipur/JaipurPixiScene';
import { JAIPUR_STAGE_HEIGHT, JAIPUR_STAGE_WIDTH } from './jaipur/layout';

interface MatchMoveInput {
  type: string;
  args?: unknown[];
}

const GOODS_ORDER: JaipurGoodsType[] = ['diamante', 'oro', 'plata', 'tela', 'especias', 'cuero'];

function groupGoods(hand: JaipurGoodsType[]) {
  return GOODS_ORDER.reduce<Record<JaipurGoodsType, number>>(
    (counts, goodsType) => {
      counts[goodsType] = hand.filter((entry) => entry === goodsType).length;
      return counts;
    },
    {
      diamante: 0,
      oro: 0,
      plata: 0,
      tela: 0,
      especias: 0,
      cuero: 0,
    },
  );
}

export default function JaipurBoard({
  snapshot,
  isSending,
  onSendMove,
}: {
  snapshot: MultiplayerMatchSnapshot;
  isSending: boolean;
  onSendMove: (move: MatchMoveInput) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<JaipurPixiScene | null>(null);

  const engine = snapshot.engine;
  const G = engine?.G as JaipurEngineState | undefined;
  const ctx = engine?.ctx as JaipurCtx | undefined;
  const myPlayerID = engine?.playerID === '0' || engine?.playerID === '1' ? engine.playerID : null;
  const myPlayer = myPlayerID && G ? G.players[myPlayerID] : null;
  const canPlay = snapshot.match.status === 'ACTIVE' && Boolean(engine?.isYourTurn) && !isSending && myPlayer !== null;

  const [selectedTakeIndices, setSelectedTakeIndices] = useState<number[]>([]);
  const [selectedGiveGoods, setSelectedGiveGoods] = useState<JaipurGoodsType[]>([]);
  const [selectedGiveCamels, setSelectedGiveCamels] = useState(0);

  useEffect(() => {
    setSelectedTakeIndices([]);
    setSelectedGiveGoods([]);
    setSelectedGiveCamels(0);
  }, [snapshot.match.id]);

  const myHandCounts = useMemo(() => groupGoods(myPlayer?.hand ?? []), [myPlayer?.hand]);
  const selectedGiveGoodsCounts = useMemo(() => groupGoods(selectedGiveGoods), [selectedGiveGoods]);
  const selectedTakeGoods = useMemo(
    () =>
      selectedTakeIndices
        .map((index) => G?.market[index])
        .filter((card): card is JaipurGoodsType => Boolean(card) && card !== 'camello'),
    [G?.market, selectedTakeIndices],
  );

  const selectedTakeTypes = useMemo(() => new Set(selectedTakeGoods), [selectedTakeGoods]);
  const exchangeGiveTotal = selectedGiveGoods.length + selectedGiveCamels;
  const exchangeReady =
    canPlay &&
    selectedTakeIndices.length >= 2 &&
    exchangeGiveTotal === selectedTakeIndices.length &&
    selectedGiveCamels <= (myPlayer?.herdCount ?? 0) &&
    selectedGiveGoods.every((goodsType) => !selectedTakeTypes.has(goodsType)) &&
    selectedTakeIndices.every((index) => {
      const card = G?.market[index];
      return card !== undefined && card !== 'camello';
    });

  const currentPlayerName =
    (ctx &&
      (snapshot.match.players.find((player) => String(player.playerIndex) === ctx.currentPlayer)?.nick ||
        snapshot.match.players.find((player) => String(player.playerIndex) === ctx.currentPlayer)?.name)) ||
    'Rival';

  const clearExchange = () => {
    setSelectedTakeIndices([]);
    setSelectedGiveGoods([]);
    setSelectedGiveCamels(0);
  };

  const toggleTakeIndex = (index: number) => {
    if (!canPlay || !G) {
      return;
    }

    const card = G.market[index];
    if (!card || card === 'camello') {
      return;
    }

    setSelectedTakeIndices((current) =>
      current.includes(index) ? current.filter((entry) => entry !== index) : [...current, index].sort((a, b) => a - b),
    );
  };

  const toggleGiveGoods = (goodsType: JaipurGoodsType) => {
    if (!canPlay || !myPlayer) {
      return;
    }

    const selectedCount = selectedGiveGoods.filter((entry) => entry === goodsType).length;
    const availableCount = myHandCounts[goodsType];

    if (selectedCount < availableCount) {
      setSelectedGiveGoods((current) => [...current, goodsType]);
      return;
    }

    const current = [...selectedGiveGoods];
    const removeIndex = current.lastIndexOf(goodsType);
    if (removeIndex >= 0) {
      current.splice(removeIndex, 1);
      setSelectedGiveGoods(current);
    }
  };

  const uiState = useMemo<JaipurBoardUiState | null>(() => {
    if (!engine || !G || !myPlayer) {
      return null;
    }

    return {
      canPlay,
      currentPlayerName,
      mySealCount: myPlayerID ? G.matchSeals[myPlayerID] : 0,
      rivalSealCount: G.matchSeals[myPlayerID === '0' ? '1' : '0'],
      selectedTakeIndices,
      selectedTakeGoods,
      selectedGiveGoods,
      selectedGiveCamels,
      myHandCounts,
      selectedGiveGoodsCounts,
      exchangeReady,
      onTakeMarketCard: (index) => {
        if (!canPlay) {
          return;
        }
        onSendMove({ type: 'takeSingleGood', args: [index] });
      },
      onToggleTakeIndex: toggleTakeIndex,
      onTakeAllCamels: () => {
        if (!canPlay) {
          return;
        }
        onSendMove({ type: 'takeAllCamels' });
      },
      onClearExchange: clearExchange,
      onCycleGiveCamels: () => {
        if (!myPlayer || !canPlay) {
          return;
        }
        setSelectedGiveCamels((current) => (current >= myPlayer.herdCount ? 0 : current + 1));
      },
      onToggleGiveGoods: toggleGiveGoods,
      onExecuteExchange: () => {
        if (!exchangeReady) {
          return;
        }

        onSendMove({
          type: 'exchangeGoods',
          args: [
            {
              takeIndices: selectedTakeIndices,
              giveGoods: selectedGiveGoods,
              giveCamels: selectedGiveCamels,
            },
          ],
        });
        clearExchange();
      },
      onSellGoods: (goodsType, sellCount) => {
        if (!canPlay) {
          return;
        }
        onSendMove({ type: 'sellGoods', args: [goodsType, sellCount] });
      },
    };
  }, [
    G,
    canPlay,
    currentPlayerName,
    engine,
    exchangeReady,
    myHandCounts,
    myPlayer,
    myPlayerID,
    onSendMove,
    selectedGiveCamels,
    selectedGiveGoods,
    selectedGiveGoodsCounts,
    selectedTakeGoods,
    selectedTakeIndices,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new JaipurPixiScene();
    sceneRef.current = scene;
    void scene.mount(container);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      scene.resize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && uiState) {
      sceneRef.current.update(snapshot, uiState);
    }
  }, [snapshot, uiState]);

  if (!engine || !G) {
    return null;
  }

  return (
    <section className="rounded-[32px] border border-[#d9c7a3] bg-[linear-gradient(160deg,#fffaf0_0%,#fff5e5_100%)] p-4 shadow-[0_24px_70px_rgba(59,35,10,0.12)]">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-[28px] bg-[#f3ead8]"
        style={{
          aspectRatio: `${JAIPUR_STAGE_WIDTH} / ${JAIPUR_STAGE_HEIGHT}`,
          minHeight: '640px',
        }}
      />
    </section>
  );
}
