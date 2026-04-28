import { useMemo, useState } from 'react';
import type {
  JaipurCardType,
  JaipurCtx,
  JaipurEngineState,
  JaipurGoodsType,
  MultiplayerMatchSnapshot,
} from '../../../types/multiplayer';

interface MatchMoveInput {
  type: string;
  args?: unknown[];
}

const GOODS_LABELS: Record<JaipurGoodsType, string> = {
  diamante: 'Diamantes',
  oro: 'Oro',
  plata: 'Plata',
  tela: 'Tela',
  especias: 'Especias',
  cuero: 'Cuero',
};

const GOODS_ACCENT_COLORS: Record<JaipurGoodsType, string> = {
  diamante: '#dc2626',
  oro: '#ca8a04',
  plata: '#64748b',
  tela: '#9333ea',
  especias: '#059669',
  cuero: '#92400e',
};

function getCardAsset(cardType: JaipurCardType) {
  return `/jaipur/cartas/${cardType}.png`;
}

function getGoodsTypeLabel(goodsType: JaipurGoodsType) {
  return GOODS_LABELS[goodsType];
}

function groupGoods(hand: JaipurGoodsType[]) {
  const counts: Record<JaipurGoodsType, number> = {
    diamante: 0,
    oro: 0,
    plata: 0,
    tela: 0,
    especias: 0,
    cuero: 0,
  };

  for (const goodsType of hand) {
    counts[goodsType] += 1;
  }

  return counts;
}

function sum(values: number[]) {
  return values.reduce((accumulator, value) => accumulator + value, 0);
}

function getRoundReasonText(reason: 'three-goods-depleted' | 'deck-empty-refill') {
  if (reason === 'three-goods-depleted') {
    return 'Se agotaron tres tipos de fichas';
  }

  return 'El mazo se agotó al reponer el mercado';
}

function SelectionChip({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-full border px-3 py-1 text-xs font-bold transition-all',
        active
          ? 'border-[#f59e0b] bg-[#fef3c7] text-[#92400e]'
          : 'border-white/30 bg-white/10 text-white hover:border-[#f8d89f]',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
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
  const engine = snapshot.engine;
  if (!engine) {
    return null;
  }

  const G = engine.G as JaipurEngineState;
  const ctx = engine.ctx as JaipurCtx;
  const myPlayerID = engine.playerID === '0' || engine.playerID === '1' ? engine.playerID : null;
  const myPlayer = myPlayerID ? G.players[myPlayerID] : null;
  const rivalPlayerID = myPlayerID === '0' ? '1' : '0';
  const rivalPlayer = G.players[rivalPlayerID];
  const canPlay = snapshot.match.status === 'ACTIVE' && engine.isYourTurn && !isSending && myPlayer !== null;

  const [selectedTakeIndices, setSelectedTakeIndices] = useState<number[]>([]);
  const [selectedGiveGoods, setSelectedGiveGoods] = useState<JaipurGoodsType[]>([]);
  const [selectedGiveCamels, setSelectedGiveCamels] = useState(0);

  const myHandCounts = useMemo(() => groupGoods(myPlayer?.hand ?? []), [myPlayer?.hand]);
  const selectedGiveGoodsCounts = useMemo(() => groupGoods(selectedGiveGoods), [selectedGiveGoods]);
  const selectedTakeGoods = selectedTakeIndices
    .map((index) => G.market[index])
    .filter((card): card is JaipurGoodsType => Boolean(card) && card !== 'camello');
  const selectedTakeTypes = new Set(selectedTakeGoods);
  const exchangeGiveTotal = selectedGiveGoods.length + selectedGiveCamels;
  const exchangeReady =
    canPlay &&
    selectedTakeIndices.length >= 2 &&
    exchangeGiveTotal === selectedTakeIndices.length &&
    selectedGiveCamels <= (myPlayer?.herdCount ?? 0) &&
    selectedGiveGoods.every((goodsType) => !selectedTakeTypes.has(goodsType)) &&
    selectedTakeIndices.every((index) => {
      const card = G.market[index];
      return card !== undefined && card !== 'camello';
    });

  const lastRoundSummary = G.lastRoundSummary;
  const currentPlayerName =
    snapshot.match.players.find((player) => String(player.playerIndex) === ctx.currentPlayer)?.nick ||
    snapshot.match.players.find((player) => String(player.playerIndex) === ctx.currentPlayer)?.name ||
    'Rival';

  const clearExchange = () => {
    setSelectedTakeIndices([]);
    setSelectedGiveGoods([]);
    setSelectedGiveCamels(0);
  };

  const toggleTakeIndex = (index: number) => {
    if (!canPlay) return;
    const card = G.market[index];
    if (!card || card === 'camello') return;

    setSelectedTakeIndices((current) =>
      current.includes(index) ? current.filter((entry) => entry !== index) : [...current, index].sort((a, b) => a - b),
    );
  };

  const toggleGiveGoods = (goodsType: JaipurGoodsType) => {
    if (!canPlay || !myPlayer) return;

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

  const mySealCount = myPlayerID ? G.matchSeals[myPlayerID] : 0;
  const rivalSealCount = G.matchSeals[rivalPlayerID];

  return (
    <section
      className="overflow-hidden rounded-[36px] border border-[#d6b57c] shadow-[0_30px_90px_rgba(39,19,6,0.32)]"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(31, 23, 18, 0.18), rgba(31, 23, 18, 0.65)), url(/jaipur/fondos/mesa-base.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-[radial-gradient(circle_at_top,#ffffff30_0%,transparent_60%)] p-6 text-white md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f8deb0]">Bazar en directo</p>
            <h2 className="mt-2 text-3xl font-black text-[#fff7e8]">
              {snapshot.match.status === 'FINISHED'
                ? 'Partida completada'
                : canPlay
                  ? 'Tu turno en el mercado'
                  : `Turno de ${currentPlayerName}`}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f7e7ca]">
              Reúne mercancías valiosas, controla tu rebaño y fuerza el ritmo de la ronda cuando el mercado te favorezca.
            </p>
          </div>

          <div className="grid gap-3 text-right sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/15 bg-[#1f140ecc] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Ronda</p>
              <p className="mt-1 text-2xl font-black text-[#fff7e8]">{G.roundNumber}</p>
            </div>
            <div className="rounded-[24px] border border-white/15 bg-[#1f140ecc] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Mazo</p>
              <p className="mt-1 text-2xl font-black text-[#fff7e8]">{G.deck.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.4fr_1fr]">
          <div className="rounded-[30px] border border-white/12 bg-[#1d120dd8] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Rival</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] bg-white/8 px-4 py-3">
                <p className="text-lg font-black text-[#fff3de]">{rivalPlayer.handSize} cartas en mano</p>
                <p className="mt-1 text-sm text-[#ead6b4]">{rivalPlayer.herdCount} camellos en el rebaño</p>
              </div>
              <div className="rounded-[22px] bg-white/8 px-4 py-3 text-sm text-[#ead6b4]">
                <p>Sellos: {rivalSealCount}</p>
                <p>Rupias visibles: {sum(rivalPlayer.goodsTokenValuesWon) + sum(rivalPlayer.bonusTokenValuesWon)}</p>
                <p>Bonos ganados: {rivalPlayer.bonusTokenValuesWon.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/12 bg-[#20150ee0] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Mercado</p>
                <h3 className="mt-1 text-2xl font-black text-[#fff7e8]">Cinco puestos, cero margen para regalar tempo</h3>
              </div>
              <button
                type="button"
                onClick={() => onSendMove({ type: 'takeAllCamels' })}
                disabled={!canPlay || !G.market.includes('camello')}
                className="rounded-full border border-[#e4bd75] bg-[#f5c660] px-4 py-2 text-sm font-black text-[#43240b] shadow-[0_12px_24px_rgba(245,198,96,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Recoger camellos
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {G.market.map((card, index) => {
                const isSelected = selectedTakeIndices.includes(index);
                return (
                  <button
                    key={`${card}-${index}`}
                    type="button"
                    onClick={() => {
                      if (selectedTakeIndices.length > 0) {
                        toggleTakeIndex(index);
                        return;
                      }

                      if (!canPlay || card === 'camello') return;
                      onSendMove({ type: 'takeSingleGood', args: [index] });
                    }}
                    disabled={!canPlay && selectedTakeIndices.length === 0}
                    className={[
                      'group overflow-hidden rounded-[24px] border transition-all duration-200',
                      isSelected ? 'border-[#f3c16f] shadow-[0_0_0_3px_rgba(243,193,111,0.2)]' : 'border-white/10',
                    ].join(' ')}
                  >
                    <div className="relative aspect-[0.74] bg-black/20">
                      <img
                        src={getCardAsset(card)}
                        alt={card === 'camello' ? 'Camello' : getGoodsTypeLabel(card)}
                        className="h-full w-full object-cover"
                      />
                      {card === 'camello' && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#2d1a0ecc] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f6d6a3]">
                          Camello
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute inset-x-3 bottom-3 rounded-full bg-[#f5c660] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#43240b]">
                          Intercambio
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#fff3de]">Modo intercambio</p>
                  <p className="text-xs leading-5 text-[#ead6b4]">
                    Marca dos o más mercancías del mercado y compénsalas con cartas de tu mano o camellos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearExchange}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-[#f8deb0]"
                >
                  Limpiar selección
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTakeGoods.length === 0 ? (
                  <span className="text-xs text-[#ead6b4]">Todavía no has marcado mercancías del mercado.</span>
                ) : (
                  selectedTakeGoods.map((goodsType, index) => (
                    <span
                      key={`${goodsType}-${index}`}
                      className="rounded-full px-3 py-1 text-xs font-black"
                      style={{ backgroundColor: `${GOODS_ACCENT_COLORS[goodsType]}33`, color: '#fff7e8' }}
                    >
                      {getGoodsTypeLabel(goodsType)}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SelectionChip
                  label={`Camellos: ${selectedGiveCamels}`}
                  active={selectedGiveCamels > 0}
                  disabled={!canPlay || (myPlayer?.herdCount ?? 0) === 0}
                  onClick={() => {
                    if (!myPlayer) return;
                    setSelectedGiveCamels((current) => (current >= myPlayer.herdCount ? 0 : current + 1));
                  }}
                />
                {Object.entries(myHandCounts).map(([goodsType, count]) => {
                  const key = goodsType as JaipurGoodsType;
                  const selectedCount = selectedGiveGoodsCounts[key];
                  return (
                    <SelectionChip
                      key={key}
                      label={`${getGoodsTypeLabel(key)} ${selectedCount}/${count}`}
                      active={selectedCount > 0}
                      disabled={!canPlay || count === 0}
                      onClick={() => toggleGiveGoods(key)}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
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
                }}
                disabled={!exchangeReady}
                className="mt-5 rounded-full bg-[#0f766e] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(15,118,110,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ejecutar intercambio
              </button>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/12 bg-[#1d120dd8] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Estado de ronda</p>
            <div className="mt-4 space-y-3 text-sm text-[#ead6b4]">
              <div className="rounded-[22px] bg-white/8 px-4 py-3">
                <p className="font-bold text-[#fff3de]">Tus sellos: {mySealCount}</p>
                <p>Camellos propios: {myPlayer?.herdCount ?? 0}</p>
                <p>Rupias visibles: {sum(myPlayer?.goodsTokenValuesWon ?? []) + sum(myPlayer?.bonusTokenValuesWon ?? [])}</p>
              </div>
              <div className="rounded-[22px] bg-white/8 px-4 py-3">
                <p className="font-bold text-[#fff3de]">Fichas restantes</p>
                {Object.entries(G.goodsTokens).map(([goodsType, values]) => (
                  <div key={goodsType} className="mt-2 flex items-center justify-between gap-3">
                    <span>{getGoodsTypeLabel(goodsType as JaipurGoodsType)}</span>
                    <span className="font-black text-[#fff3de]">
                      {values.length} {values[0] ? `· valor superior ${values[0]}` : '· agotadas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-white/12 bg-[#1a100be6] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Tu mano privada</p>
              <h3 className="mt-1 text-xl font-black text-[#fff7e8]">Mercancías listas para vender o intercambiar</h3>
            </div>
            <div className="text-right text-sm text-[#ead6b4]">
              <p>{myPlayer?.hand.length ?? 0}/7 cartas en mano</p>
              <p>{myPlayer?.bonusTokenValuesWon.length ?? 0} bonos ganados</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {(myPlayer?.hand ?? []).map((goodsType, index) => (
                <div key={`${goodsType}-${index}`} className="overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
                  <img
                    src={getCardAsset(goodsType)}
                    alt={getGoodsTypeLabel(goodsType)}
                    className="aspect-[0.74] h-full w-full object-cover"
                  />
                </div>
              ))}
              {(myPlayer?.hand ?? []).length === 0 && (
                <div className="col-span-full rounded-[24px] border border-dashed border-white/20 px-4 py-8 text-center text-sm text-[#ead6b4]">
                  No tienes cartas en mano en este momento.
                </div>
              )}
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-bold text-[#fff3de]">Vender mercancías</p>
              <div className="mt-4 space-y-3">
                {Object.entries(myHandCounts).map(([goodsType, count]) => {
                  const typedGoods = goodsType as JaipurGoodsType;
                  if (count === 0) return null;

                  const minSell = ['diamante', 'oro', 'plata'].includes(goodsType) ? 2 : 1;
                  const validCounts = Array.from({ length: count - minSell + 1 }, (_, index) => minSell + index);

                  return (
                    <div key={goodsType} className="rounded-[20px] bg-black/10 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-[#fff7e8]">{getGoodsTypeLabel(typedGoods)}</p>
                          <p className="text-xs text-[#ead6b4]">{count} cartas disponibles</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {validCounts.map((sellCount) => (
                            <button
                              key={sellCount}
                              type="button"
                              onClick={() => onSendMove({ type: 'sellGoods', args: [typedGoods, sellCount] })}
                              disabled={!canPlay}
                              className="rounded-full border border-[#e4bd75] bg-[#f5c660] px-3 py-1 text-xs font-black text-[#43240b] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Vender {sellCount}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {lastRoundSummary && (
          <div className="mt-6 rounded-[28px] border border-[#f0d2a0]/40 bg-[#2f1b10ea] p-5 text-[#fbe8c4]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d8b582]">Última ronda resuelta</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-lg font-black text-[#fff7e8]">Ronda {lastRoundSummary.roundNumber}</p>
                <p className="mt-1 text-sm">{getRoundReasonText(lastRoundSummary.reason)}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#fff7e8]">Ganador</p>
                <p className="mt-1 text-sm">
                  {lastRoundSummary.winnerPlayerID === null
                    ? 'Empate técnico'
                    : snapshot.match.players.find(
                        (player) => String(player.playerIndex) === lastRoundSummary.winnerPlayerID,
                      )?.nick ||
                      snapshot.match.players.find(
                        (player) => String(player.playerIndex) === lastRoundSummary.winnerPlayerID,
                      )?.name ||
                      'Jugador'}
                </p>
                <p className="mt-1 text-xs">Criterio: {lastRoundSummary.winnerBy}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#fff7e8]">Rupias</p>
                <p className="mt-1 text-sm">
                  J1 {lastRoundSummary.totals['0']} · J2 {lastRoundSummary.totals['1']}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#fff7e8]">Sellos acumulados</p>
                <p className="mt-1 text-sm">
                  J1 {lastRoundSummary.seals['0']} · J2 {lastRoundSummary.seals['1']}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

