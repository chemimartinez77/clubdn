import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { unlockAudio, playDiceHit } from './diceAudio';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type DieType = 4 | 6 | 8 | 10 | 12 | 20;

interface DieSpec {
  id: number;
  type: DieType;
}

interface DieResult {
  id: number;
  type: DieType;
  value: number;
}

// ─── Colores por tipo ─────────────────────────────────────────────────────────

const DIE_COLORS: Record<DieType, string> = {
  4:  '#1a3a6b',
  6:  '#1a5c2a',
  8:  '#4a1a6b',
  10: '#8b3a20',
  12: '#2a5a6b',
  20: '#1a1a1a',
};

// Tipos que necesitan punto bajo el 6 y el 9 para distinguirlos
const NEEDS_UNDERLINE = new Set<DieType>([10, 12, 20]);

// ─── Generación de atlas de texturas ─────────────────────────────────────────

// Atlas especial para el D4: cada cara muestra 3 números en los vértices del triángulo,
// rotados para apuntar hacia el vértice. El número que falta es el resultado.
// Distribución: cara i tiene los 3 números del conjunto {1,2,3,4} \ {i+1}
function buildD4Atlas(color: string): THREE.CanvasTexture {
  // Cara 0 → falta 1 → muestra 2,3,4   (resultado cuando está abajo = 1)
  // Cara 1 → falta 2 → muestra 1,3,4
  // Cara 2 → falta 3 → muestra 1,2,4
  // Cara 3 → falta 4 → muestra 1,2,3
  const faceNumbers: [string, string, string][] = [
    ['2', '3', '4'],
    ['1', '3', '4'],
    ['1', '2', '4'],
    ['1', '2', '3'],
  ];

  const CELL = 256;
  const canvas = document.createElement('canvas');
  canvas.width = CELL * 2;
  canvas.height = CELL * 2;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = CELL * 0.22;

  for (let face = 0; face < 4; face++) {
    const col = face % 2;
    const row = Math.floor(face / 2);
    const ox = col * CELL;
    const oy = row * CELL;

    ctx.fillStyle = color;
    ctx.fillRect(ox, oy, CELL, CELL);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Triángulo equilátero inscrito en la celda, con vértice arriba
    // Vértice superior (V0), inferior-izquierdo (V1), inferior-derecho (V2)
    const margin = CELL * 0.18;
    const cx = ox + CELL / 2;
    const top    = oy + margin;
    const bottom = oy + CELL - margin;
    const left   = ox + margin;
    const right  = ox + CELL - margin;

    // Posiciones de los 3 números dentro de la celda, cerca de cada vértice
    const positions: Array<{ x: number; y: number; angle: number }> = [
      { x: cx,    y: top + fontSize * 0.6,   angle: 0 },              // vértice superior → número debajo, sin rotar
      { x: left + fontSize * 0.3,  y: bottom - fontSize * 0.3, angle:  2 * Math.PI / 3 },  // vértice inf-izq → rotado 120°
      { x: right - fontSize * 0.3, y: bottom - fontSize * 0.3, angle: -2 * Math.PI / 3 },  // vértice inf-der → rotado -120°
    ];

    const nums = faceNumbers[face];
    for (let v = 0; v < 3; v++) {
      const { x, y, angle } = positions[v];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(nums[v], 0, 0);
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Atlas para el D6: 6 celdas en un grid 3×2, número centrado en cada celda.
// Las UVs del D6 se asignan manualmente como quads en lugar de usar remapFaceUVs.
function buildD6Atlas(color: string): THREE.CanvasTexture {
  const CELL = 256;
  const COLS = 3;
  const ROWS = 2;
  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * ROWS;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = CELL * 0.5;
  for (let i = 0; i < 6; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = row * CELL;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL, CELL);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + CELL / 2, y + CELL / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Construye un cubo non-indexed con UVs explícitas correctas.
// faceOrder: qué número del dado lleva cada cara en orden [+X,-X,+Y,-Y,+Z,-Z].
// El atlas tiene celdas en orden 1..6 (celda i-1 = número i).
function buildD6Geometry(s: number, faceOrder: number[]): THREE.BufferGeometry {
  const h = s / 2;
  const COLS = 3;
  const ROWS = 2;
  const cW = 1 / COLS;
  const cH = 1 / ROWS;

  // Cada cara definida por 4 vértices: TL, TR, BL, BR (top-left, top-right, bottom-left, bottom-right)
  // visto desde FUERA de la cara (sistema dextrógiro Three.js: normal = CCW vista desde fuera).
  // tri0: TL, BL, TR  → normal = (BL-TL) × (TR-TL)  apunta hacia fuera ✓
  // tri1: TR, BL, BR  → normal = (BL-TR) × (BR-TR)  apunta hacia fuera ✓
  //
  // Para +X (normal apunta a +X), los vértices en el plano x=h vistos desde +X:
  //   TL=(-z arriba-izq visto desde +X) → (h, h, h)
  //   TR=( z arriba-der visto desde +X) → (h, h,-h)
  //   BL=(-z abajo-izq  visto desde +X) → (h,-h, h)
  //   BR=( z abajo-der  visto desde +X) → (h,-h,-h)
  const faceDefs: Array<{ verts: [number,number,number][], normal: [number,number,number] }> = [
    { normal: [ 1, 0, 0], verts: [[h, h, h],[h, h,-h],[h,-h, h],[h,-h,-h]] }, // +X
    { normal: [-1, 0, 0], verts: [[-h, h,-h],[-h, h, h],[-h,-h,-h],[-h,-h, h]] }, // -X
    { normal: [ 0, 1, 0], verts: [[-h, h,-h],[ h, h,-h],[-h, h, h],[ h, h, h]] }, // +Y
    { normal: [ 0,-1, 0], verts: [[-h,-h, h],[ h,-h, h],[-h,-h,-h],[ h,-h,-h]] }, // -Y
    { normal: [ 0, 0, 1], verts: [[-h, h, h],[ h, h, h],[-h,-h, h],[ h,-h, h]] }, // +Z
    { normal: [ 0, 0,-1], verts: [[ h, h,-h],[-h, h,-h],[ h,-h,-h],[-h,-h,-h]] }, // -Z
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let f = 0; f < 6; f++) {
    const { verts, normal } = faceDefs[f];
    const cellIdx = faceOrder[f] - 1;
    const col = cellIdx % COLS;
    const row = Math.floor(cellIdx / COLS);
    const u0 = col * cW;
    const u1 = u0 + cW;
    const v0 = 1 - (row + 1) * cH;
    const v1 = v0 + cH;

    // TL=0, TR=1, BL=2, BR=3
    // tri0: TL(0), BL(2), TR(1)  UVs: (u0,v1),(u0,v0),(u1,v1)
    // tri1: TR(1), BL(2), BR(3)  UVs: (u1,v1),(u0,v0),(u1,v0)
    const triVerts = [[0,2,1],[1,2,3]];
    const triUVs   = [[u0,v1, u0,v0, u1,v1],[u1,v1, u0,v0, u1,v0]];

    for (let t = 0; t < 2; t++) {
      for (let v = 0; v < 3; v++) {
        const vi = triVerts[t][v];
        positions.push(...verts[vi]);
        normals.push(...normal);
        uvs.push(triUVs[t][v*2], triUVs[t][v*2+1]);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

function buildNumberAtlas(
  faceLabels: string[],
  color: string,
  fontScale = 0.28,
  underlineLabels = new Set<string>(),
): THREE.CanvasTexture {
  const n = faceLabels.length;
  const CELL = 256;
  const COLS = Math.ceil(Math.sqrt(n));
  const ROWS = Math.ceil(n / COLS);

  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * ROWS;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < n; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = row * CELL;
    const label = faceLabels[i];

    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL, CELL);

    const fontSize = CELL * fontScale;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    ctx.fillText(label, cx, cy);

    if (underlineLabels.has(label)) {
      // Punto pequeño debajo del número
      const dotR = fontSize * 0.08;
      const dotY = cy + fontSize * 0.52;
      ctx.beginPath();
      ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ─── Construcción de geometrías y cuerpos físicos ─────────────────────────────

// Convierte una BufferGeometry de Three.js en un ConvexPolyhedron de Cannon-es
function threeGeoToCannon(geo: THREE.BufferGeometry): CANNON.ConvexPolyhedron {
  const pos = geo.attributes.position;
  const index = geo.index;

  // Vértices únicos
  const verts: CANNON.Vec3[] = [];
  const seen = new Map<string, number>();
  const remap: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = parseFloat(pos.getX(i).toFixed(6));
    const y = parseFloat(pos.getY(i).toFixed(6));
    const z = parseFloat(pos.getZ(i).toFixed(6));
    const key = `${x},${y},${z}`;
    if (!seen.has(key)) {
      seen.set(key, verts.length);
      verts.push(new CANNON.Vec3(x, y, z));
    }
    remap.push(seen.get(key)!);
  }

  // Caras
  const faces: number[][] = [];
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      faces.push([remap[index.getX(i)], remap[index.getX(i + 1)], remap[index.getX(i + 2)]]);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      faces.push([remap[i], remap[i + 1], remap[i + 2]]);
    }
  }

  return new CANNON.ConvexPolyhedron({ vertices: verts, faces });
}

// D10: bipirámide pentagonal (10 caras triangulares)
function buildD10Geometry(radius: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const r = radius;
  const h = r * 0.9;

  const top = new THREE.Vector3(0, h, 0);
  const bot = new THREE.Vector3(0, -h, 0);
  const equator: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    equator.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
  }

  const verts: number[] = [];
  const push = (v: THREE.Vector3) => verts.push(v.x, v.y, v.z);

  // 5 caras superiores + 5 inferiores
  for (let i = 0; i < 5; i++) {
    const a = equator[i];
    const b = equator[(i + 1) % 5];
    push(top); push(a); push(b);
  }
  for (let i = 0; i < 5; i++) {
    const a = equator[i];
    const b = equator[(i + 1) % 5];
    push(bot); push(b); push(a);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

// Remapea las UVs proyectando cada cara lógica a su celda del atlas.
// trisPerFace: cuántos triángulos forman una cara lógica (1 para la mayoría, 2 para el D6).
// Para caras con múltiples triángulos, todos los triángulos apuntan al centro de la misma celda.
function remapFaceUVs(geo: THREE.BufferGeometry, cols: number, rows: number, trisPerFace = 1): void {
  const pos = geo.attributes.position;
  const totalTris = pos.count / 3;
  const uvs: number[] = [];

  const cW = 1 / cols;
  const cH = 1 / rows;

  for (let tri = 0; tri < totalTris; tri++) {
    const logicalFace = Math.floor(tri / trisPerFace);
    const col = logicalFace % cols;
    const row = Math.floor(logicalFace / cols);
    const cellCU = col * cW + cW / 2;
    const cellCV = 1 - (row + 1) * cH + cH / 2;

    const base = tri * 3;
    const vA = new THREE.Vector3().fromBufferAttribute(pos, base);
    const vB = new THREE.Vector3().fromBufferAttribute(pos, base + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(pos, base + 2);

    const edge1 = new THREE.Vector3().subVectors(vB, vA).normalize();
    const normal = new THREE.Triangle(vA, vB, vC).getNormal(new THREE.Vector3());
    const edge2 = new THREE.Vector3().crossVectors(normal, edge1).normalize();

    const pts = [vA, vB, vC].map(v => {
      const d = new THREE.Vector3().subVectors(v, vA);
      return new THREE.Vector2(d.dot(edge1), d.dot(edge2));
    });

    const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
    const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
    const maxR = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.y - cy)));
    const targetR = Math.min(cW, cH) * 0.35;
    const scale = maxR > 0 ? targetR / maxR : 1;

    for (const p of pts) {
      uvs.push(cellCU + (p.x - cx) * scale, cellCV + (p.y - cy) * scale);
    }
  }

  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

// Calcula las normales de cada cara triangular de una non-indexed geometry
function computeFaceNormals(geo: THREE.BufferGeometry): THREE.Vector3[] {
  const pos = geo.attributes.position;
  const normals: THREE.Vector3[] = [];
  for (let f = 0; f < pos.count / 3; f++) {
    const base = f * 3;
    const vA = new THREE.Vector3().fromBufferAttribute(pos, base);
    const vB = new THREE.Vector3().fromBufferAttribute(pos, base + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(pos, base + 2);
    normals.push(new THREE.Triangle(vA, vB, vC).getNormal(new THREE.Vector3()));
  }
  return normals;
}

// trisPerFace: cuántos triángulos forman una cara lógica (ej. 2 para D6, 3 para D12).
// Devuelve el índice de cara LÓGICA, no de triángulo.
function getTopFaceIndex(quaternion: CANNON.Quaternion, faceNormals: THREE.Vector3[], trisPerFace = 1): number {
  const q = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  const up = new THREE.Vector3(0, 1, 0);
  let bestFace = 0;
  let bestDot = -Infinity;
  faceNormals.forEach((normal, i) => {
    const dot = normal.clone().applyQuaternion(q).dot(up);
    if (dot > bestDot) { bestDot = dot; bestFace = i; }
  });
  return Math.floor(bestFace / trisPerFace);
}

// El D4 cae sobre una cara (base plana). El resultado es la cara inferior,
// cuya normal apunta más hacia abajo.
function getBottomFaceIndex(quaternion: CANNON.Quaternion, faceNormals: THREE.Vector3[]): number {
  const q = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  const down = new THREE.Vector3(0, -1, 0);
  let bestFace = 0;
  let bestDot = -Infinity;
  faceNormals.forEach((normal, i) => {
    const dot = normal.clone().applyQuaternion(q).dot(down);
    if (dot > bestDot) { bestDot = dot; bestFace = i; }
  });
  return bestFace;
}

// ─── Motor 3D ─────────────────────────────────────────────────────────────────

interface DieObject {
  id: number;
  type: DieType;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  faceNormals: THREE.Vector3[];
  faceValues: number[];
  trisPerFace: number;
}

interface Engine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: CANNON.World;
  dice: DieObject[];
  rafId: number;
  settleTimer: ReturnType<typeof setTimeout> | null;
  rolling: boolean;
  onResults: (r: DieResult[]) => void;
  onRollingChange: (r: boolean) => void;
}

const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });

const COLLISION_COOLDOWN_MS = 80;
const COLLISION_VELOCITY_THRESHOLD = 0.5;

function makeDieGeometry(type: DieType): { geo: THREE.BufferGeometry; faceValues: number[]; trisPerFace: number } {
  let geo: THREE.BufferGeometry;
  let faceValues: number[];
  let trisPerFace = 1;

  switch (type) {
    case 4: {
      geo = new THREE.TetrahedronGeometry(0.7).toNonIndexed();
      faceValues = [1, 2, 3, 4];
      break;
    }
    case 6: {
      // Caras opuestas suman 7: 1↔6, 2↔5, 3↔4
      // Orden de faceDefs en buildD6Geometry: +X,-X,+Y,-Y,+Z,-Z
      faceValues = [1, 6, 2, 5, 3, 4];
      geo = buildD6Geometry(1.1, faceValues);
      trisPerFace = 2;
      return { geo, faceValues, trisPerFace };
    }
    case 8: {
      geo = new THREE.OctahedronGeometry(0.7).toNonIndexed();
      faceValues = [1, 2, 3, 4, 5, 6, 7, 8];
      break;
    }
    case 10: {
      geo = buildD10Geometry(0.75);
      faceValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      break;
    }
    case 12: {
      geo = new THREE.DodecahedronGeometry(0.78).toNonIndexed();
      faceValues = Array.from({ length: 12 }, (_, i) => i + 1);
      // DodecahedronGeometry: cada cara pentagonal = 3 triángulos
      trisPerFace = 3;
      break;
    }
    case 20: {
      geo = new THREE.IcosahedronGeometry(0.7).toNonIndexed();
      faceValues = Array.from({ length: 20 }, (_, i) => i + 1);
      break;
    }
  }

  const logicalFaces = faceValues.length;
  const cols = Math.ceil(Math.sqrt(logicalFaces));
  const rows = Math.ceil(logicalFaces / cols);
  remapFaceUVs(geo, cols, rows, trisPerFace);
  geo.computeVertexNormals();

  return { geo, faceValues, trisPerFace };
}

function addDieToEngine(
  engine: Engine,
  spec: DieSpec,
  textures: Map<DieType, THREE.CanvasTexture>,
): DieObject {
  const { geo, faceValues, trisPerFace } = makeDieGeometry(spec.type);
  const faceNormals = computeFaceNormals(geo);
  const texture = textures.get(spec.type)!;

  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  engine.scene.add(mesh);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMat);
  mesh.add(edges);

  const cannonShape = threeGeoToCannon(geo);
  const cannonMat = new CANNON.Material({ friction: 0.3, restitution: 0.65 });
  const body = new CANNON.Body({ mass: 1, material: cannonMat });
  body.addShape(cannonShape);
  body.linearDamping = 0.1;
  body.angularDamping = 0.1;
  engine.world.addBody(body);

  let lastHit = 0;
  body.addEventListener('collide', (e: { contact: CANNON.ContactEquation }) => {
    const impact = e.contact.getImpactVelocityAlongNormal();
    if (Math.abs(impact) < COLLISION_VELOCITY_THRESHOLD) return;
    const now = performance.now();
    if (now - lastHit < COLLISION_COOLDOWN_MS) return;
    lastHit = now;
    playDiceHit(Math.min(1, Math.abs(impact) / 10));
  });

  const die: DieObject = { id: spec.id, type: spec.type, mesh, body, faceNormals, faceValues, trisPerFace };
  engine.dice.push(die);
  return die;
}

function launchDie(body: CANNON.Body, index: number, total: number) {
  const spread = Math.min(3.5, total * 0.4);
  const x = (index / Math.max(total - 1, 1) - 0.5) * spread * 2 + (Math.random() - 0.5) * 1.5;
  const z = (Math.random() - 0.5) * 2;
  body.position.set(x, 4 + Math.random() * 2, z);
  body.velocity.set((Math.random() - 0.5) * 8, -3, (Math.random() - 0.5) * 6);
  body.angularVelocity.set(
    (Math.random() - 0.5) * 30,
    (Math.random() - 0.5) * 30,
    (Math.random() - 0.5) * 30,
  );
  body.wakeUp();
}

function removeDie(die: DieObject, engine: Engine) {
  engine.scene.remove(die.mesh);
  engine.world.removeBody(die.body);
  engine.dice = engine.dice.filter(d => d.id !== die.id);
}

function createEngine(
  container: HTMLDivElement,
  onResults: (r: DieResult[]) => void,
  onRollingChange: (r: boolean) => void,
): Engine {
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
  const pt = new THREE.PointLight(0xff8800, 0.7, 20);
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

  const wallDefs: Array<[number, number, number, number, number, number]> = [
    [-4, 1, 0,  0,  Math.PI / 2, 0],
    [ 4, 1, 0,  0, -Math.PI / 2, 0],
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

  const railMat = new THREE.MeshStandardMaterial({ color: '#3b1a08', roughness: 0.8, metalness: 0.1 });
  const railH = 1.2;
  const railT = 0.25;
  const tableW = 8;
  const tableD = 6;
  [-4, 4].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railT, railH, tableD), railMat);
    rail.position.set(x, railH / 2, 0);
    rail.castShadow = true; rail.receiveShadow = true;
    scene.add(rail);
  });
  [-3, 3].forEach((z) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(tableW + railT * 2, railH, railT), railMat);
    rail.position.set(0, railH / 2, z);
    rail.castShadow = true; rail.receiveShadow = true;
    scene.add(rail);
  });

  const engine: Engine = {
    renderer, scene, camera, world,
    dice: [], rafId: 0, settleTimer: null,
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

    if (engine.rolling && engine.settleTimer === null && engine.dice.length > 0) {
      const allSettled = engine.dice.every(d =>
        d.body.velocity.length() < 0.05 && d.body.angularVelocity.length() < 0.05
      );
      if (allSettled) {
        engine.settleTimer = setTimeout(() => {
          const results: DieResult[] = engine.dice.map(d => {
            const faceIdx = d.type === 4
              ? getBottomFaceIndex(d.body.quaternion, d.faceNormals)
              : getTopFaceIndex(d.body.quaternion, d.faceNormals, d.trisPerFace);
            return { id: d.id, type: d.type, value: d.faceValues[faceIdx] };
          });
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

function destroyEngine(engine: Engine, container: HTMLDivElement) {
  cancelAnimationFrame(engine.rafId);
  if (engine.settleTimer) clearTimeout(engine.settleTimer);
  engine.renderer.dispose();
  if (container.contains(engine.renderer.domElement)) {
    container.removeChild(engine.renderer.domElement);
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20];
const MAX_DICE = 12;

export default function CustomDiceRoller() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const texturesRef = useRef<Map<DieType, THREE.CanvasTexture>>(new Map());
  const nextIdRef = useRef(0);

  const [dice, setDice] = useState<DieSpec[]>([]);
  const [results, setResults] = useState<DieResult[]>([]);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Pre-generar texturas para todos los tipos
    for (const type of DIE_TYPES) {
      if (type === 4) {
        texturesRef.current.set(4, buildD4Atlas(DIE_COLORS[4]));
      } else if (type === 6) {
        texturesRef.current.set(6, buildD6Atlas(DIE_COLORS[6]));
      } else {
        const labels = Array.from({ length: type }, (_, i) => String(i + 1));
        const underline = NEEDS_UNDERLINE.has(type) ? new Set(['6', '9']) : new Set<string>();
        const fontScale = type >= 10 ? 0.22 : 0.28;
        texturesRef.current.set(type, buildNumberAtlas(labels, DIE_COLORS[type], fontScale, underline));
      }
    }

    engineRef.current = createEngine(
      container,
      (r) => setResults(r),
      (r) => setRolling(r),
    );

    return () => {
      if (engineRef.current) {
        destroyEngine(engineRef.current, container);
        engineRef.current = null;
      }
      texturesRef.current.forEach(t => t.dispose());
      texturesRef.current.clear();
    };
  }, []);

  const addDie = useCallback((type: DieType) => {
    if (!engineRef.current) return;
    if (dice.length >= MAX_DICE) return;
    const id = nextIdRef.current++;
    const spec: DieSpec = { id, type };
    setDice(prev => [...prev, spec]);
    // Añadir a la escena en posición de reposo (sin lanzar)
    const die = addDieToEngine(engineRef.current, spec, texturesRef.current);
    // Ponerlo en la mesa sin velocidad
    die.body.position.set((Math.random() - 0.5) * 5, 1.5, (Math.random() - 0.5) * 3);
    die.body.velocity.set(0, 0, 0);
    die.body.angularVelocity.set(0, 0, 0);
    die.body.wakeUp();
  }, [dice.length]);

  const rollAll = useCallback(() => {
    unlockAudio();
    const engine = engineRef.current;
    if (!engine || engine.rolling || engine.dice.length === 0) return;

    if (engine.settleTimer) { clearTimeout(engine.settleTimer); engine.settleTimer = null; }
    engine.rolling = true;
    setRolling(true);
    setResults([]);

    engine.dice.forEach((die, i) => launchDie(die.body, i, engine.dice.length));
  }, []);

  const reset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.settleTimer) { clearTimeout(engine.settleTimer); engine.settleTimer = null; }
    engine.rolling = false;
    // Eliminar todos los dados de la escena
    [...engine.dice].forEach(d => removeDie(d, engine));
    setDice([]);
    setResults([]);
    setRolling(false);
  }, []);

  const total = results.reduce((s, r) => s + r.value, 0);

  // Agrupar resultados por tipo para mostrarlos
  const resultsByType = DIE_TYPES.map(type => ({
    type,
    values: results.filter(r => r.type === type).map(r => r.value),
  })).filter(g => g.values.length > 0);

  return (
    <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center select-none">
      <h1 className="text-2xl font-bold text-[#c8a060] mb-2 tracking-widest uppercase">
        Tiradados
      </h1>
      <p className="text-[#7a5030] text-sm mb-4 tracking-wide">Añade dados y lanza</p>

      {/* Botones de añadir dado */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {DIE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => addDie(type)}
            disabled={dice.length >= MAX_DICE || rolling}
            style={{ backgroundColor: DIE_COLORS[type] }}
            className="px-3 py-2 rounded font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-125 transition-all"
          >
            +D{type}
          </button>
        ))}
      </div>

      {/* Canvas 3D */}
      <div
        ref={mountRef}
        className="w-full max-w-lg"
        style={{ height: '360px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3a1800' }}
      />

      {/* Panel de resultados */}
      <div className="mt-4 min-h-12 flex flex-col items-center gap-1">
        {results.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-3 justify-center">
              {resultsByType.map(({ type, values }) => (
                <span key={type} className="text-lg font-bold text-[#c8a060]">
                  D{type}: {values.join(', ')}
                </span>
              ))}
            </div>
            <span className="text-white font-bold text-xl">Total: {total}</span>
          </>
        ) : rolling ? (
          <span className="text-[#7a5030] text-lg">Lanzando...</span>
        ) : dice.length === 0 ? (
          <span className="text-[#4a3020] text-sm">Añade dados con los botones de arriba</span>
        ) : (
          <span className="text-[#4a3020] text-sm">{dice.length} dado{dice.length > 1 ? 's' : ''} en mesa · pulsa Lanzar</span>
        )}
      </div>

      {/* Botonera */}
      <div className="mt-3 flex gap-3">
        <button
          onClick={rollAll}
          disabled={rolling || dice.length === 0}
          className="px-8 py-3 bg-[#8b0000] hover:bg-[#a00000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg tracking-wider uppercase transition-colors"
        >
          {rolling ? 'Lanzando...' : 'Lanzar'}
        </button>
        <button
          onClick={reset}
          disabled={rolling}
          className="px-5 py-3 bg-[#2a1200] hover:bg-[#3a1800] disabled:opacity-40 disabled:cursor-not-allowed text-[#c8a060] font-bold rounded-lg tracking-wider uppercase transition-colors"
        >
          Reset
        </button>
      </div>

      <p className="mt-4 text-[#3a2010] text-xs">
        Máximo {MAX_DICE} dados · D4 D6 D8 D10 D20
      </p>
    </div>
  );
}
