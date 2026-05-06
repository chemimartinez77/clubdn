const SEGMENTS = [
  { start: 0.57, end: 1.19 },
  { start: 3.15, end: 3.46 },
  { start: 5.38, end: 5.65 },
  { start: 7.63, end: 7.99 },
  { start: 9.65, end: 10.02 },
  { start: 11.63, end: 11.95 },
  { start: 13.97, end: 14.33 },
  { start: 16.49, end: 16.72 },
  { start: 18.78, end: 19.08 },
  { start: 20.91, end: 21.07 },
  { start: 22.73, end: 23.07 },
];

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

async function loadBuffer(): Promise<void> {
  if (buffer || loading) return;
  loading = true;
  try {
    const res = await fetch('/lanzadados/347807__andresix__dice_rolls_15cm.wav');
    const arrayBuf = await res.arrayBuffer();
    buffer = await getCtx().decodeAudioData(arrayBuf);
  } catch {
    // audio not critical, fail silently
  } finally {
    loading = false;
  }
}

// Unlocks AudioContext on first user gesture (required on iOS Safari / some Android)
export function unlockAudio(): void {
  const context = getCtx();
  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }
  loadBuffer().catch(() => {});
}

export function playDiceHit(volume = 1): void {
  if (!buffer || !ctx || ctx.state !== 'running') return;
  const seg = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0, seg.start, seg.end - seg.start);
}
