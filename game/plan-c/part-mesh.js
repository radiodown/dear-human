// Plan C preparation only. Nothing imports this from the current sample app.
// A relative import works with the existing Python server after npm ci here.
import * as THREE from './node_modules/three/build/three.module.js';
import { partDimensions } from '../animation/proportions.js';

export { THREE };

export function createAtlasGeometry(definition, key, { height, pivot = [.5, 0] } = {}) {
  const part = definition.parts[key];
  if (!part) throw new Error(`Unknown atlas part: ${key}`);
  const atlas = definition.atlases[part.atlas || 'character'];
  const [x, y, w, h] = part.rect;
  if (!atlas || ![height, w, h].every(n => Number.isFinite(n) && n > 0)
      || x < 0 || y < 0 || x + w > atlas.width || y + h > atlas.height) {
    throw new Error(`Invalid atlas rectangle or height: ${key}`);
  }
  const { width } = partDimensions(part.rect, height);
  const left = -pivot[0] * width, top = -pivot[1] * height;
  // Keep the rig's +Y-down coordinate convention. UVs use Three's +V-up convention.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    left, top, 0, left + width, top, 0,
    left, top + height, 0, left + width, top + height, 0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    x / atlas.width, 1 - y / atlas.height,
    (x + w) / atlas.width, 1 - y / atlas.height,
    x / atlas.width, 1 - (y + h) / atlas.height,
    (x + w) / atlas.width, 1 - (y + h) / atlas.height,
  ], 2));
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function configureAtlasTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  return texture;
}

export function createAtlasPart(definition, key, texture, options) {
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  });
  material.forceSinglePass = true;
  const mesh = new THREE.Mesh(createAtlasGeometry(definition, key, options), material);
  mesh.name = key;
  return mesh;
}

export function createPixelCamera(width, height) {
  const camera = new THREE.OrthographicCamera(0, width, 0, height, .1, 100);
  camera.position.z = 10;
  camera.updateMatrixWorld();
  return camera;
}
