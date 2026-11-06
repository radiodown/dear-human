// BVH·glTF·GLB 파일을 리타겟 공통 형식(MotionClip, cm·Y-up·표준 관절 이름)으로 읽는다.
import { parseBVH, bakePositions } from './bvh.js';
import { parseGLB, bakeGltfMotion, listAnimations, toCentimeters } from './gltf-motion.js';
import { normalizeSkeleton } from './skeleton.js';

export const MOTION_EXTENSIONS = ['.bvh', '.glb', '.gltf'];
const ext = (name) => (/\.[^.]+$/.exec(name.toLowerCase()) || [''])[0];

/** BVH 텍스트 → MotionClip. BVH 단위는 파일 그대로(cm 가정)이며 다리 길이로 m 단위를 보정한다. */
export function motionFromBVH(text) {
  const clip = parseBVH(text);
  const baked = { joints: clip.joints.map(({ name, parent, offset, end }) => ({ name, parent, offset, end })), frameCount: clip.frameCount, frameTime: clip.frameTime, positions: bakePositions(clip), source: { kind: 'bvh' } };
  return toCentimeters(normalizeSkeleton(baked));
}

/** glTF JSON(+GLB BIN) → MotionClip */
export async function motionFromGltf(gltf, options = {}) {
  const baked = await bakeGltfMotion(gltf, options);
  return toCentimeters(normalizeSkeleton(baked));
}

/**
 * 선택한 파일 묶음을 읽는다. files: [{ name, data: ArrayBuffer }]
 * .gltf의 외부 .bin은 같은 묶음에서 이름으로 찾는다. 반환: { clip, kind, name, animations, gltf }
 */
export async function motionFromFiles(files, { animation = 0, fps = 60 } = {}) {
  const primary = files.find((f) => MOTION_EXTENSIONS.includes(ext(f.name)));
  if (!primary) throw new Error('BVH·GLB·glTF 파일을 선택해 주세요.');
  const kind = ext(primary.name).slice(1);
  if (kind === 'bvh') return { clip: motionFromBVH(new TextDecoder().decode(primary.data)), kind, name: primary.name, animations: [] };
  const gltf = kind === 'glb' ? parseGLB(primary.data) : { json: JSON.parse(new TextDecoder().decode(primary.data)), bin: null };
  const byName = new Map(files.map((f) => [f.name.split(/[\\/]/).pop(), f.data]));
  const resolveUri = (uri) => byName.get(uri.split(/[\\/]/).pop()) || null;
  const clip = await motionFromGltf(gltf, { animation, fps, resolveUri });
  return { clip, kind, name: primary.name, animations: listAnimations(gltf.json), gltf, resolveUri };
}
