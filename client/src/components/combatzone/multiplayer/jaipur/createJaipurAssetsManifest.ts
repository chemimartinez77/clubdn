import { Assets, type Texture } from 'pixi.js';

export type JaipurAssetKey =
  | 'board.table'
  | 'cards.camello'
  | 'cards.diamante'
  | 'cards.oro'
  | 'cards.plata'
  | 'cards.tela'
  | 'cards.especias'
  | 'cards.cuero';

interface JaipurAssetDefinition {
  alias: JaipurAssetKey;
  src: string;
}

const JAIPUR_ASSETS: JaipurAssetDefinition[] = [
  { alias: 'board.table', src: '/jaipur/fondos/mesa-base.png' },
  { alias: 'cards.camello', src: '/jaipur/cartas/camello.png' },
  { alias: 'cards.diamante', src: '/jaipur/cartas/diamante.png' },
  { alias: 'cards.oro', src: '/jaipur/cartas/oro.png' },
  { alias: 'cards.plata', src: '/jaipur/cartas/plata.png' },
  { alias: 'cards.tela', src: '/jaipur/cartas/tela.png' },
  { alias: 'cards.especias', src: '/jaipur/cartas/especias.png' },
  { alias: 'cards.cuero', src: '/jaipur/cartas/cuero.png' },
];

let assetsRegistered = false;
let texturesPromise: Promise<Record<JaipurAssetKey, Texture>> | null = null;

export function createJaipurAssetsManifest() {
  return JAIPUR_ASSETS;
}

export async function loadJaipurTextures() {
  if (!assetsRegistered) {
    Assets.add(createJaipurAssetsManifest());
    assetsRegistered = true;
  }

  if (!texturesPromise) {
    texturesPromise = (async () => {
      const entries = await Promise.all(
        JAIPUR_ASSETS.map(async ({ alias }) => {
          const texture = (await Assets.load(alias)) as Texture;
          return [alias, texture] as const;
        }),
      );

      return Object.fromEntries(entries) as Record<JaipurAssetKey, Texture>;
    })();
  }

  return texturesPromise;
}
