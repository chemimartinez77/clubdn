import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import type {
  JaipurCardType,
  JaipurEngineState,
  JaipurGoodsType,
  MultiplayerMatchSnapshot,
} from '../../../../types/multiplayer';
import { loadJaipurTextures, type JaipurAssetKey } from './createJaipurAssetsManifest';
import { JAIPUR_LAYOUT, JAIPUR_STAGE_HEIGHT, JAIPUR_STAGE_WIDTH, type JaipurRect } from './layout';

export interface JaipurBoardUiState {
  canPlay: boolean;
  currentPlayerName: string;
  mySealCount: number;
  rivalSealCount: number;
  selectedTakeIndices: number[];
  selectedTakeGoods: JaipurGoodsType[];
  selectedGiveGoods: JaipurGoodsType[];
  selectedGiveCamels: number;
  myHandCounts: Record<JaipurGoodsType, number>;
  selectedGiveGoodsCounts: Record<JaipurGoodsType, number>;
  exchangeReady: boolean;
  onTakeMarketCard: (index: number) => void;
  onToggleTakeIndex: (index: number) => void;
  onTakeAllCamels: () => void;
  onClearExchange: () => void;
  onCycleGiveCamels: () => void;
  onToggleGiveGoods: (goodsType: JaipurGoodsType) => void;
  onExecuteExchange: () => void;
  onSellGoods: (goodsType: JaipurGoodsType, sellCount: number) => void;
}

const GOODS_LABELS: Record<JaipurGoodsType, string> = {
  diamante: 'Diamantes',
  oro: 'Oro',
  plata: 'Plata',
  tela: 'Tela',
  especias: 'Especias',
  cuero: 'Cuero',
};

const GOODS_COLORS: Record<JaipurGoodsType, number> = {
  diamante: 0xd9485f,
  oro: 0xc9931c,
  plata: 0x7b8794,
  tela: 0x8b5cf6,
  especias: 0x0f9d76,
  cuero: 0x9a5b2a,
};

const TEXT_DARK = 0x22170d;
const TEXT_SOFT = 0x6d5438;
const TEXT_MUTED = 0x8b5e22;
const PANEL_FILL = 0xfffaef;
const PANEL_STROKE = 0xddc89e;
const BUTTON_GOLD = 0xf5c660;
const BUTTON_GOLD_TEXT = 0x43240b;
const BUTTON_TEAL = 0x0f766e;
const BUTTON_TEAL_TEXT = 0xffffff;
const BUTTON_LINE = 0xd6b57c;
const BUTTON_DISABLED_ALPHA = 0.45;
const SHADOW_GLOW = 0xf3c16f;
const CARD_GLOW = 0x8b5e22;
const DEBUG_STROKE = 0x0f172a;
const DEBUG_FILL = 0x38bdf8;
const DEBUG_TEXT = 0x082f49;

function sum(values: number[]) {
  return values.reduce((accumulator, value) => accumulator + value, 0);
}

function getGoodsTypeLabel(goodsType: JaipurGoodsType) {
  return GOODS_LABELS[goodsType];
}

function getCardAssetKey(cardType: JaipurCardType): JaipurAssetKey {
  return `cards.${cardType}` as JaipurAssetKey;
}

function createPanel(rect: JaipurRect, alpha = 0.92, radius = 24) {
  return new Graphics()
    .roundRect(rect.x, rect.y, rect.width, rect.height, radius)
    .fill({ color: PANEL_FILL, alpha })
    .stroke({ color: PANEL_STROKE, width: 2 });
}

function createGlowRect(rect: JaipurRect, color: number, alpha = 0.14, radius = 26) {
  return new Graphics().roundRect(rect.x, rect.y, rect.width, rect.height, radius).fill({ color, alpha });
}

function createText(
  text: string,
  x: number,
  y: number,
  options?: {
    fontSize?: number;
    fontWeight?: '400' | '700';
    fill?: number;
    wordWrapWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
  },
) {
  const textNode = new Text({
    text,
    style: {
      fill: options?.fill ?? TEXT_DARK,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: options?.fontSize ?? 16,
      fontWeight: options?.fontWeight ?? '400',
      wordWrap: Boolean(options?.wordWrapWidth),
      wordWrapWidth: options?.wordWrapWidth,
      lineHeight: options?.lineHeight,
      letterSpacing: options?.letterSpacing ?? 0,
    },
  });

  textNode.x = x;
  textNode.y = y;

  return textNode;
}

function createButton(
  rect: JaipurRect,
  label: string,
  options: {
    fill?: number;
    textColor?: number;
    borderColor?: number;
    disabled?: boolean;
    onTap?: () => void;
    fontSize?: number;
  },
) {
  const container = new Container();
  const graphics = new Graphics()
    .roundRect(rect.x, rect.y, rect.width, rect.height, rect.height / 2)
    .fill({ color: options.fill ?? PANEL_FILL, alpha: options.disabled ? BUTTON_DISABLED_ALPHA : 1 })
    .stroke({ color: options.borderColor ?? BUTTON_LINE, width: 2 });

  container.addChild(graphics);

  const buttonLabel = createText(label, rect.x + 14, rect.y + 10, {
    fontSize: options.fontSize ?? 14,
    fontWeight: '700',
    fill: options.textColor ?? TEXT_DARK,
    wordWrapWidth: rect.width - 28,
    lineHeight: 16,
  });

  buttonLabel.x = rect.x + (rect.width - buttonLabel.width) / 2;
  buttonLabel.y = rect.y + (rect.height - buttonLabel.height) / 2;
  container.addChild(buttonLabel);

  if (!options.disabled && options.onTap) {
    graphics.eventMode = 'static';
    graphics.cursor = 'pointer';
    graphics.on('pointertap', () => options.onTap?.());
    graphics.on('pointerover', () => {
      container.alpha = 0.92;
    });
    graphics.on('pointerout', () => {
      container.alpha = 1;
    });
  }

  return container;
}

function createBulletRow(label: string, value: string, x: number, y: number, width: number) {
  const container = new Container();
  const left = createText(label, x, y, { fontSize: 13, fill: TEXT_SOFT });
  const right = createText(value, x + width, y, { fontSize: 13, fontWeight: '700' });
  right.x = x + width - right.width;
  container.addChild(left, right);
  return container;
}

function isJaipurLayoutDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const debugParam = params.get('jaipurDebug');
  return debugParam === '1' || debugParam === 'true';
}

function createDebugRect(rect: JaipurRect, label: string) {
  const container = new Container();
  const overlay = new Graphics()
    .roundRect(rect.x, rect.y, rect.width, rect.height, 12)
    .fill({ color: DEBUG_FILL, alpha: 0.12 })
    .stroke({ color: DEBUG_STROKE, width: 2 });

  const textNode = createText(label, rect.x + 8, rect.y + 6, {
    fontSize: 10,
    fontWeight: '700',
    fill: DEBUG_TEXT,
    wordWrapWidth: Math.max(48, rect.width - 16),
    lineHeight: 12,
  });

  container.addChild(overlay, textNode);
  return container;
}

function clearContainer(container: Container) {
  const children = container.removeChildren();
  for (const child of children) {
    child.destroy();
  }
}

export class JaipurPixiScene {
  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private mounted = false;
  private destroyed = false;
  private textures: Record<JaipurAssetKey, Texture> | null = null;
  private resizeTarget = { width: 0, height: 0 };
  private pendingSnapshot: MultiplayerMatchSnapshot | null = null;
  private pendingUiState: JaipurBoardUiState | null = null;
  private readonly debugLayout = isJaipurLayoutDebugEnabled();

  private readonly rootContainer = new Container();
  private readonly tableContainer = new Container();
  private readonly hudContainer = new Container();
  private readonly marketContainer = new Container();
  private readonly rivalContainer = new Container();
  private readonly playerContainer = new Container();
  private readonly tokensContainer = new Container();
  private readonly overlayContainer = new Container();

  async mount(container: HTMLElement) {
    if (this.mounted || this.destroyed) {
      return;
    }

    this.host = container;
    this.mounted = true;

    const app = new Application();
    await app.init({
      width: JAIPUR_STAGE_WIDTH,
      height: JAIPUR_STAGE_HEIGHT,
      antialias: true,
      autoDensity: true,
      resolution: globalThis.devicePixelRatio || 1,
      backgroundAlpha: 0,
      preference: 'webgl',
    });

    if (this.destroyed || !this.host) {
      app.destroy(true);
      return;
    }

    this.app = app;
    this.host.appendChild(app.canvas as HTMLCanvasElement);
    app.stage.addChild(this.rootContainer);

    this.rootContainer.addChild(
      this.tableContainer,
      this.hudContainer,
      this.marketContainer,
      this.rivalContainer,
      this.playerContainer,
      this.tokensContainer,
      this.overlayContainer,
    );

    this.textures = await loadJaipurTextures();

    if (this.destroyed) {
      return;
    }

    this.resize(this.resizeTarget.width || container.clientWidth, this.resizeTarget.height || container.clientHeight);

    if (this.pendingSnapshot && this.pendingUiState) {
      this.render(this.pendingSnapshot, this.pendingUiState);
    }
  }

  update(snapshot: MultiplayerMatchSnapshot, uiState: JaipurBoardUiState) {
    this.pendingSnapshot = snapshot;
    this.pendingUiState = uiState;

    if (!this.app || !this.textures) {
      return;
    }

    this.render(snapshot, uiState);
  }

  resize(width: number, height: number) {
    this.resizeTarget = { width, height };

    if (!this.app) {
      return;
    }

    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    this.app.renderer.resize(safeWidth, safeHeight);

    const scale = Math.min(safeWidth / JAIPUR_STAGE_WIDTH, safeHeight / JAIPUR_STAGE_HEIGHT);
    const offsetX = (safeWidth - JAIPUR_STAGE_WIDTH * scale) / 2;
    const offsetY = (safeHeight - JAIPUR_STAGE_HEIGHT * scale) / 2;

    this.rootContainer.scale.set(scale);
    this.rootContainer.position.set(offsetX, offsetY);
  }

  destroy() {
    this.destroyed = true;
    this.mounted = false;
    this.pendingSnapshot = null;
    this.pendingUiState = null;
    this.host = null;

    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  private render(snapshot: MultiplayerMatchSnapshot, uiState: JaipurBoardUiState) {
    const engine = snapshot.engine;
    if (!engine || !this.textures) {
      return;
    }

    const G = engine.G as JaipurEngineState;
    const myPlayerID = engine.playerID === '0' || engine.playerID === '1' ? engine.playerID : null;
    const myPlayer = myPlayerID ? G.players[myPlayerID] : null;
    const rivalPlayer = G.players[myPlayerID === '0' ? '1' : '0'];

    clearContainer(this.tableContainer);
    clearContainer(this.hudContainer);
    clearContainer(this.marketContainer);
    clearContainer(this.rivalContainer);
    clearContainer(this.playerContainer);
    clearContainer(this.tokensContainer);
    clearContainer(this.overlayContainer);

    this.renderTable();
    this.renderHud(snapshot, uiState, G);
    this.renderRival(rivalPlayer, uiState);
    this.renderMarket(snapshot, uiState, G.market);
    this.renderTokens(myPlayer, G, uiState);
    this.renderPlayers(snapshot, myPlayerID);
    this.renderSync(snapshot);
    this.renderActionBar(uiState);
    this.renderPlayerArea(myPlayer, uiState);

    if (this.debugLayout) {
      this.renderDebugLayout();
    }
  }

  private renderTable() {
    const table = new Sprite(this.textures!['board.table']);
    table.width = JAIPUR_STAGE_WIDTH;
    table.height = JAIPUR_STAGE_HEIGHT;
    this.tableContainer.addChild(table);

    const veil = new Graphics()
      .rect(0, 0, JAIPUR_STAGE_WIDTH, JAIPUR_STAGE_HEIGHT)
      .fill({ color: 0xfffbf2, alpha: 0.09 });

    this.tableContainer.addChild(veil);
  }

  private renderHud(snapshot: MultiplayerMatchSnapshot, uiState: JaipurBoardUiState, G: JaipurEngineState) {
    const titleRect = JAIPUR_LAYOUT.hud.title;
    const status =
      snapshot.match.status === 'FINISHED'
        ? 'Partida completada'
        : uiState.canPlay
          ? 'Tu turno en el mercado'
          : `Turno de ${uiState.currentPlayerName}`;

    this.hudContainer.addChild(createPanel(titleRect, 0.88));
    this.hudContainer.addChild(
      createText('Bazar en directo', titleRect.x + 24, titleRect.y + 20, {
        fontSize: 13,
        fill: TEXT_MUTED,
        letterSpacing: 3,
      }),
      createText(status, titleRect.x + 24, titleRect.y + 44, {
        fontSize: 28,
        fontWeight: '700',
        wordWrapWidth: titleRect.width - 48,
        lineHeight: 30,
      }),
    );

    this.hudContainer.addChild(createPanel(JAIPUR_LAYOUT.hud.roundStat, 0.9));
    this.hudContainer.addChild(createPanel(JAIPUR_LAYOUT.hud.deckStat, 0.9));
    this.hudContainer.addChild(
      createText('Ronda', JAIPUR_LAYOUT.hud.roundStat.x + 22, JAIPUR_LAYOUT.hud.roundStat.y + 14, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText(String(G.roundNumber), JAIPUR_LAYOUT.hud.roundStat.x + 42, JAIPUR_LAYOUT.hud.roundStat.y + 34, {
        fontSize: 30,
        fontWeight: '700',
      }),
      createText('Mazo', JAIPUR_LAYOUT.hud.deckStat.x + 24, JAIPUR_LAYOUT.hud.deckStat.y + 14, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText(String(G.deck.length), JAIPUR_LAYOUT.hud.deckStat.x + 38, JAIPUR_LAYOUT.hud.deckStat.y + 34, {
        fontSize: 30,
        fontWeight: '700',
      }),
    );
  }

  private renderRival(rivalPlayer: JaipurEngineState['players']['0'], uiState: JaipurBoardUiState) {
    const panel = JAIPUR_LAYOUT.rivalPanel;
    this.rivalContainer.addChild(createPanel(panel, 0.82));
    this.rivalContainer.addChild(
      createText('Rival', panel.x + 18, panel.y + 16, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText(`${rivalPlayer.handSize} cartas en mano`, panel.x + 18, panel.y + 46, {
        fontSize: 22,
        fontWeight: '700',
      }),
      createText(`${rivalPlayer.herdCount} camellos en el rebaño`, panel.x + 18, panel.y + 82, {
        fontSize: 14,
        fill: TEXT_SOFT,
      }),
      createText(`Sellos: ${uiState.rivalSealCount}`, panel.x + 18, panel.y + 118, {
        fontSize: 13,
        fill: TEXT_SOFT,
      }),
      createText(`Rupias visibles: ${sum(rivalPlayer.goodsTokenValuesWon) + sum(rivalPlayer.bonusTokenValuesWon)}`, panel.x + 18, panel.y + 138, {
        fontSize: 13,
        fill: TEXT_SOFT,
      }),
      createText(`Bonos ganados: ${rivalPlayer.bonusTokenValuesWon.length}`, panel.x + 18, panel.y + 158, {
        fontSize: 13,
        fill: TEXT_SOFT,
      }),
    );
  }

  private renderMarket(_snapshot: MultiplayerMatchSnapshot, uiState: JaipurBoardUiState, market: JaipurCardType[]) {
    market.forEach((card, index) => {
      const slot = JAIPUR_LAYOUT.marketSlots[index];
      const isSelected = uiState.selectedTakeIndices.includes(index);
      const cardContainer = new Container();

      if (isSelected) {
        cardContainer.addChild(
          createGlowRect(
            { x: slot.x - 12, y: slot.y - 12, width: slot.width + 24, height: slot.height + 24 },
            SHADOW_GLOW,
            0.22,
            24,
          ),
        );
      }

      const hitArea = new Graphics().rect(slot.x, slot.y, slot.width, slot.height).fill({ color: 0xffffff, alpha: 0.001 });
      hitArea.eventMode = 'static';
      hitArea.cursor = uiState.canPlay && (card !== 'camello' || uiState.selectedTakeIndices.length > 0) ? 'pointer' : 'default';
      hitArea.on('pointertap', () => {
        if (uiState.selectedTakeIndices.length > 0) {
          uiState.onToggleTakeIndex(index);
          return;
        }

        if (!uiState.canPlay || card === 'camello') {
          return;
        }

        uiState.onTakeMarketCard(index);
      });

      const sprite = new Sprite(this.textures![getCardAssetKey(card)]);
      sprite.x = slot.x;
      sprite.y = slot.y;
      sprite.width = slot.width;
      sprite.height = slot.height;
      sprite.alpha = uiState.selectedTakeIndices.length > 0 && !isSelected ? 0.82 : 1;

      cardContainer.addChild(sprite, hitArea);

      if (card === 'camello') {
        cardContainer.addChild(
          createButton(
            { x: slot.x + 10, y: slot.y + 10, width: 66, height: 24 },
            'Camello',
            {
              fill: 0x2d1a0e,
              textColor: 0xf6d6a3,
              borderColor: 0x2d1a0e,
              fontSize: 11,
              disabled: true,
            },
          ),
        );
      }

      if (isSelected) {
        cardContainer.addChild(
          createButton(
            { x: slot.x + 10, y: slot.y + slot.height - 34, width: slot.width - 20, height: 24 },
            'Intercambio',
            {
              fill: BUTTON_GOLD,
              textColor: BUTTON_GOLD_TEXT,
              borderColor: BUTTON_GOLD,
              fontSize: 11,
              disabled: true,
            },
          ),
        );
      }

      this.marketContainer.addChild(cardContainer);
    });
  }

  private renderTokens(
    myPlayer: JaipurEngineState['players']['0'] | null,
    G: JaipurEngineState,
    uiState: JaipurBoardUiState,
  ) {
    const panel = JAIPUR_LAYOUT.tokensPanel;
    this.tokensContainer.addChild(createPanel(panel, 0.68));
    this.tokensContainer.addChild(
      createText('Estado de ronda', panel.x + 18, panel.y + 16, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText(`Tus sellos: ${uiState.mySealCount}`, panel.x + 18, panel.y + 42, {
        fontSize: 18,
        fontWeight: '700',
      }),
      createText(`Camellos propios: ${myPlayer?.herdCount ?? 0}`, panel.x + 18, panel.y + 68, {
        fontSize: 13,
        fill: TEXT_SOFT,
      }),
      createText(
        `Rupias visibles: ${sum(myPlayer?.goodsTokenValuesWon ?? []) + sum(myPlayer?.bonusTokenValuesWon ?? [])}`,
        panel.x + 18,
        panel.y + 87,
        {
          fontSize: 13,
          fill: TEXT_SOFT,
        },
      ),
    );

    let rowY = panel.y + 118;
    for (const [goodsType, values] of Object.entries(G.goodsTokens)) {
      this.tokensContainer.addChild(
        createBulletRow(
          getGoodsTypeLabel(goodsType as JaipurGoodsType),
          `${values.length} · ${values[0] ?? 0}`,
          panel.x + 18,
          rowY,
          panel.width - 36,
        ),
      );
      rowY += 17;
    }
  }

  private renderPlayers(snapshot: MultiplayerMatchSnapshot, myPlayerID: '0' | '1' | null) {
    const panel = JAIPUR_LAYOUT.playersPanel;
    this.overlayContainer.addChild(createPanel(panel, 0.66));
    this.overlayContainer.addChild(
      createText('Jugadores', panel.x + 18, panel.y + 16, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
    );

    snapshot.match.players.forEach((player, index) => {
      const rowRect = {
        x: panel.x + 16,
        y: panel.y + 38 + index * 54,
        width: panel.width - 32,
        height: 44,
      };

      this.overlayContainer.addChild(createPanel(rowRect, 0.9, 22));
      this.overlayContainer.addChild(
        createText(
          `${player.nick || player.name}${String(player.playerIndex) === myPlayerID ? ' (tú)' : ''}`,
          rowRect.x + 16,
          rowRect.y + 9,
          { fontSize: 15, fontWeight: '700' },
        ),
        createText(
          `Plaza ${player.playerIndex + 1}${player.isOwner ? ' · creador' : ''}`,
          rowRect.x + 16,
          rowRect.y + 26,
          { fontSize: 11, fill: TEXT_SOFT },
        ),
      );

      this.overlayContainer.addChild(
        createButton(
          { x: rowRect.x + rowRect.width - 48, y: rowRect.y + 8, width: 32, height: 24 },
          `J${player.playerIndex + 1}`,
          {
            fill: 0xeef2ff,
            textColor: 0x334155,
            borderColor: 0xeef2ff,
            disabled: true,
            fontSize: 11,
          },
        ),
      );
    });
  }

  private renderSync(snapshot: MultiplayerMatchSnapshot) {
    const panel = JAIPUR_LAYOUT.syncPanel;
    this.overlayContainer.addChild(createPanel(panel, 0.64));
    this.overlayContainer.addChild(
      createText('Estado de sincronización', panel.x + 18, panel.y + 16, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText('La mesa recibe snapshots del servidor por SSE y valida cada movimiento en backend.', panel.x + 18, panel.y + 42, {
        fontSize: 12,
        fill: TEXT_SOFT,
        wordWrapWidth: panel.width - 36,
        lineHeight: 16,
      }),
      createText('Si recargas la página, el cliente pide el estado actual y reengancha el canal automáticamente.', panel.x + 18, panel.y + 80, {
        fontSize: 12,
        fill: TEXT_SOFT,
        wordWrapWidth: panel.width - 36,
        lineHeight: 16,
      }),
      createText(`Versión de estado: #${snapshot.engine?.stateId ?? 0}`, panel.x + 18, panel.y + 112, {
        fontSize: 14,
        fontWeight: '700',
      }),
    );
  }

  private renderActionBar(uiState: JaipurBoardUiState) {
    const panel = JAIPUR_LAYOUT.actionBar;
    this.overlayContainer.addChild(createPanel(panel, 0.92));
    this.overlayContainer.addChild(
      createText('Modo intercambio', panel.x + 18, panel.y + 14, {
        fontSize: 16,
        fontWeight: '700',
      }),
      createText('Marca mercancías del mercado y compénsalas con cartas de tu mano o camellos.', panel.x + 18, panel.y + 38, {
        fontSize: 12,
        fill: TEXT_SOFT,
        wordWrapWidth: 280,
        lineHeight: 16,
      }),
    );

    this.overlayContainer.addChild(
      createButton(
        { x: panel.x + panel.width - 236, y: panel.y + 16, width: 108, height: 34 },
        'Recoger camellos',
        {
          fill: BUTTON_GOLD,
          textColor: BUTTON_GOLD_TEXT,
          borderColor: BUTTON_GOLD,
          disabled: !uiState.canPlay,
          onTap: uiState.onTakeAllCamels,
          fontSize: 12,
        },
      ),
      createButton(
        { x: panel.x + panel.width - 118, y: panel.y + 16, width: 98, height: 34 },
        'Limpiar',
        {
          borderColor: BUTTON_LINE,
          disabled: false,
          onTap: uiState.onClearExchange,
          fontSize: 12,
        },
      ),
    );

    const chipsY = panel.y + 84;
    let chipX = panel.x + 18;

    const addChip = (label: string, active: boolean, disabled: boolean, onTap: () => void, fill?: number) => {
      const width = Math.max(90, Math.min(136, label.length * 7 + 26));
      const chip = createButton(
        { x: chipX, y: chipsY, width, height: 30 },
        label,
        {
          fill: active ? fill ?? BUTTON_GOLD : 0xfff8ea,
          textColor: active ? BUTTON_TEAL_TEXT : TEXT_SOFT,
          borderColor: active ? fill ?? BUTTON_GOLD : BUTTON_LINE,
          disabled,
          onTap,
          fontSize: 11,
        },
      );
      this.overlayContainer.addChild(chip);
      chipX += width + 8;
    };

    addChip(
      `Camellos: ${uiState.selectedGiveCamels}`,
      uiState.selectedGiveCamels > 0,
      !uiState.canPlay,
      uiState.onCycleGiveCamels,
    );

    (Object.keys(uiState.myHandCounts) as JaipurGoodsType[]).forEach((goodsType) => {
      const count = uiState.myHandCounts[goodsType];
      const selected = uiState.selectedGiveGoodsCounts[goodsType];
      addChip(
        `${getGoodsTypeLabel(goodsType)} ${selected}/${count}`,
        selected > 0,
        !uiState.canPlay || count === 0,
        () => uiState.onToggleGiveGoods(goodsType),
        GOODS_COLORS[goodsType],
      );
    });

    const selectedGoodsText =
      uiState.selectedTakeGoods.length > 0
        ? uiState.selectedTakeGoods.map((goodsType) => getGoodsTypeLabel(goodsType)).join(' · ')
        : 'Todavía no has marcado mercancías del mercado.';

    this.overlayContainer.addChild(
      createText(selectedGoodsText, panel.x + 18, panel.y + 128, {
        fontSize: 12,
        fill: TEXT_SOFT,
        wordWrapWidth: 390,
      }),
      createButton(
        { x: panel.x + panel.width - 192, y: panel.y + 118, width: 170, height: 34 },
        'Ejecutar intercambio',
        {
          fill: BUTTON_TEAL,
          textColor: BUTTON_TEAL_TEXT,
          borderColor: BUTTON_TEAL,
          disabled: !uiState.exchangeReady,
          onTap: uiState.onExecuteExchange,
          fontSize: 12,
        },
      ),
    );
  }

  private renderPlayerArea(
    myPlayer: JaipurEngineState['players']['0'] | null,
    uiState: JaipurBoardUiState,
  ) {
    const handPanel = JAIPUR_LAYOUT.handPanel;
    const sellPanel = JAIPUR_LAYOUT.sellPanel;
    this.playerContainer.addChild(createPanel(handPanel, 0.84));
    this.playerContainer.addChild(createPanel(sellPanel, 0.96));

    this.playerContainer.addChild(
      createText('Tu mano privada', handPanel.x + 20, handPanel.y + 18, {
        fontSize: 12,
        fill: TEXT_MUTED,
        letterSpacing: 2,
      }),
      createText('Mercancías listas para vender o intercambiar', handPanel.x + 20, handPanel.y + 40, {
        fontSize: 22,
        fontWeight: '700',
        wordWrapWidth: 330,
        lineHeight: 26,
      }),
      createText(`${myPlayer?.hand.length ?? 0}/7 cartas en mano`, handPanel.x + 392, handPanel.y + 26, {
        fontSize: 14,
        fill: TEXT_SOFT,
      }),
      createText(`${myPlayer?.bonusTokenValuesWon.length ?? 0} bonos ganados`, handPanel.x + 392, handPanel.y + 48, {
        fontSize: 14,
        fill: TEXT_SOFT,
      }),
    );

    const hand = myPlayer?.hand ?? [];
    JAIPUR_LAYOUT.handCardSlots.forEach((slot, index) => {
      if (hand[index]) {
        this.playerContainer.addChild(
          createGlowRect(
            { x: slot.x - 8, y: slot.y - 8, width: slot.width + 16, height: slot.height + 16 },
            CARD_GLOW,
            0.08,
            22,
          ),
        );
      }

      const frame = new Graphics()
        .roundRect(slot.x - 4, slot.y - 4, slot.width + 8, slot.height + 8, 18)
        .fill({ color: 0xfff5e4, alpha: hand[index] ? 0.95 : 0.5 })
        .stroke({ color: 0xe7d7bc, width: 2 });
      this.playerContainer.addChild(frame);

      const goodsType = hand[index];
      if (goodsType) {
        const sprite = new Sprite(this.textures![getCardAssetKey(goodsType)]);
        sprite.x = slot.x;
        sprite.y = slot.y;
        sprite.width = slot.width;
        sprite.height = slot.height;
        this.playerContainer.addChild(sprite);
      }
    });

    this.playerContainer.addChild(
      createText('Vender mercancías', sellPanel.x + 18, sellPanel.y + 14, {
        fontSize: 16,
        fontWeight: '700',
      }),
    );

    let sellY = sellPanel.y + 40;
    (Object.keys(uiState.myHandCounts) as JaipurGoodsType[]).forEach((goodsType) => {
      const count = uiState.myHandCounts[goodsType];
      if (count === 0) {
        return;
      }

      const minSell = ['diamante', 'oro', 'plata'].includes(goodsType) ? 2 : 1;
      const validCounts = Array.from({ length: count - minSell + 1 }, (_, index) => minSell + index);

      this.playerContainer.addChild(
        createText(getGoodsTypeLabel(goodsType), sellPanel.x + 18, sellY, {
          fontSize: 13,
          fontWeight: '700',
        }),
        createText(`${count} cartas disponibles`, sellPanel.x + 18, sellY + 18, {
          fontSize: 11,
          fill: TEXT_SOFT,
        }),
      );

      let buttonX = sellPanel.x + 128;
      validCounts.forEach((sellCount) => {
        const button = createButton(
          { x: buttonX, y: sellY + 2, width: 42, height: 24 },
          `V${sellCount}`,
          {
            fill: BUTTON_GOLD,
            textColor: BUTTON_GOLD_TEXT,
            borderColor: BUTTON_GOLD,
            disabled: !uiState.canPlay,
            onTap: () => uiState.onSellGoods(goodsType, sellCount),
            fontSize: 10,
          },
        );
        this.playerContainer.addChild(button);
        buttonX += 46;
      });

      sellY += 38;
    });
  }

  private renderDebugLayout() {
    const debugRects: Array<{ label: string; rect: JaipurRect }> = [
      { label: 'hud.title', rect: JAIPUR_LAYOUT.hud.title },
      { label: 'hud.roundStat', rect: JAIPUR_LAYOUT.hud.roundStat },
      { label: 'hud.deckStat', rect: JAIPUR_LAYOUT.hud.deckStat },
      { label: 'rivalPanel', rect: JAIPUR_LAYOUT.rivalPanel },
      { label: 'tokensPanel', rect: JAIPUR_LAYOUT.tokensPanel },
      { label: 'playersPanel', rect: JAIPUR_LAYOUT.playersPanel },
      { label: 'syncPanel', rect: JAIPUR_LAYOUT.syncPanel },
      { label: 'actionBar', rect: JAIPUR_LAYOUT.actionBar },
      { label: 'handPanel', rect: JAIPUR_LAYOUT.handPanel },
      { label: 'sellPanel', rect: JAIPUR_LAYOUT.sellPanel },
    ];

    debugRects.forEach(({ label, rect }) => {
      this.overlayContainer.addChild(createDebugRect(rect, label));
    });

    JAIPUR_LAYOUT.marketSlots.forEach((rect, index) => {
      this.overlayContainer.addChild(createDebugRect(rect, `marketSlots[${index}]`));
    });

    JAIPUR_LAYOUT.handCardSlots.forEach((rect, index) => {
      this.overlayContainer.addChild(createDebugRect(rect, `handCardSlots[${index}]`));
    });
  }
}
