import { useEffect, useRef, useState } from 'react';

type Mushroom = { x: number; y: number; hp: number };
type Bullet = { x: number; y: number };
type Segment = { x: number; y: number; dir: 1 | -1 };
type Spider = { x: number; y: number; vx: number; vy: number };

type InputState = {
  left: boolean;
  right: boolean;
  fire: boolean;
};

type RuntimeState = {
  score: number;
  level: number;
  lives: number;
  playerX: number;
  mushrooms: Map<string, Mushroom>;
  bullets: Bullet[];
  segments: Segment[];
  spider: Spider | null;
  running: boolean;
  gameOver: boolean;
  shootCooldown: number;
  moveAccumulator: number;
  spiderTimer: number;
  invulnerableTimer: number;
};

type HudState = {
  score: number;
  level: number;
  lives: number;
  running: boolean;
  gameOver: boolean;
};

const COLS = 30;
const ROWS = 36;
const CELL = 20;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const PLAYER_ROW = ROWS - 2;
const PLAYER_SPEED = 12;
const BULLET_SPEED = 27;
const HIGH_SCORE_KEY = 'combatzone-centipede-high-score';

function keyOf(x: number, y: number): string {
  return `${x}:${y}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function centipedeLength(level: number): number {
  return clamp(10 + level, 10, 24);
}

function movementInterval(level: number): number {
  return Math.max(0.06, 0.18 - (level - 1) * 0.01);
}

function createSegments(level: number): Segment[] {
  const len = centipedeLength(level);
  const segments: Segment[] = [];
  for (let i = 0; i < len; i += 1) {
    segments.push({ x: i, y: 0, dir: 1 });
  }
  return segments;
}

function addRandomMushrooms(map: Map<string, Mushroom>, amount: number): void {
  let placed = 0;
  let guard = 0;
  while (placed < amount && guard < amount * 40) {
    guard += 1;
    const x = randomInt(0, COLS - 1);
    const y = randomInt(3, ROWS - 6);
    const key = keyOf(x, y);
    if (map.has(key)) continue;
    map.set(key, { x, y, hp: 4 });
    placed += 1;
  }
}

function createRuntime(level = 1, score = 0, lives = 3): RuntimeState {
  const mushrooms = new Map<string, Mushroom>();
  addRandomMushrooms(mushrooms, 42);
  return {
    score,
    level,
    lives,
    playerX: Math.floor(COLS / 2),
    mushrooms,
    bullets: [],
    segments: createSegments(level),
    spider: null,
    running: true,
    gameOver: false,
    shootCooldown: 0,
    moveAccumulator: 0,
    spiderTimer: randomInt(5, 9),
    invulnerableTimer: 0,
  };
}

function loseLife(state: RuntimeState): void {
  state.lives -= 1;
  state.playerX = Math.floor(COLS / 2);
  state.bullets = [];
  state.spider = null;
  state.invulnerableTimer = 1.5;

  if (state.lives <= 0) {
    state.running = false;
    state.gameOver = true;
  }
}

function nextLevel(state: RuntimeState): void {
  state.level += 1;
  state.score += 100;
  state.bullets = [];
  state.spider = null;
  state.shootCooldown = 0;
  state.moveAccumulator = 0;
  state.spiderTimer = randomInt(4, 8);
  state.segments = createSegments(state.level);
  addRandomMushrooms(state.mushrooms, 4 + state.level);
}

function updateCentipede(state: RuntimeState, dt: number): void {
  state.moveAccumulator += dt;
  const step = movementInterval(state.level);

  while (state.moveAccumulator >= step) {
    state.moveAccumulator -= step;
    for (let i = 0; i < state.segments.length; i += 1) {
      const seg = state.segments[i];
      const nextX = seg.x + seg.dir;
      const blocked = nextX < 0 || nextX >= COLS || state.mushrooms.has(keyOf(nextX, seg.y));
      if (blocked) {
        seg.y += 1;
        seg.dir = seg.dir === 1 ? -1 : 1;
      } else {
        seg.x = nextX;
      }
    }
  }
}

function updateSpider(state: RuntimeState, dt: number): void {
  state.spiderTimer -= dt;
  if (!state.spider && state.spiderTimer <= 0) {
    const fromLeft = Math.random() > 0.5;
    const speed = 5 + Math.random() * 2.5;
    state.spider = {
      x: fromLeft ? -1 : COLS,
      y: randomInt(ROWS - 12, ROWS - 5),
      vx: fromLeft ? speed : -speed,
      vy: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
    };
    state.spiderTimer = randomInt(9, 14);
  }

  if (!state.spider) return;

  state.spider.x += state.spider.vx * dt;
  state.spider.y += state.spider.vy * dt;

  if (state.spider.y < ROWS - 13) {
    state.spider.y = ROWS - 13;
    state.spider.vy *= -1;
  }
  if (state.spider.y > ROWS - 3) {
    state.spider.y = ROWS - 3;
    state.spider.vy *= -1;
  }

  if (state.spider.x < -2 || state.spider.x > COLS + 2) {
    state.spider = null;
  }
}

function updatePlayer(state: RuntimeState, input: InputState, dt: number): void {
  const move = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const prev = state.playerX;
  state.playerX = clamp(state.playerX + move * PLAYER_SPEED * dt, 0, COLS - 1);

  const roundedX = Math.round(state.playerX);
  if (state.mushrooms.has(keyOf(roundedX, PLAYER_ROW))) {
    state.playerX = prev;
  }

  state.shootCooldown -= dt;
  if (input.fire && state.shootCooldown <= 0 && state.bullets.length < 4) {
    state.bullets.push({ x: Math.round(state.playerX), y: PLAYER_ROW - 0.8 });
    state.shootCooldown = 0.14;
  }
}

function updateBullets(state: RuntimeState, dt: number): void {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.y -= BULLET_SPEED * dt;

    if (bullet.y < -1) {
      state.bullets.splice(i, 1);
      continue;
    }

    const bx = Math.round(bullet.x);
    const by = Math.round(bullet.y);
    const mushroomKey = keyOf(bx, by);
    const mushroom = state.mushrooms.get(mushroomKey);
    if (mushroom) {
      mushroom.hp -= 1;
      if (mushroom.hp <= 0) {
        state.mushrooms.delete(mushroomKey);
        state.score += 2;
      } else {
        state.mushrooms.set(mushroomKey, mushroom);
      }
      state.bullets.splice(i, 1);
      continue;
    }

    const segIndex = state.segments.findIndex(
      (seg) => Math.abs(seg.x - bullet.x) < 0.45 && Math.abs(seg.y - bullet.y) < 0.45
    );
    if (segIndex >= 0) {
      const hit = state.segments[segIndex];
      state.segments.splice(segIndex, 1);
      const hitX = Math.round(hit.x);
      const hitY = Math.round(hit.y);
      state.mushrooms.set(keyOf(hitX, hitY), { x: hitX, y: hitY, hp: 4 });
      state.score += 10;
      state.bullets.splice(i, 1);
      continue;
    }

    if (state.spider) {
      const hitSpider =
        Math.abs(state.spider.x - bullet.x) < 0.8 && Math.abs(state.spider.y - bullet.y) < 0.8;
      if (hitSpider) {
        state.spider = null;
        state.score += 50;
        state.bullets.splice(i, 1);
      }
    }
  }
}

function resolveCollisions(state: RuntimeState): void {
  if (state.invulnerableTimer > 0) return;

  const hitSegment = state.segments.some(
    (seg) => Math.abs(seg.y - PLAYER_ROW) < 0.6 && Math.abs(seg.x - state.playerX) < 0.6
  );
  if (hitSegment) {
    loseLife(state);
    return;
  }

  if (state.spider) {
    const hitSpider =
      Math.abs(state.spider.y - PLAYER_ROW) < 0.8 && Math.abs(state.spider.x - state.playerX) < 0.8;
    if (hitSpider) loseLife(state);
  }
}

function updateGame(state: RuntimeState, input: InputState, dt: number): void {
  if (!state.running || state.gameOver) return;

  const safeDt = Math.min(dt, 0.05);
  if (state.invulnerableTimer > 0) {
    state.invulnerableTimer = Math.max(0, state.invulnerableTimer - safeDt);
  }

  updatePlayer(state, input, safeDt);
  updateCentipede(state, safeDt);
  updateSpider(state, safeDt);
  updateBullets(state, safeDt);
  resolveCollisions(state);

  if (state.segments.length === 0 && !state.gameOver) {
    nextLevel(state);
  }
}

function drawGame(ctx: CanvasRenderingContext2D, state: RuntimeState): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#070b12';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const mushroom of state.mushrooms.values()) {
    const x = mushroom.x * CELL;
    const y = mushroom.y * CELL;
    const hp = mushroom.hp;
    ctx.fillStyle = hp >= 3 ? '#7c3aed' : hp === 2 ? '#a855f7' : '#d8b4fe';
    ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(x + 7, y + 2, CELL - 14, 4);
  }

  state.segments.forEach((seg, index) => {
    const x = seg.x * CELL + CELL / 2;
    const y = seg.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? '#ef4444' : '#22c55e';
    ctx.fill();
    ctx.closePath();
  });

  for (const bullet of state.bullets) {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bullet.x * CELL + CELL * 0.42, bullet.y * CELL - 6, 4, 12);
  }

  if (state.spider) {
    const cx = state.spider.x * CELL + CELL / 2;
    const cy = state.spider.y * CELL + CELL / 2;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(cx, cy, CELL * 0.55, CELL * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  const canDrawPlayer = state.invulnerableTimer <= 0 || Math.floor(state.invulnerableTimer * 12) % 2 === 0;
  if (canDrawPlayer) {
    const px = state.playerX * CELL + CELL / 2;
    const py = PLAYER_ROW * CELL + CELL / 2;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(px, py - CELL * 0.55);
    ctx.lineTo(px - CELL * 0.5, py + CELL * 0.45);
    ctx.lineTo(px + CELL * 0.5, py + CELL * 0.45);
    ctx.closePath();
    ctx.fill();
  }
}

export default function CentipedeBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, fire: false });
  const runtimeRef = useRef<RuntimeState>(createRuntime());

  const [hud, setHud] = useState<HudState>({
    score: 0,
    level: 1,
    lives: 3,
    running: true,
    gameOver: false,
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = true;
      if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = true;
      if (event.code === 'Space') inputRef.current.fire = true;
      if (event.code === 'KeyP') {
        runtimeRef.current.running = !runtimeRef.current.running;
      }
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = false;
      if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = false;
      if (event.code === 'Space') inputRef.current.fire = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let previous = performance.now();
    let hudTimer = 0;

    const loop = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      const runtime = runtimeRef.current;
      updateGame(runtime, inputRef.current, dt);
      drawGame(ctx, runtime);

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setHud({
          score: runtime.score,
          level: runtime.level,
          lives: runtime.lives,
          running: runtime.running,
          gameOver: runtime.gameOver,
        });

        if (runtime.score > highScore) {
          setHighScore(runtime.score);
          localStorage.setItem(HIGH_SCORE_KEY, String(runtime.score));
        }
      }

      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [highScore]);

  const restart = () => {
    inputRef.current = { left: false, right: false, fire: false };
    runtimeRef.current = createRuntime();
    setHud({
      score: 0,
      level: 1,
      lives: 3,
      running: true,
      gameOver: false,
    });
  };

  const togglePause = () => {
    const runtime = runtimeRef.current;
    if (runtime.gameOver) return;
    runtime.running = !runtime.running;
    setHud((prev) => ({ ...prev, running: runtime.running }));
  };

  const setMobileInput = (key: keyof InputState, value: boolean) => {
    inputRef.current[key] = value;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-700 bg-gray-900 text-gray-100 p-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Score: {hud.score}</div>
        <div className="text-sm">High: {highScore}</div>
        <div className="text-sm">Level: {hud.level}</div>
        <div className="text-sm">Lives: {hud.lives}</div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-black p-2 sm:p-4">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="w-full h-auto rounded-md border border-gray-800 bg-black"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={restart}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Reiniciar
        </button>
        <button
          onClick={togglePause}
          className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 transition-colors"
        >
          {hud.running ? 'Pausar' : 'Reanudar'}
        </button>
        {hud.gameOver && (
          <div className="px-3 py-2 rounded-lg bg-red-900/60 text-red-200 text-sm">
            Game Over
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <button
          onPointerDown={() => setMobileInput('left', true)}
          onPointerUp={() => setMobileInput('left', false)}
          onPointerCancel={() => setMobileInput('left', false)}
          onPointerLeave={() => setMobileInput('left', false)}
          className="rounded-lg bg-gray-800 text-gray-100 py-3 font-semibold"
        >
          ←
        </button>
        <button
          onPointerDown={() => setMobileInput('fire', true)}
          onPointerUp={() => setMobileInput('fire', false)}
          onPointerCancel={() => setMobileInput('fire', false)}
          onPointerLeave={() => setMobileInput('fire', false)}
          className="rounded-lg bg-amber-600 text-black py-3 font-semibold"
        >
          FIRE
        </button>
        <button
          onPointerDown={() => setMobileInput('right', true)}
          onPointerUp={() => setMobileInput('right', false)}
          onPointerCancel={() => setMobileInput('right', false)}
          onPointerLeave={() => setMobileInput('right', false)}
          className="rounded-lg bg-gray-800 text-gray-100 py-3 font-semibold"
        >
          →
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Controles: <span className="font-semibold">A/D</span> o <span className="font-semibold">←/→</span> para mover,
        <span className="font-semibold"> Espacio</span> para disparar y <span className="font-semibold">P</span> para pausar.
      </p>
    </div>
  );
}
