// Loads .ifc files into a three.js Group using the web-ifc WASM parser.
// Geometry only for the MVP — BIM metadata (spaces, storeys, properties)
// can be extracted later through the same API.
import * as THREE from 'three';
import * as WebIFC from 'web-ifc';

let apiPromise = null;

function getApi() {
  if (!apiPromise) {
    apiPromise = (async () => {
      const api = new WebIFC.IfcAPI();
      api.SetWasmPath('/wasm/', true); // served from public/wasm (see scripts/copy-ifc-wasm.mjs)
      await api.Init();
      return api;
    })();
  }
  return apiPromise;
}

function buildMesh(api, modelID, placedGeometry) {
  const geometry = api.GetGeometry(modelID, placedGeometry.geometryExpressID);
  const verts = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
  const indices = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
  geometry.delete();
  if (!indices.length) return null;

  // web-ifc vertex data is interleaved: x,y,z,nx,ny,nz
  const buffer = new THREE.BufferGeometry();
  const interleaved = new THREE.InterleavedBuffer(new Float32Array(verts), 6);
  buffer.setAttribute('position', new THREE.InterleavedBufferAttribute(interleaved, 3, 0));
  buffer.setAttribute('normal', new THREE.InterleavedBufferAttribute(interleaved, 3, 3));
  buffer.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

  const { x, y, z, w } = placedGeometry.color;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(x, y, z),
    transparent: w < 1,
    opacity: w,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(buffer, material);
  mesh.matrix.fromArray(placedGeometry.flatTransformation);
  mesh.matrixAutoUpdate = false;
  return mesh;
}

export async function loadIfcModel(arrayBuffer) {
  const api = await getApi();
  const modelID = api.OpenModel(new Uint8Array(arrayBuffer));
  const group = new THREE.Group();
  group.name = 'IFCModel';
  try {
    api.StreamAllMeshes(modelID, (flatMesh) => {
      const placed = flatMesh.geometries;
      for (let i = 0; i < placed.size(); i++) {
        const mesh = buildMesh(api, modelID, placed.get(i));
        if (mesh) group.add(mesh);
      }
    });
  } finally {
    api.CloseModel(modelID);
  }
  if (group.children.length === 0) {
    throw new Error('No 3D geometry found in this IFC file.');
  }
  group.rotation.x = -Math.PI / 2; // IFC is Z-up, three.js is Y-up
  group.updateMatrixWorld(true);
  return group;
}
