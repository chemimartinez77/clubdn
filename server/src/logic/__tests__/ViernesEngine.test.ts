import {
  applyAction,
  calculateFightTotal,
  createInitialState,
  type HazardCard,
  type PirateCard,
  type RobinsonCard,
  type ViernesGameState,
} from '../ViernesEngine';

function makeHazard(id: string, danger: number, freeCards = 1): HazardCard {
  return {
    id,
    name: `Hazard ${id}`,
    skillName: `Skill ${id}`,
    hazardGreen: danger,
    hazardYellow: danger + 1,
    hazardRed: danger + 2,
    freeCards,
    survivorValue: 1,
    imageFile: 'test.png',
  };
}

function makePirates(): PirateCard[] {
  return [
    { id: 'pir-1', name: 'Pirata Viejo', fightValue: 4, freeCards: 1 },
    { id: 'pir-2', name: 'Capitan Pirata', fightValue: 5, freeCards: 1 },
  ];
}

function makeBaseState(overrides: Partial<ViernesGameState> = {}): ViernesGameState {
  return {
    difficulty: 1,
    step: 'GREEN',
    lifePoints: 20,
    maxLifePoints: 22,
    robinsonDeck: [],
    robinsonDiscard: [],
    reshuffleCount: 0,
    hazardDeck: [],
    hazardDone: [],
    hazardClearCount: 0,
    revealedHazards: null,
    agingDeck: [],
    agingDiscard: [],
    pirates: makePirates(),
    pirateIndex: -1,
    currentFight: null,
    destroyedCards: [],
    phase: 'HAZARD_CHOOSE',
    won: null,
    ...overrides,
  };
}

describe('ViernesEngine', () => {
  it('configura la vida inicial y el envejecimiento por dificultad', () => {
    const level1 = createInitialState(1);
    const level2 = createInitialState(2);
    const level3 = createInitialState(3);
    const level4 = createInitialState(4);

    expect(level1.lifePoints).toBe(20);
    expect(level1.maxLifePoints).toBe(22);
    expect(level1.robinsonDeck).toHaveLength(18);

    expect(level2.lifePoints).toBe(20);
    expect(level2.robinsonDeck).toHaveLength(19);
    expect(level2.robinsonDeck.filter((card) => card.type === 'AGING')).toHaveLength(1);
    expect(level2.agingDeck).toHaveLength(level1.agingDeck.length - 1);

    expect(level3.lifePoints).toBe(20);
    expect(level3.robinsonDeck).toHaveLength(19);
    expect(level3.robinsonDeck.filter((card) => card.type === 'AGING')).toHaveLength(1);
    expect(level3.agingDeck.length).toBeGreaterThan(level2.agingDeck.length);

    expect(level4.lifePoints).toBe(18);
    expect(level4.maxLifePoints).toBe(22);
  });

  it('aplica el efecto de envejecimiento carta mas alta igual a cero', () => {
    const cards: RobinsonCard[] = [
      { id: 'c1', type: 'GENIUS', name: 'Genial', value: 2 },
      { id: 'c2', type: 'SATISFIED', name: 'Concentrado', value: 1 },
      { id: 'c3', type: 'AGING', name: 'Asustado', value: 0, agingEffect: 'HIGHEST_ZERO' },
    ];

    expect(calculateFightTotal(cards)).toBe(1);
  });

  it('manda el peligro no elegido al descarte y el ganado al mazo de Robinson', () => {
    const chosenHazard = makeHazard('chosen', 2, 1);
    const discardedHazard = makeHazard('discarded', 4, 1);
    const state = makeBaseState({
      robinsonDeck: [{ id: 'rob-1', type: 'GENIUS', name: 'Genial', value: 2 }],
      revealedHazards: [chosenHazard, discardedHazard],
    });

    const chooseResult = applyAction(state, { type: 'CHOOSE_HAZARD', hazardIndex: 0 });
    expect(chooseResult.success).toBe(true);
    expect(chooseResult.newState?.hazardDone).toEqual([discardedHazard]);

    const resolveResult = applyAction(chooseResult.newState as ViernesGameState, { type: 'RESOLVE_FIGHT' });
    expect(resolveResult.success).toBe(true);
    expect(resolveResult.newState?.robinsonDiscard.some((card) => card.type === 'HAZARD_WON')).toBe(true);
    expect(resolveResult.newState?.hazardDone.some((card) => card.id === chosenHazard.id)).toBe(false);
  });

  it('permite descartar el ultimo peligro y avanzar de paso', () => {
    const soloHazard = makeHazard('solo', 2, 1);
    const state = makeBaseState({
      revealedHazards: [soloHazard, soloHazard],
    });

    const result = applyAction(state, { type: 'SKIP_SINGLE_HAZARD' });

    expect(result.success).toBe(true);
    expect(result.newState?.step).toBe('YELLOW');
    expect(result.newState?.phase).toBe('HAZARD_CHOOSE');
    expect(result.newState?.revealedHazards?.[0].id).toBe(soloHazard.id);
    expect(result.newState?.revealedHazards?.[1].id).toBe(soloHazard.id);
  });

  it('entra en fase de derrota y limita la destruccion al presupuesto disponible', () => {
    const hazard = makeHazard('loss', 3, 0);
    const agingCard: RobinsonCard = {
      id: 'age-1',
      type: 'AGING',
      name: 'Hambriento',
      value: -1,
      agingEffect: 'MINUS_1',
    };
    const normalCard: RobinsonCard = {
      id: 'rob-0',
      type: 'MISFORTUNE',
      name: 'Normal',
      value: 0,
    };
    const state = makeBaseState({
      phase: 'HAZARD_FIGHT',
      currentFight: {
        hazardCard: hazard,
        pirateCard: null,
        hazardValue: 3,
        freeCards: 0,
        freeCardsDrawn: 0,
        isPirateFight: false,
        drawnCards: [agingCard, normalCard],
        extraCardsBought: 0,
        stoppedByAging: false,
        lossDestructionPoints: 0,
      },
      lifePoints: 10,
    });

    const loseResult = applyAction(state, { type: 'RESOLVE_FIGHT' });
    expect(loseResult.success).toBe(true);
    expect(loseResult.newState?.phase).toBe('HAZARD_DEFEAT');
    expect(loseResult.newState?.lifePoints).toBe(5);
    expect(loseResult.newState?.currentFight?.lossDestructionPoints).toBe(4);

    const destroyAging = applyAction(loseResult.newState as ViernesGameState, {
      type: 'DESTROY_CARD',
      cardId: agingCard.id,
    });
    expect(destroyAging.newState?.currentFight?.lossDestructionPoints).toBe(2);

    const destroyNormal = applyAction(destroyAging.newState as ViernesGameState, {
      type: 'DESTROY_CARD',
      cardId: normalCard.id,
    });
    expect(destroyNormal.newState?.currentFight?.lossDestructionPoints).toBe(1);
    expect(destroyNormal.newState?.destroyedCards).toHaveLength(2);

    const confirm = applyAction(destroyNormal.newState as ViernesGameState, { type: 'CONFIRM_DEFEAT' });
    expect(confirm.success).toBe(true);
    expect(confirm.newState?.phase).toBe('HAZARD_CHOOSE');
  });

  it('no permite resolver un combate pirata mientras sigues perdiendo', () => {
    const state = makeBaseState({
      phase: 'PIRATE_FIGHT',
      currentFight: {
        hazardCard: null,
        pirateCard: makePirates()[0],
        hazardValue: 4,
        freeCards: 1,
        freeCardsDrawn: 1,
        isPirateFight: true,
        drawnCards: [{ id: 'rob-1', type: 'MISFORTUNE', name: 'Normal', value: 0 }],
        extraCardsBought: 0,
        stoppedByAging: false,
        lossDestructionPoints: 0,
      },
    });

    const result = applyAction(state, { type: 'RESOLVE_FIGHT' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('piratas');
  });
});
