// Generates public/models/sample-building.glb — a simple building made of boxes,
// authored in metres so the detected scale assumption (1 unit = 1 m) is correct.
// Run with: npm run generate-model
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'models');
const outFile = path.join(outDir, 'sample-building.glb');

// Box anchored at its base: (cx, baseY, cz), size (w, h, d).
function makeBox(cx, baseY, cz, w, h, d) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const y0 = baseY, y1 = baseY + h;
  const z0 = cz - d / 2, z1 = cz + d / 2;
  const faces = [
    { n: [0, 0, 1], c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], c: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
    { n: [1, 0, 0], c: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { n: [-1, 0, 0], c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { n: [0, 1, 0], c: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    { n: [0, -1, 0], c: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
  ];
  const positions = [], normals = [], indices = [];
  for (const f of faces) {
    const base = positions.length / 3;
    for (const corner of f.c) {
      positions.push(...corner);
      normals.push(...f.n);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

function mergeBoxes(boxes) {
  const positions = [], normals = [], indices = [];
  for (const b of boxes) {
    const offset = positions.length / 3;
    positions.push(...b.positions);
    normals.push(...b.normals);
    indices.push(...b.indices.map((i) => i + offset));
  }
  return { positions, normals, indices };
}

// Building parts grouped by material (all dimensions in metres).
const groups = [
  {
    name: 'GroundSlab',
    color: [0.16, 0.2, 0.26, 1],
    boxes: [makeBox(0, -0.3, 0, 30, 0.3, 22)],
  },
  {
    name: 'MainBuilding',
    color: [0.55, 0.62, 0.72, 1],
    boxes: [
      makeBox(0, 0, 0, 18, 8, 12),      // main block
      makeBox(-10.5, 0, 3, 3, 11, 4),   // stair tower
    ],
  },
  {
    name: 'PlantRooms',
    color: [0.35, 0.42, 0.52, 1],
    boxes: [
      makeBox(12.5, 0, -2.5, 7, 4, 6),  // plant room annex
      makeBox(3, 8, 0, 4, 2, 3),        // rooftop plant unit
    ],
  },
  {
    name: 'EntranceCanopy',
    color: [0.3, 0.65, 0.45, 1],
    boxes: [makeBox(0, 3, 7.5, 6, 0.4, 3)],
  },
];

const accessors = [];
const bufferViews = [];
const primitives = [];
const materials = [];
const binParts = [];
let byteOffset = 0;

function pushBufferView(buf, target) {
  const pad = (4 - (buf.length % 4)) % 4;
  const padded = pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
  bufferViews.push({ buffer: 0, byteOffset, byteLength: buf.length, target });
  binParts.push(padded);
  byteOffset += padded.length;
  return bufferViews.length - 1;
}

for (const group of groups) {
  const merged = mergeBoxes(group.boxes);
  const pos = new Float32Array(merged.positions);
  const nor = new Float32Array(merged.normals);
  const idx = new Uint16Array(merged.indices);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a]);
      max[a] = Math.max(max[a], pos[i + a]);
    }
  }

  const posBV = pushBufferView(Buffer.from(pos.buffer), 34962);
  const norBV = pushBufferView(Buffer.from(nor.buffer), 34962);
  const idxBV = pushBufferView(Buffer.from(idx.buffer), 34963);

  const posAcc = accessors.push({
    bufferView: posBV, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max,
  }) - 1;
  const norAcc = accessors.push({
    bufferView: norBV, componentType: 5126, count: nor.length / 3, type: 'VEC3',
  }) - 1;
  const idxAcc = accessors.push({
    bufferView: idxBV, componentType: 5123, count: idx.length, type: 'SCALAR',
  }) - 1;

  const material = materials.push({
    name: group.name,
    pbrMetallicRoughness: {
      baseColorFactor: group.color,
      metallicFactor: 0.05,
      roughnessFactor: 0.9,
    },
  }) - 1;

  primitives.push({
    attributes: { POSITION: posAcc, NORMAL: norAcc },
    indices: idxAcc,
    material,
  });
}

const bin = Buffer.concat(binParts);
const gltf = {
  asset: { version: '2.0', generator: 'TwinRisk AI sample model generator' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'SampleBuilding' }],
  meshes: [{ name: 'SampleBuilding', primitives }],
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};

const jsonBuf = Buffer.from(JSON.stringify(gltf));
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN'

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]));
console.log(`Wrote ${outFile} (${12 + 8 + jsonChunk.length + 8 + bin.length} bytes)`);
