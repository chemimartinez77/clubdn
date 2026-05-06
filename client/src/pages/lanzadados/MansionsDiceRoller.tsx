import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { unlockAudio, playDiceHit } from './diceAudio';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Layout del atlas 2x1 (1 imagen, 4 columnas × 2 filas):
//   Fila 1 (top, V=0.5→1.0): [Estrella] [Vacío]    [Estrella] [Vacío]
//   Fila 2 (bot, V=0  →0.5): [Llave]    [Estrella] [Llave]    [Vacío]
// Caras del octaedro 0..7 mapeadas en orden lectura del atlas:
//   0=success  1=blank  2=success  3=blank
//   4=clue     5=success 6=clue   7=blank
const FACE_TYPES = ['success', 'blank', 'success', 'blank', 'clue', 'success', 'clue', 'blank'] as const;
type FaceType = typeof FACE_TYPES[number];

interface DiceResult {
  type: FaceType;
  label: string;
}

function getFaceResult(faceIndex: number): DiceResult {
  const type = FACE_TYPES[faceIndex % 8];
  return {
    type,
    label: { success: 'Exito', clue: 'Pista', blank: 'Vacio' }[type],
  };
}

// Mapeo UV rectangular escalado al 80% dentro de cada celda del atlas 4×2.
// Los vértices del triángulo apuntan a posiciones dentro de la celda escaladas
// desde el centro, dejando un margen del 10% por lado. El fondo del atlas (#950908)
// cubre el área exterior al triángulo sin dejar artefactos de color.
// Caras impares se rotan 180° para que el símbolo quede de pie al mirar hacia arriba.
function remapOctahedronUVs(geometry: THREE.BufferGeometry): void {
  const COLS = 4;
  const ROWS = 2;
  const cW = 1 / COLS;
  const cH = 1 / ROWS;

  const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
  const totalFaces = uvAttr.count / 3;

  for (let face = 0; face < totalFaces; face++) {
    const col = face % COLS;
    const row = Math.floor(face / COLS);
    // Esquina inf-izq de la celda destino en UV
    const cellU = col * cW;
    const cellV = 1 - (row + 1) * cH;
    // Centro de la celda destino
    const cU = cellU + 0.5 * cW;
    const cV = cellV + 0.5 * cH;

    const base = face * 3;

    // Leer UVs originales de Three.js para esta cara
    const ou: number[] = [], ov: number[] = [];
    for (let v = 0; v < 3; v++) {
      ou.push(uvAttr.getX(base + v));
      ov.push(uvAttr.getY(base + v));
    }

    // Centroide de las UVs originales
    const origCU = (ou[0] + ou[1] + ou[2]) / 3;
    const origCV = (ov[0] + ov[1] + ov[2]) / 3;

    // Escalar cada vértice desde el centroide original hacia el centro de la celda destino
    // Las lupas (clue) son más verticales y caben mejor con scale menor
    const faceType = FACE_TYPES[face];
    const SCALE = faceType === 'clue' ? 0.75 : 0.85;
    for (let v = 0; v < 3; v++) {
      const u = cU + (ou[v] - origCU) * SCALE;
      const vv = cV + (ov[v] - origCV) * SCALE;
      uvAttr.setXY(base + v, u, vv);
    }
  }
  uvAttr.needsUpdate = true;
}

function getTopFaceIndex(quaternion: CANNON.Quaternion, faceNormals: THREE.Vector3[]): number {
  const q = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  const up = new THREE.Vector3(0, 1, 0);
  let bestFace = 0;
  let bestDot = -Infinity;
  faceNormals.forEach((normal, i) => {
    const dot = normal.clone().applyQuaternion(q).dot(up);
    if (dot > bestDot) { bestDot = dot; bestFace = i; }
  });
  return bestFace;
}

function buildOctahedronCannon(radius: number): CANNON.ConvexPolyhedron {
  const r = radius;
  return new CANNON.ConvexPolyhedron({
    vertices: [
      new CANNON.Vec3(r, 0, 0),
      new CANNON.Vec3(-r, 0, 0),
      new CANNON.Vec3(0, r, 0),
      new CANNON.Vec3(0, -r, 0),
      new CANNON.Vec3(0, 0, r),
      new CANNON.Vec3(0, 0, -r),
    ],
    faces: [
      [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
      [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2],
    ],
  });
}

// Layout de las 8 caras del dado (índice = cara Three.js 0..7)
// null = cara vacía (solo fondo rojo)
type SymbolKey = 'star1' | 'star2' | 'clue1' | 'clue2' | null;
const FACE_SYMBOLS: SymbolKey[] = [
  'star1', null, 'star2', null,
  'clue1', 'star1', 'clue2', null,
];

// Genera un atlas 2048×1024 (4 cols × 2 filas, 512×512 por celda)
// con los símbolos centrados al SYMBOL_SCALE sobre fondo rojo #950908.
async function buildAtlasFromSymbols(): Promise<THREE.CanvasTexture> {
  const SYMBOL_SCALE = 0.40;
  const CELL = 512;
  const COLS = 4;
  const ROWS = 2;
  const BG = '#950908';

  const imgs = await Promise.all([
    loadImage('/lanzadados/star1.png'),
    loadImage('/lanzadados/star2.png'),
    loadImage('/lanzadados/clue1.png'),
    loadImage('/lanzadados/clue2.png'),
  ]);
  const symbolMap: Record<NonNullable<SymbolKey>, HTMLImageElement> = {
    star1: imgs[0], star2: imgs[1], clue1: imgs[2], clue2: imgs[3],
  };

  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * ROWS;
  const ctx = canvas.getContext('2d')!;

  const maxSize = Math.round(CELL * SYMBOL_SCALE);

  for (let face = 0; face < 8; face++) {
    const col = face % COLS;
    const row = Math.floor(face / COLS);
    const destX = col * CELL;
    const destY = row * CELL;

    ctx.fillStyle = BG;
    ctx.fillRect(destX, destY, CELL, CELL);

    const sym = FACE_SYMBOLS[face];
    if (sym) {
      const img = symbolMap[sym];
      // Preservar aspect ratio: escalar para que quepa en maxSize×maxSize
      const aspect = img.naturalWidth / img.naturalHeight;
      let dw: number, dh: number;
      if (aspect >= 1) {
        dw = maxSize;
        dh = Math.round(maxSize / aspect);
      } else {
        dh = maxSize;
        dw = Math.round(maxSize * aspect);
      }
      const dx = destX + Math.round((CELL - dw) / 2);
      const dy = destY + Math.round((CELL - dh) / 2);
      const isClue = sym === 'clue1' || sym === 'clue2';
      if (isClue) {
        ctx.save();
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const RADIUS = 0.7;

interface DicePair {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  body: CANNON.Body;
  settled: boolean;
}

interface DiceEngine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: CANNON.World;
  faceNormals: THREE.Vector3[];
  material: THREE.MeshStandardMaterial;
  geo: THREE.BufferGeometry;
  dice: DicePair[];
  rafId: number;
  settleTimer: ReturnType<typeof setTimeout> | null;
  rolling: boolean;
  onResults: (r: DiceResult[]) => void;
  onRollingChange: (r: boolean) => void;
}

const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true });

const COLLISION_COOLDOWN_MS = 80;
const COLLISION_VELOCITY_THRESHOLD = 0.5;

function createDicePair(
  scene: THREE.Scene,
  world: CANNON.World,
  geo: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
): DicePair {
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  scene.add(mesh);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMaterial);
  mesh.add(edges);

  const diceMat = new CANNON.Material({ friction: 0.3, restitution: 0.7 });
  const body = new CANNON.Body({ mass: 1, material: diceMat });
  body.addShape(buildOctahedronCannon(RADIUS));
  body.linearDamping = 0.1;
  body.angularDamping = 0.1;
  world.addBody(body);

  let lastHit = 0;
  body.addEventListener('collide', (e: { contact: CANNON.ContactEquation }) => {
    const impact = e.contact.getImpactVelocityAlongNormal();
    if (Math.abs(impact) < COLLISION_VELOCITY_THRESHOLD) return;
    const now = performance.now();
    if (now - lastHit < COLLISION_COOLDOWN_MS) return;
    lastHit = now;
    const vol = Math.min(1, Math.abs(impact) / 10);
    playDiceHit(vol);
  });

  return { mesh, edges, body, settled: false };
}

function removeDicePair(pair: DicePair, scene: THREE.Scene, world: CANNON.World) {
  scene.remove(pair.mesh);
  world.removeBody(pair.body);
}

function createEngine(
  container: HTMLDivElement,
  texture: THREE.Texture,
  onResults: (r: DiceResult[]) => void,
  onRollingChange: (r: boolean) => void,
): DiceEngine {
  const W = container.clientWidth;
  const H = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a0a00');

  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
  camera.position.set(0, 7, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xfff0e0, 1.4);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  scene.add(dir);
  const pt = new THREE.PointLight(0xff4400, 0.8, 20);
  pt.position.set(-3, 4, 3);
  scene.add(pt);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: '#2a1200', roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();
  (world.solver as CANNON.GSSolver).iterations = 20;

  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Paredes físicas invisibles — coinciden con los bordes visuales
  const wallDefs: Array<[number, number, number, number, number, number]> = [
    [-4, 1, 0, 0,  Math.PI / 2, 0],
    [ 4, 1, 0, 0, -Math.PI / 2, 0],
    [ 0, 1, -3, 0, 0, 0],
    [ 0, 1,  3, 0, Math.PI, 0],
  ];
  wallDefs.forEach(([px, py, pz, rx, ry, rz]) => {
    const b = new CANNON.Body({ mass: 0 });
    b.addShape(new CANNON.Plane());
    b.position.set(px, py, pz);
    b.quaternion.setFromEuler(rx, ry, rz);
    world.addBody(b);
  });

  // Bordes visuales de la mesa — madera oscura
  const railMat = new THREE.MeshStandardMaterial({ color: '#3b1a08', roughness: 0.8, metalness: 0.1 });
  const railH = 1.2;  // altura del borde
  const railT = 0.25; // grosor
  const tableW = 8;   // anchura total (X: -4 a +4)
  const tableD = 6;   // profundidad total (Z: -3 a +3)

  // Borde izquierdo y derecho (a lo largo de Z)
  [-4, 4].forEach((x) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(railT, railH, tableD),
      railMat,
    );
    rail.position.set(x, railH / 2, 0);
    rail.receiveShadow = true;
    rail.castShadow = true;
    scene.add(rail);
  });

  // Borde frontal y trasero (a lo largo de X)
  [-3, 3].forEach((z) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(tableW + railT * 2, railH, railT),
      railMat,
    );
    rail.position.set(0, railH / 2, z);
    rail.receiveShadow = true;
    rail.castShadow = true;
    scene.add(rail);
  });

  // Geometría compartida — se clona por dado para UVs independientes
  const baseGeo = new THREE.OctahedronGeometry(RADIUS);
  const faceNormals: THREE.Vector3[] = [];
  const posAttr = baseGeo.attributes.position;
  for (let f = 0; f < posAttr.count / 3; f++) {
    const base = f * 3;
    const vA = new THREE.Vector3().fromBufferAttribute(posAttr, base);
    const vB = new THREE.Vector3().fromBufferAttribute(posAttr, base + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(posAttr, base + 2);
    faceNormals.push(new THREE.Triangle(vA, vB, vC).getNormal(new THREE.Vector3()));
  }
  remapOctahedronUVs(baseGeo);
  baseGeo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.05 });

  const engine: DiceEngine = {
    renderer, scene, camera, world, faceNormals, material,
    geo: baseGeo, dice: [], rafId: 0, settleTimer: null,
    rolling: false, onResults, onRollingChange,
  };

  let lastTime = performance.now();
  const FIXED_STEP = 1 / 60;

  function loop(now: number) {
    engine.rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    world.step(FIXED_STEP, dt, 10);

    for (const d of engine.dice) {
      d.mesh.position.copy(d.body.position as unknown as THREE.Vector3);
      d.mesh.quaternion.copy(d.body.quaternion as unknown as THREE.Quaternion);
    }

    if (engine.rolling && engine.settleTimer === null) {
      const allSettled = engine.dice.every(d => {
        return d.body.velocity.length() < 0.05 && d.body.angularVelocity.length() < 0.05;
      });
      if (allSettled && engine.dice.length > 0) {
        engine.settleTimer = setTimeout(() => {
          const results = engine.dice.map(d =>
            getFaceResult(getTopFaceIndex(d.body.quaternion, engine.faceNormals))
          );
          engine.rolling = false;
          engine.onRollingChange(false);
          engine.onResults(results);
        }, 400);
      }
    }

    renderer.render(scene, camera);
  }

  engine.rafId = requestAnimationFrame(loop);
  return engine;
}

function destroyEngine(engine: DiceEngine, container: HTMLDivElement) {
  cancelAnimationFrame(engine.rafId);
  if (engine.settleTimer) clearTimeout(engine.settleTimer);
  engine.renderer.dispose();
  if (container.contains(engine.renderer.domElement)) {
    container.removeChild(engine.renderer.domElement);
  }
}

export default function MansionsDiceRoller() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiceEngine | null>(null);
  const [results, setResults] = useState<DiceResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numDice, setNumDice] = useState(1);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let cancelled = false;

    buildAtlasFromSymbols().then((texture) => {
      if (cancelled) { texture.dispose(); return; }
      if (engineRef.current) return;
      try {
        engineRef.current = createEngine(
          container,
          texture,
          (r) => setResults(r),
          (r) => setRolling(r),
        );
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    }).catch(() => setError('No se pudieron cargar los símbolos del dado'));

    return () => {
      cancelled = true;
      if (engineRef.current) {
        destroyEngine(engineRef.current, container);
        engineRef.current = null;
      }
      setReady(false);
    };
  }, []);

  function rollDice() {
    unlockAudio();
    const engine = engineRef.current;
    if (!engine || engine.rolling) return;

    // Limpiar dados anteriores
    for (const d of engine.dice) removeDicePair(d, engine.scene, engine.world);
    engine.dice = [];

    if (engine.settleTimer) { clearTimeout(engine.settleTimer); engine.settleTimer = null; }
    engine.rolling = true;
    setRolling(true);
    setResults([]);

    // Crear numDice dados y lanzarlos
    for (let i = 0; i < numDice; i++) {
      const pair = createDicePair(engine.scene, engine.world, engine.geo, engine.material);
      const x = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 2;
      pair.body.position.set(x, 4 + Math.random() * 2, z);
      pair.body.velocity.set((Math.random() - 0.5) * 8, -3, (Math.random() - 0.5) * 6);
      pair.body.angularVelocity.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
      );
      pair.body.wakeUp();
      engine.dice.push(pair);
    }
  }

  // Conteo de resultados
  const successCount = results.filter(r => r.type === 'success').length;
  const clueCount = results.filter(r => r.type === 'clue').length;
  const blankCount = results.filter(r => r.type === 'blank').length;

  return (
    <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center select-none">
      <h1 className="text-2xl font-bold text-[#c8a060] mb-2 tracking-widest uppercase">
        Mansiones de la Locura
      </h1>
      <p className="text-[#7a5030] text-sm mb-4 tracking-wide">Simulador de dados</p>

      <div
        ref={mountRef}
        className="w-full max-w-lg"
        style={{ height: '360px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3a1800' }}
      />

      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

      {/* Selector de número de dados */}
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            onClick={() => setNumDice(n)}
            className={`w-10 h-10 rounded-full font-bold text-sm transition-colors
              ${numDice === n
                ? 'bg-[#8b0000] text-white'
                : 'bg-[#2a1200] text-[#c8a060] hover:bg-[#3a1800]'
              }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Resultados */}
      <div className="mt-4 h-12 flex items-center justify-center gap-4">
        {results.length > 0 ? (
          <>
            {successCount > 0 && (
              <span className="text-2xl font-bold text-yellow-400">★ ×{successCount}</span>
            )}
            {clueCount > 0 && (
              <span className="text-2xl font-bold text-blue-400">🗝 ×{clueCount}</span>
            )}
            {blankCount > 0 && (
              <span className="text-2xl font-bold text-gray-400">— ×{blankCount}</span>
            )}
          </>
        ) : rolling ? (
          <span className="text-[#7a5030] text-lg">Lanzando...</span>
        ) : (
          <span className="text-[#4a3020] text-sm">Selecciona dados y lanza</span>
        )}
      </div>

      <button
        onClick={rollDice}
        disabled={rolling || !ready}
        className="mt-3 px-8 py-3 bg-[#8b0000] hover:bg-[#a00000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg tracking-wider uppercase transition-colors"
      >
        {rolling ? 'Lanzando...' : `Lanzar ${numDice} dado${numDice > 1 ? 's' : ''}`}
      </button>

      <p className="mt-4 text-[#3a2010] text-xs">
        Dado octaedro · 3 éxitos · 2 pistas · 3 vacíos
      </p>
    </div>
  );
}
