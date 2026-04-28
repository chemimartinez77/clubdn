export const JAIPUR_STAGE_WIDTH = 1292;
export const JAIPUR_STAGE_HEIGHT = 861;

export interface JaipurRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const JAIPUR_LAYOUT = {
  stage: {
    width: JAIPUR_STAGE_WIDTH,
    height: JAIPUR_STAGE_HEIGHT,
  },
  hud: {
    title: { x: 46, y: 28, width: 410, height: 96 },
    roundStat: { x: 930, y: 34, width: 118, height: 82 },
    deckStat: { x: 1064, y: 34, width: 118, height: 82 },
  },
  rivalPanel: { x: 46, y: 180, width: 210, height: 176 },
  marketPanel: { x: 274, y: 126, width: 584, height: 286 },
  marketSlots: [
    { x: 319, y: 214, width: 86, height: 124 },
    { x: 426, y: 214, width: 86, height: 124 },
    { x: 533, y: 214, width: 86, height: 124 },
    { x: 640, y: 214, width: 86, height: 124 },
    { x: 747, y: 214, width: 86, height: 124 },
  ] satisfies JaipurRect[],
  tokensPanel: { x: 912, y: 160, width: 318, height: 212 },
  playersPanel: { x: 912, y: 392, width: 318, height: 160 },
  syncPanel: { x: 912, y: 570, width: 318, height: 138 },
  actionBar: { x: 276, y: 426, width: 580, height: 164 },
  handPanel: { x: 46, y: 608, width: 818, height: 208 },
  handCardSlots: [
    { x: 74, y: 681, width: 82, height: 116 },
    { x: 166, y: 681, width: 82, height: 116 },
    { x: 258, y: 681, width: 82, height: 116 },
    { x: 350, y: 681, width: 82, height: 116 },
    { x: 442, y: 681, width: 82, height: 116 },
    { x: 520, y: 681, width: 82, height: 116 },
    { x: 608, y: 681, width: 82, height: 116 },
  ] satisfies JaipurRect[],
  sellPanel: { x: 610, y: 636, width: 226, height: 146 },
};
